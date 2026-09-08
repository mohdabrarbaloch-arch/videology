import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateThumbnailConcepts } from "@/lib/ai";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const video = await db.video.findFirst({
    where: { id },
    include: { transcript: true },
  });

  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  if (!video.transcript) {
    return NextResponse.json({ error: "Transcribe the video first" }, { status: 400 });
  }

  try {
    const concepts = await generateThumbnailConcepts(
      video.transcript.text,
      video.title || "Untitled"
    );
    return NextResponse.json({ concepts });
  } catch (error) {
    console.error("Thumbnail concept generation error:", error);
    return NextResponse.json({ error: "Thumbnail generation failed" }, { status: 500 });
  }
}
