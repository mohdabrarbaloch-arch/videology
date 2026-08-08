import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { generateQuiz } from "@/lib/ai";

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

  try {
    const quizData = await generateQuiz(video.transcript.text, video.title || "Untitled");

    const quiz = await db.quiz.create({
      data: {
        videoId: id,
        title: quizData.title,
        questions: JSON.stringify(quizData.questions),
      },
    });

    return NextResponse.json({ quiz });
  } catch (error) {
    console.error("Quiz generation error:", error);
    return NextResponse.json({ error: "Quiz generation failed" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { quizId, score } = await request.json();

  if (!quizId || score === undefined) {
    return NextResponse.json({ error: "QuizId and score are required" }, { status: 400 });
  }

  const quiz = await db.quiz.findFirst({
    where: { id: quizId, videoId: id },
  });

  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  const updated = await db.quiz.update({
    where: { id: quizId },
    data: { score },
  });

  return NextResponse.json({ quiz: updated });
}
