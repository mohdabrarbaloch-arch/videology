import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { getSession } from "@/lib/auth";
import { transcribeAudio } from "@/lib/transcriber";
import { generateThumbnailConcepts } from "@/lib/ai";
import {
  CLIPS_DIR,
  CAPTION_STYLES,
  buildAssKaraoke,
  cleanup,
  downloadVideoFromUrl,
  extractAudio,
  generateAiClipThumbnail,
  getMediaDuration,
  pickClips,
  renderClip,
  saveUploadedVideo,
} from "@/lib/clips";

export const runtime = "nodejs";
export const maxDuration = 300;

const encoder = new TextEncoder();

function sse(data: unknown): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        try {
          controller.enqueue(sse(data));
        } catch {
          // client disconnected
        }
      };

      const tmpFiles: string[] = [];
      let inputVideo: string | null = null;

      try {
        const form = await request.formData();
        const count = Math.min(3, Math.max(1, parseInt(String(form.get("count") || "1"), 10)));
        const duration = Math.min(60, Math.max(10, parseInt(String(form.get("duration") || "30"), 10)));
        const aspect = String(form.get("aspect") || "9:16") as "9:16" | "1:1" | "16:9";
        const styleId = String(form.get("style") || "viral");
        const style = CAPTION_STYLES.find((s) => s.id === styleId) ?? CAPTION_STYLES[0];

        const file = form.get("file");
        const url = String(form.get("url") || "").trim();
        const title = file instanceof File ? file.name.replace(/\.[^/.]+$/, "") : "YouTube video";

        if (file instanceof File) {
          send({ type: "status", message: "Uploading video..." });
          inputVideo = await saveUploadedVideo(file);
        } else if (url) {
          send({ type: "status", message: "Downloading video..." });
          inputVideo = await downloadVideoFromUrl(url);
        } else {
          send({ type: "error", message: "Provide a video file or a YouTube URL." });
          controller.close();
          return;
        }
        tmpFiles.push(inputVideo);

        const total = await getMediaDuration(inputVideo);
        if (total <= 0) throw new Error("Could not read the video duration.");

        send({ type: "status", message: "Extracting audio..." });
        const audioPath = await extractAudio(inputVideo);
        tmpFiles.push(audioPath);

        send({ type: "status", message: "Transcribing audio..." });
        const transcription = await transcribeAudio(audioPath, (done, totalChunks) => {
          if (totalChunks > 1) {
            send({ type: "status", message: `Transcribing chunk ${done}/${totalChunks}...` });
          }
        });
        const segments = (transcription.segments || []).filter((s) => s.end > s.start);

        send({ type: "status", message: "Finding the best moments..." });
        const plans = await pickClips(segments, title, count, duration, total);

        const userId = session.userId;
        const userDir = path.join(CLIPS_DIR, userId);
        fs.mkdirSync(userDir, { recursive: true });

        const clips = [];
        for (let i = 0; i < plans.length; i++) {
          const plan = plans[i];
          const clipId = uuidv4();
          const outPath = path.join(userDir, `${clipId}.mp4`);
          const thumbPath = path.join(userDir, `${clipId}.jpg`);
          const assPath = path.join(userDir, `${clipId}.ass`);

          const assContent = buildAssKaraoke(segments, plan.start, plan.end, style, aspect);
          fs.writeFileSync(assPath, assContent, "utf8");
          tmpFiles.push(assPath);

          send({
            type: "status",
            message: `Rendering clip ${i + 1}/${plans.length} with captions...`,
          });
          await renderClip(inputVideo, plan, assPath, outPath, aspect);

          // AI thumbnail: designed gradient card with the concept title + subtitle
          const clipText = segments
            .filter((s) => s.start < plan.end && s.end > plan.start)
            .map((s) => s.text)
            .join(" ")
            .trim()
            .slice(0, 2000);
          let aiTitle = plan.title;
          let aiSubtitle = "";
          try {
            const concepts = await generateThumbnailConcepts(
              clipText || plan.title,
              plan.title
            );
            if (concepts[0]?.title) aiTitle = concepts[0].title;
            if (concepts[0]?.subtitle) aiSubtitle = concepts[0].subtitle;
          } catch {
            // keep plan title
          }
          try {
            await generateAiClipThumbnail(outPath, thumbPath, aiTitle, aiSubtitle, aspect, i);
          } catch {
            // keep plain frame thumbnail
          }

          clips.push({
            id: clipId,
            title: plan.title,
            aiTitle,
            start: plan.start,
            end: plan.end,
            duration: Math.round((plan.end - plan.start) * 10) / 10,
            url: `/clips/${userId}/${clipId}.mp4`,
            thumbnail: `/clips/${userId}/${clipId}.jpg`,
          });
        }

        cleanup(tmpFiles);

        send({ type: "clips", clips });
        controller.close();
      } catch (error: unknown) {
        cleanup(tmpFiles);
        const message = error instanceof Error ? error.message : "Clip generation failed.";
        console.error("Clip generation error:", error);
        send({ type: "error", message: message.slice(0, 500) });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
