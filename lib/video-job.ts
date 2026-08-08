import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { db } from "./db";
import { downloadYoutubeVideo, downloadDirectUrl } from "./video-processor";
import { FFMPEG } from "./binaries";
import { AUDIO_DIR, THUMBNAIL_DIR } from "./paths";
import { putObject, getLocalTemp } from "./storage";

const execAsync = promisify(exec);

async function makeThumbnail(videoPath: string, outPath: string): Promise<void> {
  const run = (ss: string) =>
    execAsync(`${FFMPEG} -i "${videoPath}" -ss ${ss} -frames:v 1 -q:v 2 "${outPath}" -y`, {
      timeout: 30000,
    });
  try {
    await run("00:00:02");
  } catch {
    await run("00:00:00").catch(() => undefined);
  }
}

export async function processVideoJob(videoId: string): Promise<void> {
  const video = await db.video.findUnique({ where: { id: videoId } });
  if (!video) return;

  try {
    await db.video.update({ where: { id: videoId }, data: { status: "processing" } });

    if (video.source === "youtube" || video.source === "url") {
      const url = video.originalUrl || "";
      const result =
        video.source === "youtube"
          ? await downloadYoutubeVideo(url)
          : await downloadDirectUrl(url);

      // Upload extracted audio to storage.
      const audioKey = `audio/${video.userId}/${video.id}.m4a`;
      if (fs.existsSync(result.audioPath)) {
        await putObject(audioKey, fs.readFileSync(result.audioPath), "audio/mp4");
        try {
          fs.unlinkSync(result.audioPath);
        } catch {
          // ignore
        }
      }

      // Upload the locally generated thumbnail to storage.
      let thumbnailUrl = result.thumbnail || null;
      if (thumbnailUrl && thumbnailUrl.startsWith("/thumbnails/")) {
        const local = path.join(THUMBNAIL_DIR, path.basename(thumbnailUrl));
        if (fs.existsSync(local)) {
          const stored = await putObject(
            `thumbnails/${video.id}.jpg`,
            fs.readFileSync(local),
            "image/jpeg"
          );
          thumbnailUrl = stored.url;
          try {
            fs.unlinkSync(local);
          } catch {
            // ignore
          }
        } else {
          thumbnailUrl = null;
        }
      }

      await db.video.update({
        where: { id: videoId },
        data: {
          title: result.title,
          filePath: null,
          audioPath: audioKey,
          thumbnailUrl: thumbnailUrl || video.thumbnailUrl,
          duration: "duration" in result ? (result.duration as number) : video.duration,
          status: "uploaded",
        },
      });
      return;
    }

    // Uploaded video: download from storage, extract audio + thumbnail.
    const inputKey = video.filePath || "";
    const input = await getLocalTemp(inputKey);

    const audioPath = path.join(AUDIO_DIR, `${video.id}.m4a`);
    try {
      await execAsync(`${FFMPEG} -y -i "${input}" -vn -c:a copy "${audioPath}"`, {
        timeout: 120000,
      });
    } catch {
      await execAsync(`${FFMPEG} -y -i "${input}" -vn -acodec aac -b:a 128k "${audioPath}"`, {
        timeout: 120000,
      });
    }

    const audioKey = `audio/${video.userId}/${video.id}.m4a`;
    if (fs.existsSync(audioPath)) {
      await putObject(audioKey, fs.readFileSync(audioPath), "audio/mp4");
    }

    let thumbnailUrl: string | null = null;
    const localThumb = path.join(THUMBNAIL_DIR, `${video.id}.jpg`);
    try {
      await makeThumbnail(input, localThumb);
      if (fs.existsSync(localThumb)) {
        const stored = await putObject(
          `thumbnails/${video.id}.jpg`,
          fs.readFileSync(localThumb),
          "image/jpeg"
        );
        thumbnailUrl = stored.url;
      }
    } catch {
      // ignore
    }

    try {
      fs.unlinkSync(audioPath);
    } catch {
      // ignore
    }
    try {
      fs.unlinkSync(localThumb);
    } catch {
      // ignore
    }
    try {
      fs.unlinkSync(input);
    } catch {
      // ignore
    }

    await db.video.update({
      where: { id: videoId },
      data: { audioPath: audioKey, thumbnailUrl, status: "uploaded" },
    });
  } catch (error) {
    console.error("Video job error:", error);
    await db.video
      .update({ where: { id: videoId }, data: { status: "error" } })
      .catch(() => undefined);
  }
}
