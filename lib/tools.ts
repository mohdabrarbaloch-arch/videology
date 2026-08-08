import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { ZipArchive } from "archiver";
import { FFMPEG, FFMPEG_DIR, YT_DLP, YT_SPEED } from "./binaries";
import { TOOLS_DIR } from "./paths";

const execAsync = promisify(exec);

function ensureDir() {
  if (!fs.existsSync(TOOLS_DIR)) fs.mkdirSync(TOOLS_DIR, { recursive: true });
}

async function run(command: string, timeout: number): Promise<void> {
  try {
    await execAsync(command, { timeout });
  } catch (error: unknown) {
    const err = error as { stderr?: string; stdout?: string; message?: string };
    const detail = err?.stderr || err?.stdout || err?.message || String(error);
    throw new Error(detail.slice(0, 2000));
  }
}

export interface MediaInfo {
  width: number;
  height: number;
  duration: number;
}

export async function probe(filePath: string): Promise<string> {
  try {
    const res = await execAsync(`${FFMPEG} -i "${filePath}" 2>&1`, { timeout: 30000 });
    return res.stdout;
  } catch (error: unknown) {
    const err = error as { stdout?: string; stderr?: string; message?: string };
    return err?.stdout || err?.stderr || err?.message || "";
  }
}

export async function getMediaInfo(filePath: string): Promise<MediaInfo> {
  const text = await probe(filePath);
  const m = parseInfo(text);
  if (m) return m;
  return { width: 0, height: 0, duration: 0 };
}

function parseInfo(text: string): MediaInfo | null {
  const size = text.match(/(\d{2,5})x(\d{2,5})/);
  const dur = text.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
  return {
    width: size ? parseInt(size[1]) : 0,
    height: size ? parseInt(size[2]) : 0,
    duration: dur
      ? parseInt(dur[1]) * 3600 + parseInt(dur[2]) * 60 + parseFloat(dur[3])
      : 0,
  };
}

export interface ProcessResult {
  outputPath: string;
  outputName: string;
  mimeType: string;
}

function baseName(inputPath: string | null, fallback: string): string {
  if (!inputPath) return fallback;
  const base = path.basename(inputPath, path.extname(inputPath));
  return base.replace(/[^a-z0-9\-_. ]/gi, "").trim() || fallback;
}

async function zipFiles(
  files: { filePath: string; name: string }[],
  outZip: string
): Promise<void> {
  const archive = new ZipArchive({ zlib: { level: 9 } });
  const output = fs.createWriteStream(outZip);
  await new Promise<void>((resolve, reject) => {
    output.on("close", resolve);
    output.on("error", reject);
    archive.on("error", reject);
    archive.pipe(output);
    for (const f of files) archive.file(f.filePath, { name: f.name });
    archive.finalize();
  });
}

