import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { CLIPS_DIR } from "@/lib/clips";

export const runtime = "nodejs";

function toWeb(stream: fs.ReadStream): ReadableStream<Uint8Array> {
  return Readable.toWeb(stream) as ReadableStream<Uint8Array>;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; file: string }> }
) {
  const { userId, file } = await params;
  const safeName = path.basename(file);
  const safeUser = path.basename(userId);
  const filePath = path.join(CLIPS_DIR, safeUser, safeName);

  if (!fs.existsSync(filePath)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const stat = fs.statSync(filePath);
  const lower = safeName.toLowerCase();
  const mime = lower.endsWith(".mp4")
    ? "video/mp4"
    : /\.(jpe?g|png|webp)$/i.test(lower)
      ? "image/jpeg"
      : "application/octet-stream";
  const headers: Record<string, string> = {
    "Content-Type": mime,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=3600",
  };

  const range = request.headers.get("range");
  if (range) {
    const m = range.match(/bytes=(\d+)-(\d*)/);
    if (m) {
      const start = parseInt(m[1], 10);
      const end = m[2] ? parseInt(m[2], 10) : stat.size - 1;
      if (start >= 0 && start < stat.size && end >= start) {
        const stream = fs.createReadStream(filePath, { start, end });
        return new Response(toWeb(stream), {
          status: 206,
          headers: {
            ...headers,
            "Content-Range": `bytes ${start}-${end}/${stat.size}`,
            "Content-Length": String(end - start + 1),
          },
        });
      }
    }
  }

  headers["Content-Length"] = String(stat.size);
  return new Response(toWeb(fs.createReadStream(filePath)), {
    status: 200,
    headers,
  });
}
