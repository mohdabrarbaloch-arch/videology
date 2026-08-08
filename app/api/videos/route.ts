import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { IS_CLOUD } from "@/lib/storage";
import { triggerBackgroundFunction } from "@/lib/background";
import { downloadYoutubeVideo, downloadDirectUrl, processUploadedFile } from "@/lib/video-processor";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const videos = await db.video.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    include: {
      transcript: { select: { id: true } },
      analysis: { select: { id: true } },
    },
  });

  return NextResponse.json({ videos });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const contentType = request.headers.get("content-type") || "";

    // Cloud mode: the file is uploaded directly to Supabase Storage via a
    // signed URL. The API route only receives the storage key.
    if (IS_CLOUD) {
      const body = await request.json();

      const inputKey = String(body.inputKey || "").trim();
      const url = String(body.url || "").trim();
      const mode = String(body.mode || "url");

      if (!inputKey && !url) {
        return NextResponse.json(
          { error: "Upload the video first or provide a URL." },
          { status: 400 }
        );
      }

      const video = await db.video.create({
        data: {
          userId: session.userId,
          title: body.title || null,
          source: inputKey ? "upload" : mode,
          sourceType: inputKey ? String(body.fileType || "video") : "video",
          originalUrl: url || null,
          filePath: inputKey || null,
          status: "processing",
        },
      });

      await triggerBackgroundFunction("video-job", { videoId: video.id });

      return NextResponse.json({ video });
    }

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
      }

      const allowedTypes = ["video/mp4", "video/webm", "video/quicktime", "video/x-matroska"];
      const allowedExts = [".mp4", ".webm", ".mov", ".mkv"];
      const ext = (file.name || "").toLowerCase().split(".").pop() || "";
      if (!allowedTypes.includes(file.type) && !allowedExts.includes(`.${ext}`)) {
        return NextResponse.json({ error: "Unsupported video format" }, { status: 400 });
      }

      if (file.size > 500 * 1024 * 1024) {
        return NextResponse.json({ error: "File too large (max 500MB)" }, { status: 400 });
      }

      const result = await processUploadedFile(file);

      const video = await db.video.create({
        data: {
          userId: session.userId,
          title: result.title,
          source: "upload",
          sourceType: file.type,
          filePath: result.filePath,
          audioPath: result.audioPath,
          thumbnailUrl: result.thumbnail,
          status: "uploaded",
        },
      });

      return NextResponse.json({ video });
    }

    const { url, mode } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    type YoutubeResult = Awaited<ReturnType<typeof downloadYoutubeVideo>>;
    type DirectResult = Awaited<ReturnType<typeof downloadDirectUrl>>;
    let result: YoutubeResult | DirectResult;
    if (mode === "youtube") {
      result = await downloadYoutubeVideo(url);
    } else {
      result = await downloadDirectUrl(url);
    }

    const video = await db.video.create({
      data: {
        userId: session.userId,
        title: result.title,
        source: mode || "url",
        sourceType: "video",
        originalUrl: url,
        filePath: result.filePath,
        audioPath: result.audioPath,
        thumbnailUrl: result.thumbnail || null,
        duration: "duration" in result ? result.duration : null,
        status: "uploaded",
      },
    });

    return NextResponse.json({ video });
  } catch (error) {
    console.error("Video creation error:", error);
    return NextResponse.json(
      { error: "Failed to process video. Check your input and try again." },
      { status: 500 }
    );
  }
}