export async function processTool(
  slug: string,
  inputPath: string | null,
  options: Record<string, string>
): Promise<ProcessResult> {
  ensureDir();
  const outId = uuidv4();
  const srcName = baseName(inputPath, "output");

  switch (slug) {
    case "video-cutter": {
      const start = Math.max(0, parseFloat(options.start) || 0);
      const duration = Math.max(0.1, parseFloat(options.duration) || 10);
      const out = path.join(TOOLS_DIR, `${outId}_cut.mp4`);
      await run(
        `${FFMPEG} -y -ss ${start} -i "${inputPath}" -t ${duration} -c:v libx264 -preset fast -crf 20 -c:a aac -b:a 160k "${out}"`,
        600000
      );
      return { outputPath: out, outputName: `${srcName}_cut.mp4`, mimeType: "video/mp4" };
    }

    case "video-crop": {
      const info = await getMediaInfo(inputPath!);
      const width = Math.max(1, info.width);
      const height = Math.max(1, info.height);
      const wPct = (parseFloat(options.width) || 80) / 100;
      const hPct = (parseFloat(options.height) || 80) / 100;
      const xPct = (parseFloat(options.x) || 10) / 100;
      const yPct = (parseFloat(options.y) || 10) / 100;
      const cropW = Math.round(width * wPct);
      const cropH = Math.round(height * hPct);
      const x = Math.min(Math.round(width * xPct), width - cropW);
      const y = Math.min(Math.round(height * yPct), height - cropH);
      const out = path.join(TOOLS_DIR, `${outId}_crop.mp4`);
      await run(
        `${FFMPEG} -y -i "${inputPath}" -vf "crop=${cropW}:${cropH}:${x}:${y}" -c:v libx264 -preset fast -crf 20 -c:a aac -b:a 160k "${out}"`,
        600000
      );
      return { outputPath: out, outputName: `${srcName}_crop.mp4`, mimeType: "video/mp4" };
    }

    case "video-compressor": {
      const crf = parseInt(options.crf) || 28;
      const res = options.resolution || "Keep";
      const scale = res !== "Keep" ? `-vf "scale=-2:${res}"` : "";
      const out = path.join(TOOLS_DIR, `${outId}_compressed.mp4`);
      await run(
        `${FFMPEG} -y -i "${inputPath}" ${scale} -c:v libx264 -preset fast -crf ${crf} -c:a aac -b:a 128k -movflags +faststart "${out}"`,
        600000
      );
      return { outputPath: out, outputName: `${srcName}_compressed.mp4`, mimeType: "video/mp4" };
    }

    case "mp3-converter": {
      const bitrate = options.bitrate || "192";
      const out = path.join(TOOLS_DIR, `${outId}.mp3`);
      await run(
        `${FFMPEG} -y -i "${inputPath}" -vn -acodec libmp3lame -b:a ${bitrate}k "${out}"`,
        600000
      );
      return { outputPath: out, outputName: `${srcName}.mp3`, mimeType: "audio/mpeg" };
    }

    case "audio-balancer": {
      const lufs = options.loudness || "-16";
      const out = path.join(TOOLS_DIR, `${outId}_balanced.mp3`);
      await run(
        `${FFMPEG} -y -i "${inputPath}" -af "loudnorm=I=${lufs}:LRA=11:TP=-1.5" -ar 44100 -c:a libmp3lame -q:a 2 "${out}"`,
        600000
      );
      return { outputPath: out, outputName: `${srcName}_balanced.mp3`, mimeType: "audio/mpeg" };
    }

    case "youtube-downloader": {
      const url = (options.url || "").trim();
      if (!url) throw new Error("A YouTube URL is required.");
      const format = options.format || "video";
      const quality = options.quality || "720";
      const outStub = path.join(TOOLS_DIR, `${outId}.%(ext)s`);
      if (format === "audio") {
        await run(
          `${YT_DLP} ${YT_SPEED} ${FFMPEG_DIR} -f bestaudio --extract-audio --audio-format mp3 --audio-quality 5 -o "${outStub}" "${url}"`,
          600000
        );
        const written = fs.readdirSync(TOOLS_DIR).find((f) => f.startsWith(outId));
        if (!written) throw new Error("Download failed — no output produced.");
        const out = path.join(TOOLS_DIR, written);
        return { outputPath: out, outputName: `${srcName}_download.mp3`, mimeType: "audio/mpeg" };
      }

      await run(
        `${YT_DLP} ${YT_SPEED} ${FFMPEG_DIR} -f "best[height<=${quality}]/bestvideo[vcodec^=avc1][height<=${quality}]+bestaudio/best[height<=${quality}]" -o "${outStub}" "${url}"`,
        900000
      );

      const written = fs.readdirSync(TOOLS_DIR).filter(
        (f) => f.startsWith(outId) && !f.startsWith(`${outId}_merged`)
      );
      if (written.length === 0) throw new Error("Download failed — no output produced.");

      if (written.length === 1) {
        const single = path.join(TOOLS_DIR, written[0]);
        const ext = path.extname(written[0]).toLowerCase();
        if (ext === ".mp4") {
          const text = await probe(single);
          if (text.includes("Audio: aac") || text.includes("Audio: mp4a")) {
            return { outputPath: single, outputName: `${srcName}_download.mp4`, mimeType: "video/mp4" };
          }
        }
        const out = path.join(TOOLS_DIR, `${outId}_final.mp4`);
        await run(
          `${FFMPEG} -y -i "${single}" -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 160k "${out}"`,
          600000
        );
        try {
          fs.unlinkSync(single);
        } catch {
          // ignore
        }
        return { outputPath: out, outputName: `${srcName}_download.mp4`, mimeType: "video/mp4" };
      }

      let videoStream: string | null = null;
      let audioStream: string | null = null;
      for (const f of written) {
        const p = path.join(TOOLS_DIR, f);
        const text = await probe(p);
        if (text.includes("Video:")) videoStream = p;
        else if (text.includes("Audio:")) audioStream = p;
      }
      if (!videoStream || !audioStream) {
        throw new Error("Download failed — could not merge streams.");
      }
      const merged = path.join(TOOLS_DIR, `${outId}_merged.mp4`);
      await run(
        `${FFMPEG} -y -i "${videoStream}" -i "${audioStream}" -c:v copy -c:a aac -b:a 160k "${merged}"`,
        600000
      );
      for (const p of [videoStream, audioStream]) {
        try {
          fs.unlinkSync(p);
        } catch {
          // ignore
        }
      }
      return { outputPath: merged, outputName: `${srcName}_download.mp4`, mimeType: "video/mp4" };
    }

    case "thumbnail-generator": {
      const count = Math.min(6, Math.max(1, parseInt(options.count) || 4));
      const width = Math.max(240, parseInt(options.width) || 640);
      const info = await getMediaInfo(inputPath!);
      const duration = Math.max(info.duration, 0.5);
      const frames: { filePath: string; name: string }[] = [];
      try {
        for (let i = 0; i < count; i++) {
          const t = Math.min(((i + 0.5) / count) * duration, Math.max(duration - 0.1, 0));
          const frame = path.join(TOOLS_DIR, `${outId}_${i + 1}.jpg`);
          await run(
            `${FFMPEG} -y -ss ${t.toFixed(3)} -i "${inputPath}" -frames:v 1 -vf "scale=${width}:-2" -q:v 3 "${frame}"`,
            120000
          );
          frames.push({ filePath: frame, name: `${srcName}_thumbnail_${i + 1}.jpg` });
        }
        const outZip = path.join(TOOLS_DIR, `${outId}.zip`);
        await zipFiles(frames, outZip);
        return { outputPath: outZip, outputName: `${srcName}_thumbnails.zip`, mimeType: "application/zip" };
      } finally {
        for (const f of frames) {
          try {
            fs.unlinkSync(f.filePath);
          } catch {
            // ignore
          }
        }
      }
    }

    case "subtitle-remover": {
      const info = await getMediaInfo(inputPath!);
      const height = Math.max(1, info.height);
      const areaPct = (parseFloat(options.area) || 15) / 100;
      const boxH = Math.round(height * areaPct);
      const y = options.position === "top" ? 0 : Math.max(0, height - boxH);
      const out = path.join(TOOLS_DIR, `${outId}_clean.mp4`);
      await run(
        `${FFMPEG} -y -i "${inputPath}" -vf "drawbox=x=0:y=${y}:w=iw:h=${boxH}:color=black@0.92:t=fill" -c:v libx264 -preset fast -crf 20 -c:a aac -b:a 160k "${out}"`,
        600000
      );
      return { outputPath: out, outputName: `${srcName}_clean.mp4`, mimeType: "video/mp4" };
    }

    case "speech-enhancer": {
      const chains: Record<string, string> = {
        mild: "highpass=f=60,lowpass=f=9500,afftdn=nr=10:tn=1:nf=-40,dynaudnorm=f=200:g=15",
        normal: "highpass=f=70,lowpass=f=8500,afftdn=nr=14:tn=1:nf=-35,dynaudnorm=f=200:g=15",
        strong:
          "highpass=f=80,lowpass=f=8000,afftdn=nr=18:tn=1:nf=-30,agate=threshold=0.02:attack=15:release=300,dynaudnorm=f=200:g=15,alimiter=limit=0.95",
      };
      const strength = (options.strength || "normal") as "mild" | "normal" | "strong";
      const out = path.join(TOOLS_DIR, `${outId}_enhanced.mp3`);
      await run(
        `${FFMPEG} -y -i "${inputPath}" -af "${chains[strength]}" -c:a libmp3lame -q:a 2 "${out}"`,
        600000
      );
      return { outputPath: out, outputName: `${srcName}_enhanced.mp3`, mimeType: "audio/mpeg" };
    }

    case "voice-changer": {
      const presets: Record<string, number> = {
        chipmunk: 12,
        baby: 7,
        normal: 0,
        deep: -5,
        demon: -12,
      };
      const preset = String(options.preset || "none");
      const semitones =
        presets[preset] ??
        Math.max(-12, Math.min(12, parseFloat(options.semitones) || 0));
      const factor = Math.pow(2, semitones / 12);
      const rate = Math.max(8000, Math.min(96000, Math.round(44100 * factor)));
      const tempo = 1 / factor;
      const out = path.join(TOOLS_DIR, `${outId}_voice.mp3`);
      await run(
        `${FFMPEG} -y -i "${inputPath}" -af "asetrate=${rate},aresample=44100,atempo=${tempo.toFixed(4)},alimiter=limit=0.95" -c:a libmp3lame -q:a 2 "${out}"`,
        600000
      );
      return { outputPath: out, outputName: `${srcName}_voice.mp3`, mimeType: "audio/mpeg" };
    }

    default:
      throw new Error("Unknown tool.");
  }
}
