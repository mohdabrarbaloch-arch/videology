import { exec } from "child_process";
import { promisify } from "util";
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const execAsync = promisify(exec);
const requireLocal = createRequire(import.meta.url);

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const AUDIO_DIR = path.join(UPLOADS_DIR, "audio");
const THUMBNAIL_DIR = path.join(process.cwd(), "public", "thumbnails");

// yt-dlp: prefer the local executable bundled with the project, else system-wide
const YT_DLP = (() => {
  const local = path.join(process.cwd(), "yt-dlp.exe");
  const base = fs.existsSync(local) ? `"${local}"` : process.env.YT_DLP_PATH || "yt-dlp";
  return `${base} --js-runtimes node`;
})();

// ffmpeg: prefer the npm-installed binary, else system-wide
const FFMPEG = (() => {
  try {
    const installer = requireLocal("@ffmpeg-installer/ffmpeg");
    if (installer.path && fs.existsSync(installer.path)) return `"${installer.path}"`;
  } catch {
    // fall through
  }
  return process.env.FFMPEG_PATH || "ffmpeg";
})();

// ffmpeg directory (for yt-dlp --ffmpeg-location)
const FFMPEG_DIR = (() => {
  const p = FFMPEG.replace(/^"|"$/g, "");
  const dir = path.dirname(p);
  return dir !== "." ? `--ffmpeg-location "${dir}"` : "";
})();

// Chunked parallel downloads defeat YouTube's per-connection throttling (~5-10x faster)
const YT_SPEED =
  "--http-chunk-size 10M --concurrent-fragments 8 --no-playlist --no-warnings --retries 3 --socket-timeout 30";

function ensureDirs() {
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  if (!fs.existsSync(AUDIO_DIR)) fs.mkdirSync(AUDIO_DIR, { recursive: true });
  if (!fs.existsSync(THUMBNAIL_DIR)) fs.mkdirSync(THUMBNAIL_DIR, { recursive: true });
}

export async function generateThumbnail(videoPath: string, id: string): Promise<string | null> {
  ensureDirs();
  const thumbPath = path.join(THUMBNAIL_DIR, `${id}.jpg`);
  try {
    await run(
      `${FFMPEG} -i "${videoPath}" -ss 00:00:02 -frames:v 1 -q:v 2 "${thumbPath}" -y`,
      30000
    );
    return `/thumbnails/${id}.jpg`;
  } catch {
    try {
      await run(
        `${FFMPEG} -i "${videoPath}" -ss 00:00:00 -frames:v 1 -q:v 2 "${thumbPath}" -y`,
        30000
      );
      return `/thumbnails/${id}.jpg`;
    } catch {
      return null;
    }
  }
}

export interface VideoInfo {
  title: string;
  duration: number;
  thumbnail: string;
}

async function run(command: string, timeout: number): Promise<void> {
  try {
    await execAsync(command, { timeout });
  } catch (error: unknown) {
    const err = error as { stderr?: string; message?: string };
    const stderr = err?.stderr || err?.message || String(error);
    // Clean up partial files on failure
    const fileMatch = command.match(/-o "([^"]+)"/);
    if (fileMatch && fs.existsSync(fileMatch[1])) {
      try {
        fs.unlinkSync(fileMatch[1]);
      } catch {
        // ignore
      }
    }
    throw new Error(stderr);
  }
}

export async function getYoutubeInfo(url: string): Promise<VideoInfo> {
  const { stdout } = await execAsync(
    `${YT_DLP} --dump-json --no-download --no-playlist --no-warnings --socket-timeout 15 "${url}"`,
    { timeout: 30000 }
  );
  const info = JSON.parse(stdout);
  return {
    title: info.title || "Untitled",
    duration: info.duration || 0,
    thumbnail: info.thumbnail || "",
  };
}

export async function downloadYoutubeVideo(url: string): Promise<{ filePath: string; audioPath: string; title: string; thumbnail: string; duration: number }> {
  ensureDirs();
  const id = uuidv4();
  const audioPath = path.join(AUDIO_DIR, `${id}.m4a`);

  let info: VideoInfo;
  try {
    info = await getYoutubeInfo(url);
  } catch {
    info = { title: "Untitled Video", duration: 0, thumbnail: "" };
  }

  // For YouTube we only need the audio for transcription - skip downloading the video file
  const videoPath = "";

  // Download audio directly as m4a (no conversion needed, Whisper supports it)
  try {
    await run(
      `${YT_DLP} ${YT_SPEED} ${FFMPEG_DIR} -f "bestaudio[ext=m4a]/bestaudio" --extract-audio --audio-format m4a --audio-quality 5 -o "${audioPath}" "${url}"`,
      300000
    );
  } catch {
    // Last resort: download best audio stream without conversion
    await run(
      `${YT_DLP} ${YT_SPEED} -f bestaudio -o "${audioPath}" "${url}"`,
      300000
    );
  }

  return { filePath: videoPath, audioPath, title: info.title, thumbnail: info.thumbnail, duration: info.duration };
}

export async function processUploadedFile(file: File): Promise<{ filePath: string; audioPath: string; title: string; thumbnail: string | null }> {
  ensureDirs();
  const id = uuidv4();
  const ext = path.extname(file.name) || ".mp4";
  const videoPath = path.join(UPLOADS_DIR, `${id}${ext}`);
  const audioPath = path.join(AUDIO_DIR, `${id}.mp3`);

  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(videoPath, buffer);

  try {
    await run(
      `${FFMPEG} -i "${videoPath}" -vn -acodec libmp3lame -q:a 5 "${audioPath}" -y`,
      300000
    );
  } catch {
    fs.copyFileSync(videoPath, audioPath);
  }

  const thumbnail = await generateThumbnail(videoPath, id);

  return { filePath: videoPath, audioPath, title: file.name.replace(/\.[^/.]+$/, ""), thumbnail };
}

export async function downloadDirectUrl(url: string): Promise<{ filePath: string; audioPath: string; title: string; thumbnail: string | null }> {
  ensureDirs();
  const id = uuidv4();
  const audioPath = path.join(AUDIO_DIR, `${id}.mp3`);

  const { stdout: headers } = await execAsync(
    `curl -sI "${url}"`,
    { timeout: 15000 }
  );

  const contentType = headers.toLowerCase();
  let ext = ".mp4";
  if (contentType.includes("webm")) ext = ".webm";
  else if (contentType.includes("quicktime")) ext = ".mov";

  const finalVideoPath = path.join(UPLOADS_DIR, `${id}${ext}`);
  await run(`curl -L -o "${finalVideoPath}" "${url}"`, 300000);

  try {
    await run(
      `${FFMPEG} -i "${finalVideoPath}" -vn -acodec libmp3lame -q:a 5 "${audioPath}" -y`,
      300000
    );
  } catch {
    fs.copyFileSync(finalVideoPath, audioPath);
  }

  const thumbnail = await generateThumbnail(finalVideoPath, id);

  const urlParts = url.split("/");
  const title = decodeURIComponent(urlParts[urlParts.length - 1].split("?")[0]) || "Downloaded Video";

  return { filePath: finalVideoPath, audioPath, title, thumbnail };
}
