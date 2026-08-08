import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { analyzeVideo } from "@/lib/ai";

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
    include: { transcript: true },
  });

  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  if (!video.transcript) {
    return NextResponse.json({ error: "Transcribe the video first" }, { status: 400 });
  }

  const existingAnalysis = await db.analysis.findUnique({ where: { videoId: id } });
  if (existingAnalysis) {
    return NextResponse.json({ analysis: existingAnalysis });
  }

  try {
    await db.video.update({ where: { id }, data: { status: "analyzing" } });

    const result = await analyzeVideo(video.transcript.text, video.title || "Untitled");

    const analysis = await db.analysis.create({
      data: {
        videoId: id,
        summary: result.summary,
        keyPoints: JSON.stringify(result.keyPoints),
        topics: JSON.stringify(result.topics),
        chapters: JSON.stringify(result.chapters),
        importantMoments: JSON.stringify(result.importantMoments),
        learningInsights: JSON.stringify(result.learningInsights),
      },
    });

    await db.video.update({ where: { id }, data: { status: "analyzed" } });

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("Analysis error:", error);
    await db.video.update({ where: { id }, data: { status: "error" } });
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
