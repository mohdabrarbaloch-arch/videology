import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { chatWithVideo } from "@/lib/ai";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { message } = await request.json();

  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const video = await db.video.findFirst({
    where: { id, userId: session.userId },
    include: {
      transcript: true,
      chatMessages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  if (!video.transcript) {
    return NextResponse.json({ error: "Transcribe the video first" }, { status: 400 });
  }

  try {
    const userMessage = await db.chatMessage.create({
      data: { videoId: id, role: "user", content: message },
    });

    const history = video.chatMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const reply = await chatWithVideo(
      video.transcript.text,
      video.title || "Untitled",
      message,
      history
    );

    const assistantMessage = await db.chatMessage.create({
      data: { videoId: id, role: "assistant", content: reply },
    });

    return NextResponse.json({ userMessage, assistantMessage });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({ error: "Failed to get response" }, { status: 500 });
  }
}
