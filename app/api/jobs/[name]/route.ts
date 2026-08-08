import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { processClipJob } from "@/lib/clip-job";
import { processVideoJob } from "@/lib/video-job";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const payload = await request.json().catch(() => null) as {
    jobId?: string;
    videoId?: string;
  } | null;

  if (name === "clip-job") {
    if (!payload?.jobId) {
      return NextResponse.json({ error: "jobId is required" }, { status: 400 });
    }
    const jobId = payload.jobId;
    after(async () => {
      await processClipJob(jobId);
    });
    return NextResponse.json({ ok: true });
  }

  if (name === "video-job") {
    if (!payload?.videoId) {
      return NextResponse.json({ error: "videoId is required" }, { status: 400 });
    }
    const videoId = payload.videoId;
    after(async () => {
      await processVideoJob(videoId);
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown job" }, { status: 400 });
}
