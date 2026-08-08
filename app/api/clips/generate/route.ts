import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { putObject, IS_CLOUD } from "@/lib/storage";
import { processClipJob } from "@/lib/clip-job";
import { triggerBackgroundFunction } from "@/lib/background";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const contentType = request.headers.get("content-type") || "";

    let params: {
      inputKey?: string;
      url?: string;
      title?: string;
      count: number;
      duration: number;
      aspect: "9:16" | "1:1" | "16:9";
      style: string;
    };

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const count = Math.min(3, Math.max(1, parseInt(String(form.get("count") || "1"), 10)));
      const duration = Math.min(60, Math.max(10, parseInt(String(form.get("duration") || "30"), 10)));
      const aspect = String(form.get("aspect") || "9:16") as "9:16" | "1:1" | "16:9";
      const style = String(form.get("style") || "viral");

      const file = form.get("file");
      const url = String(form.get("url") || "").trim();
      const inputKey = String(form.get("inputKey") || "").trim();

      if (inputKey) {
        params = {
          inputKey,
          title: String(form.get("title") || "Video"),
          count,
          duration,
          aspect,
          style,
        };
      } else if (file instanceof File) {
        // Dev mode: persist the uploaded file to storage (local disk) and
        // reference it by key from the background pipeline.
        const id = uuidv4();
        const ext = path.extname(file.name) || ".mp4";
        const key = `uploads/${session.userId}/${id}${ext}`;
        await putObject(key, Buffer.from(await file.arrayBuffer()), file.type || "video/mp4");
        params = {
          inputKey: key,
          title: file.name.replace(/\.[^/.]+$/, ""),
          count,
          duration,
          aspect,
          style,
        };
      } else if (url) {
        params = { url, title: "YouTube video", count, duration, aspect, style };
      } else {
        return NextResponse.json(
          { error: "Provide a video file, an uploaded key, or a YouTube URL." },
          { status: 400 }
        );
      }
    } else {
      const body = await request.json();
      const count = Math.min(3, Math.max(1, parseInt(String(body.count || "1"), 10)));
      const duration = Math.min(60, Math.max(10, parseInt(String(body.duration || "30"), 10)));
      const aspect = String(body.aspect || "9:16") as "9:16" | "1:1" | "16:9";
      const style = String(body.style || "viral");
      const inputKey = String(body.inputKey || "").trim();
      const url = String(body.url || "").trim();
      const title = String(body.title || "").trim() || "Video";

      if (!inputKey && !url) {
        return NextResponse.json(
          { error: "Provide a video file, an uploaded key, or a YouTube URL." },
          { status: 400 }
        );
      }
      params = { inputKey: inputKey || undefined, url: url || undefined, title, count, duration, aspect, style };
    }

    const job = await db.clipJob.create({
      data: {
        userId: session.userId,
        status: "queued",
        progress: "Queued...",
        params: params as object,
      },
    });

    if (IS_CLOUD) {
      // Trigger the Netlify background function (returns 202 immediately).
      await triggerBackgroundFunction("clip-job", { jobId: job.id });
    } else {
      // Local dev: run the pipeline in-process (fire-and-forget).
      void processClipJob(job.id);
    }

    return NextResponse.json({ jobId: job.id });
  } catch (error) {
    console.error("Clip generation error:", error);
    return NextResponse.json(
      { error: "Failed to start clip generation." },
      { status: 500 }
    );
  }
}
