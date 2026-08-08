import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { THUMBNAIL_DIR } from "@/lib/paths";
import { IS_CLOUD, getPublicUrl } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ file: string }> }
) {
  const { file } = await params;

  if (IS_CLOUD) {
    return NextResponse.redirect(getPublicUrl(`thumbnails/${path.basename(file)}`));
  }

  const safeName = path.basename(file);
  const filePath = path.join(THUMBNAIL_DIR, safeName);

  if (!fs.existsSync(filePath)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const stat = fs.statSync(filePath);
  const mime = safeName.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
  const body = Readable.toWeb(fs.createReadStream(filePath)) as ReadableStream<Uint8Array>;
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Content-Length": String(stat.size),
      "Cache-Control": "public, max-age=86400",
    },
  });
}
