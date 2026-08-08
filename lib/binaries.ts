import fs from "fs";
import path from "path";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";

export function resolveFfmpegPath(): string {
  try {
    if (ffmpegInstaller.path && fs.existsSync(ffmpegInstaller.path)) return ffmpegInstaller.path;
  } catch {
    // fall through
  }
  return process.env.FFMPEG_PATH || "ffmpeg";
}

export const FFMPEG = (() => {
  const p = resolveFfmpegPath();
  if (p.includes(" ") && !p.startsWith('"')) return `"${p}"`;
  return p;
})();

export const FFMPEG_DIR = (() => {
  const p = resolveFfmpegPath();
  const dir = path.dirname(p);
  return dir !== "." ? `--ffmpeg-location "${dir}"` : "";
})();

export function resolveYtDlpPath(): string {
  // Priority: bundled linux binary (Netlify) -> local windows exe -> env -> PATH
  const linux = path.join(process.cwd(), "bin", "yt-dlp");
  const win = path.join(process.cwd(), "yt-dlp.exe");
  if (fs.existsSync(linux)) return linux;
  if (fs.existsSync(win)) return win;
  return process.env.YT_DLP_PATH || "yt-dlp";
}

export const YT_DLP = (() => {
  const p = resolveYtDlpPath();
  return `${p.includes(" ") && !p.startsWith('"') ? `"${p}"` : p} --js-runtimes node`;
})();

// Chunked parallel downloads defeat YouTube's per-connection throttling (~5-10x faster)
export const YT_SPEED =
  "--http-chunk-size 10M --concurrent-fragments 8 --no-playlist --no-warnings --retries 3 --socket-timeout 30";
