import fs from "fs";
import path from "path";

// Serverless (Netlify functions / Render) has a read-only project dir and no
// persistent disk, so all writable data goes to /tmp. Local dev keeps using
// the project folders so files can be served straight from disk.
export const IS_SERVERLESS = process.env.SERVERLESS === "true";

const tmpBase = "/tmp/videology";
const devBase = path.join(process.cwd(), "uploads");

// All writable data directories are configurable via env vars so the app can
// run against a persistent volume in production (Railway: mount /data).
export const UPLOADS_DIR =
  process.env.UPLOADS_DIR || (IS_SERVERLESS ? path.join(tmpBase, "uploads") : devBase);

export const AUDIO_DIR =
  process.env.UPLOADS_DIR
    ? path.join(process.env.UPLOADS_DIR, "audio")
    : path.join(UPLOADS_DIR, "audio");

export const WORK_DIR =
  process.env.WORK_DIR ||
  (IS_SERVERLESS ? path.join(tmpBase, "work") : path.join(devBase, "clips-work"));

export const TOOLS_DIR =
  process.env.TOOLS_DIR ||
  (IS_SERVERLESS ? path.join(tmpBase, "tools") : path.join(devBase, "tools"));

export const THUMBNAIL_DIR =
  process.env.THUMBNAIL_DIR ||
  (IS_SERVERLESS ? path.join(tmpBase, "thumbnails") : path.join(process.cwd(), "public", "thumbnails"));

export const CLIPS_DIR =
  process.env.CLIPS_DIR ||
  (IS_SERVERLESS ? path.join(tmpBase, "clips") : path.join(process.cwd(), "public", "clips"));

// Ephemeral downloads (storage -> local file for ffmpeg processing).
export const TEMP_DIR =
  process.env.TEMP_DIR || (IS_SERVERLESS ? path.join(tmpBase, "tmp") : path.join(devBase, "tmp"));

export function ensureDataDirs() {
  for (const dir of [UPLOADS_DIR, AUDIO_DIR, WORK_DIR, TOOLS_DIR, THUMBNAIL_DIR, CLIPS_DIR, TEMP_DIR]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}
