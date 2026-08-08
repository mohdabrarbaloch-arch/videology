import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { getSession } from "@/lib/auth";
import { createUploadUrl, IS_CLOUD } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name } = await request.json();
    const ext = path.extname(name || "") || ".mp4";
    const key = `uploads/${session.userId}/${uuidv4()}${ext}`;

    if (!IS_CLOUD) {
      return NextResponse.json({ key, uploadUrl: null });
    }

    const result = await createUploadUrl(key);
    return NextResponse.json({ key: result.key, uploadUrl: result.uploadUrl });
  } catch (error) {
    console.error("Upload URL error:", error);
    return NextResponse.json({ error: "Failed to create upload URL." }, { status: 500 });
  }
}
