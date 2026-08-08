import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { transcribeAudio } from "@/lib/transcriber";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const video = await db.video.findFirst({
    where: { id, userId: session.userId },
  });

  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  if (!video.audioPath) {
    return NextResponse.json({ error: "No audio file available" }, { status: 400 });
  }

  const existingTranscript = await db.transcript.findUnique({ where: { videoId: id } });
  if (existingTranscript && !existingTranscript.text.startsWith("Transcription failed")) {
    return NextResponse.json({ transcript: existingTranscript });
  }
  if (existingTranscript) {
    await db.transcript.delete({ where: { videoId: id } });
  }

  try {
    await db.video.update({ where: { id }, data: { status: "transcribing" } });

    const result = await transcribeAudio(video.audioPath);

    const failed = result.text.startsWith("Transcription failed");

    const transcript = await db.transcript.create({
      data: {
        videoId: id,
        language: result.language,
        text: result.text,
        segments: JSON.stringify(result.segments),
      },
    });

    await db.video.update({
      where: { id },
      data: { status: failed ? "error" : "transcribed" },
    });

    return NextResponse.json({ transcript, failed });
  } catch (error) {
    console.error("Transcription error:", error);
    await db.video.update({ where: { id }, data: { status: "error" } });
    return NextResponse.json({ error: "Transcription failed" }, { status: 500 });
  }
}
