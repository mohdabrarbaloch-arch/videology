import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { THUMBNAIL_DIR } from "@/lib/paths";
import fs from "fs";
import path from "path";

export async function GET(
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
    include: {
      transcript: true,
      analysis: true,
      chatMessages: { orderBy: { createdAt: "asc" } },
      quizzes: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  return NextResponse.json({ video });
}

export async function DELETE(
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

  // Delete files
  if (video.filePath && fs.existsSync(video.filePath)) {
    fs.unlinkSync(video.filePath);
  }
  if (video.audioPath && fs.existsSync(video.audioPath)) {
    fs.unlinkSync(video.audioPath);
  }
  if (video.thumbnailUrl && video.thumbnailUrl.startsWith("/thumbnails/")) {
    const thumbPath = path.join(THUMBNAIL_DIR, path.basename(video.thumbnailUrl));
    if (fs.existsSync(thumbPath)) {
      fs.unlinkSync(thumbPath);
    }
  }

  await db.video.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
