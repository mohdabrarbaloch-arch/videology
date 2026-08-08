import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { UPLOADS_DIR, AUDIO_DIR, THUMBNAIL_DIR, CLIPS_DIR, TOOLS_DIR, TEMP_DIR } from "./paths";

export const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "media";

// Cloud mode = Supabase Storage (Netlify production). Dev mode = local disk
// so the app keeps working without a Supabase project.
export const IS_CLOUD = Boolean(
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
);

let supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabase) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in cloud mode.");
    }
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
  }
  return supabase;
}

const ROOT_DIRS: Record<string, string> = {
  uploads: UPLOADS_DIR,
  audio: AUDIO_DIR,
  thumbnails: THUMBNAIL_DIR,
  clips: CLIPS_DIR,
  tools: TOOLS_DIR,
};

// Map a storage key like "clips/{userId}/{file}.mp4" to a local dev path.
export function localPathForKey(key: string): string {
  const slash = key.indexOf("/");
  if (slash > 0) {
    const root = key.slice(0, slash);
    const rest = key.slice(slash + 1);
    if (ROOT_DIRS[root]) return path.join(ROOT_DIRS[root], rest);
  }
  return path.join(TEMP_DIR, key);
}

export function getPublicUrl(key: string): string {
  if (IS_CLOUD) {
    return `${process.env.SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${key}`;
  }
  if (key.startsWith("thumbnails/")) return `/thumbnails/${path.basename(key)}`;
  if (key.startsWith("clips/")) {
    const rest = key.slice("clips/".length);
    return `/clips/${rest}`;
  }
  return key;
}

// Convert a stored public URL (or serving path) back into a storage key.
export function keyFromPublicUrl(url: string): string {
  if (!url) return url;
  if (IS_CLOUD && url.startsWith(`${process.env.SUPABASE_URL}/storage/v1/object/public/`)) {
    return url.slice(`${process.env.SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/`.length);
  }
  if (url.startsWith("/thumbnails/")) return `thumbnails/${path.basename(url)}`;
  if (url.startsWith("/clips/")) return `clips/${url.slice("/clips/".length)}`;
  return url;
}

export interface StoredObject {
  key: string;
  url: string;
}

export async function putObject(
  key: string,
  data: Buffer | Uint8Array | ArrayBuffer,
  contentType: string
): Promise<StoredObject> {
  if (IS_CLOUD) {
    const { error } = await getSupabase()
      .storage.from(STORAGE_BUCKET)
      .upload(key, data, { contentType, upsert: true });
    if (error) throw new Error(`Storage upload failed: ${error.message}`);
    return { key, url: getPublicUrl(key) };
  }
  const p = localPathForKey(key);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, Buffer.from(data as ArrayBuffer));
  return { key, url: getPublicUrl(key) };
}

export async function getObject(key: string): Promise<Buffer> {
  if (IS_CLOUD) {
    const { data, error } = await getSupabase().storage.from(STORAGE_BUCKET).download(key);
    if (error || !data) throw new Error(`Storage download failed: ${error.message || "no data"}`);
    return Buffer.from(await data.arrayBuffer());
  }
  return fs.readFileSync(localPathForKey(key));
}

export async function deleteObject(key: string): Promise<void> {
  if (!key) return;
  if (IS_CLOUD) {
    await getSupabase().storage.from(STORAGE_BUCKET).remove([key]);
    return;
  }
  const p = localPathForKey(key);
  try {
    if (fs.existsSync(p)) fs.unlinkSync(p);
  } catch {
    // ignore
  }
}

export async function objectExists(key: string): Promise<boolean> {
  if (IS_CLOUD) {
    const { data, error } = await getSupabase().storage.from(STORAGE_BUCKET).list(key.split("/")[0], {
      search: path.basename(key),
    });
    if (error) return false;
    return Boolean(data?.some((o) => o.name === path.basename(key)));
  }
  return fs.existsSync(localPathForKey(key));
}

// Download a storage key (or public URL / local path) to a local temp file so
// ffmpeg/yt-dlp can process it. Caller is responsible for deleting the file.
export async function getLocalTemp(ref: string): Promise<string> {
  if (!ref) throw new Error("Missing file reference");

  // Already a real file on this machine (dev mode).
  if (!IS_CLOUD && fs.existsSync(ref)) return ref;

  // Public URL (https...).
  if (ref.startsWith("http://") || ref.startsWith("https://")) {
    const res = await fetch(ref);
    if (!res.ok) throw new Error(`Failed to fetch remote file: ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const tmp = path.join(TEMP_DIR, `${uuidv4()}${path.extname(new URL(ref).pathname) || ""}`);
    fs.writeFileSync(tmp, buf);
    return tmp;
  }

  // Storage key.
  if (IS_CLOUD) {
    const buf = await getObject(ref);
    const tmp = path.join(TEMP_DIR, `${uuidv4()}${path.extname(ref) || ""}`);
    fs.writeFileSync(tmp, buf);
    return tmp;
  }

  // Dev: local file on disk (key-mapped).
  const p = localPathForKey(ref);
  if (fs.existsSync(p)) return p;
  throw new Error(`File not found: ${ref}`);
}

// Signed upload URL so the browser can upload straight to Supabase Storage
// (Netlify function payloads are capped at ~6MB, so videos can't go through
// the API route). Cloud mode only.
export async function createUploadUrl(key: string): Promise<{ uploadUrl: string; key: string }> {
  if (!IS_CLOUD) {
    throw new Error("Signed upload URLs are only available in cloud mode.");
  }
  const { data, error } = await getSupabase().storage.from(STORAGE_BUCKET).createSignedUploadUrl(key);
  if (error || !data) throw new Error(error?.message || "Failed to create upload URL.");
  return { uploadUrl: data.signedUrl, key: data.path };
}
