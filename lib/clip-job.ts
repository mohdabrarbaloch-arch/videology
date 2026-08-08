import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { db } from "./db";
import { transcribeAudio } from "./transcriber";
import { generateThumbnailConcepts } from "./ai";
import {
  CAPTION_STYLES,
  buildAssKaraoke,
  cleanup,
  downloadVideoFromUrl,
  extractAudio,
  generateAiClipThumbnail,
  getMediaDuration,
  pickClips,
  renderClip,
} from "./clips";
import { WORK_DIR, ensureDataDirs } from "./paths";
import { putObject, getLocalTemp } from "./storage";

export interface ClipJobParams {
  inputKey?: string;
  url?: string;
  title?: string;
  count: number;
  duration: number;
  aspect: "9:16" | "1:1" | "16:9";
  style: string;
}

export interface GeneratedClip {
  id: string;
  title: string;
  aiTitle: string;
  start: number;
  end: number;
  duration: number;
  url: string;
  thumbnail: string;
}

async function setProgress(jobId: string, message: string): Promise<void> {
  await db.clipJob
    .update({
      where: { id: jobId },
      data: { progress: message, status: "processing" },
    })
    .catch(() => undefined);
}

export async function processClipJob(jobId: string): Promise<void> {
  const job = await db.clipJob.findUnique({ where: { id: jobId } });
  if (!job) return;

  const params = (job.params ?? {}) as unknown as ClipJobParams;
  const tmpFiles: string[] = [];

  try {
    ensureDataDirs();

    await setProgress(jobId, "Preparing video...");

    let inputVideo: string;
    if (params.inputKey) {
      await setProgress(jobId, "Downloading video...");
      inputVideo = await getLocalTemp(params.inputKey);
      tmpFiles.push(inputVideo);
    } else if (params.url) {
      await setProgress(jobId, "Downloading video from YouTube...");
      inputVideo = await downloadVideoFromUrl(params.url);
      tmpFiles.push(inputVideo);
    } else {
      throw new Error("No video input provided.");
    }

    const total = await getMediaDuration(inputVideo);
    if (total <= 0) throw new Error("Could not read the video duration.");

    await setProgress(jobId, "Extracting audio...");
    const audioPath = await extractAudio(inputVideo);
    tmpFiles.push(audioPath);

    await setProgress(jobId, "Transcribing audio...");
    const transcription = await transcribeAudio(audioPath, async (done, totalChunks) => {
      if (totalChunks > 1) {
        await setProgress(jobId, `Transcribing chunk ${done}/${totalChunks}...`);
      }
    });
    const segments = (transcription.segments || []).filter((s) => s.end > s.start);

    const style =
      CAPTION_STYLES.find((s) => s.id === params.style) ?? CAPTION_STYLES[0];

    await setProgress(jobId, "Finding the best moments...");
    const plans = await pickClips(
      segments,
      params.title || "YouTube video",
      params.count,
      params.duration,
      total
    );

    const userId = job.userId;
    const clips: GeneratedClip[] = [];

    for (let i = 0; i < plans.length; i++) {
      const plan = plans[i];
      const clipId = uuidv4();

      const localClip = path.join(WORK_DIR, `clip_${clipId}.mp4`);
      const localThumb = path.join(WORK_DIR, `thumb_${clipId}.jpg`);
      const localAss = path.join(WORK_DIR, `clip_${clipId}.ass`);
      tmpFiles.push(localClip, localThumb, localAss);

      const assContent = buildAssKaraoke(segments, plan.start, plan.end, style, params.aspect);
      fs.writeFileSync(localAss, assContent, "utf8");

      await setProgress(jobId, `Rendering clip ${i + 1}/${plans.length} with captions...`);
      await renderClip(inputVideo, plan, localAss, localClip, params.aspect);

      const clipText = segments
        .filter((s) => s.start < plan.end && s.end > plan.start)
        .map((s) => s.text)
        .join(" ")
        .trim()
        .slice(0, 2000);
      let aiTitle = plan.title;
      let aiSubtitle = "";
      try {
        const concepts = await generateThumbnailConcepts(clipText || plan.title, plan.title);
        if (concepts[0]?.title) aiTitle = concepts[0].title;
        if (concepts[0]?.subtitle) aiSubtitle = concepts[0].subtitle;
      } catch {
        // keep plan title
      }

      await setProgress(jobId, `Creating thumbnail for clip ${i + 1}...`);
      try {
        await generateAiClipThumbnail(localClip, localThumb, aiTitle, aiSubtitle, params.aspect, i);
      } catch {
        // keep plain frame thumbnail
      }

      const videoKey = `clips/${userId}/${clipId}.mp4`;
      const thumbKey = `clips/${userId}/${clipId}.jpg`;
      const storedVideo = await putObject(
        videoKey,
        fs.readFileSync(localClip),
        "video/mp4"
      );
      const storedThumb = await putObject(
        thumbKey,
        fs.readFileSync(localThumb),
        "image/jpeg"
      );

      clips.push({
        id: clipId,
        title: plan.title,
        aiTitle,
        start: plan.start,
        end: plan.end,
        duration: Math.round((plan.end - plan.start) * 10) / 10,
        url: storedVideo.url,
        thumbnail: storedThumb.url,
      });
    }

    await db.clipJob.update({
      where: { id: jobId },
      data: { status: "done", progress: "Done", result: JSON.parse(JSON.stringify({ clips })) },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Clip generation failed.";
    console.error("Clip job error:", error);
    await db.clipJob
      .update({
        where: { id: jobId },
        data: { status: "error", progress: null, error: message.slice(0, 500) },
      })
      .catch(() => undefined);
  } finally {
    cleanup(tmpFiles);
  }
}
