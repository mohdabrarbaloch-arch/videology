import fs from "fs";
import path from "path";

// All writable data directories are configurable via env vars so the app can
// run against a persistent volume in production (Railway: mount /data).
export const UPLOADS_DIR =
  process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads");

export const AUDIO_DIR =
  process.env.UPLOADS_DIR
    ? path.join(process.env.UPLOADS_DIR, "audio")
    : path.join(UPLOADS_DIR, "audio");

export const WORK_DIR =
  process.env.WORK_DIR || path.join(process.cwd(), "uploads", "clips-work");

export const TOOLS_DIR =
  process.env.TOOLS_DIR || path.join(process.cwd(), "uploads", "tools");

export const THUMBNAIL_DIR =
  process.env.THUMBNAIL_DIR || path.join(process.cwd(), "public", "thumbnails");

export const CLIPS_DIR =
  process.env.CLIPS_DIR || path.join(process.cwd(), "public", "clips");

export function ensureDataDirs() {
  for (const dir of [UPLOADS_DIR, AUDIO_DIR, WORK_DIR, TOOLS_DIR, THUMBNAIL_DIR, CLIPS_DIR]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}
