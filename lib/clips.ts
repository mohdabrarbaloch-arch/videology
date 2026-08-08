import { exec } from "child_process";
import { promisify } from "util";
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import type { TranscriptSegment } from "./transcriber";
import { CLIPS_DIR as PATHS_CLIPS_DIR, WORK_DIR as PATHS_WORK_DIR } from "./paths";

const execAsync = promisify(exec);
const requireLocal = createRequire(import.meta.url);

const FFMPEG = (() => {
  try {
    const installer = requireLocal("@ffmpeg-installer/ffmpeg");
    if (installer.path && fs.existsSync(installer.path)) return `"${installer.path}"`;
  } catch {
    // fall through
  }
  return process.env.FFMPEG_PATH || "ffmpeg";
})();

const YT_DLP = (() => {
  const local = path.join(process.cwd(), "yt-dlp.exe");
  const base = fs.existsSync(local) ? `"${local}"` : process.env.YT_DLP_PATH || "yt-dlp";
  return `${base} --js-runtimes node`;
})();

const FFMPEG_DIR = (() => {
  const p = FFMPEG.replace(/^"|"$/g, "");
  const dir = path.dirname(p);
  return dir !== "." ? `--ffmpeg-location "${dir}"` : "";
})();

const YT_SPEED =
  "--http-chunk-size 10M --concurrent-fragments 8 --no-playlist --no-warnings --retries 3 --socket-timeout 30";

export const CLIPS_DIR = PATHS_CLIPS_DIR;
const WORK_DIR = PATHS_WORK_DIR;

export interface ClipPlan {
  start: number;
  end: number;
  title: string;
}

export interface CaptionStyle {
  id: string;
  font: string;
  size: number;
  primary: string;
  secondary: string;
  outline: number;
  shadow: number;
  spacing: number;
  marginV: number;
}

export const CAPTION_STYLES: CaptionStyle[] = [
  {
    id: "viral",
    font: "Arial Black",
    size: 84,
    primary: "&H00FFD966",
    secondary: "&H008C8C8C",
    outline: 4,
    shadow: 2,
    spacing: 2,
    marginV: 180,
  },
  {
    id: "clean",
    font: "Arial",
    size: 88,
    primary: "&H00FFFFFF",
    secondary: "&H00969696",
    outline: 3,
    shadow: 1,
    spacing: 0,
    marginV: 170,
  },
  {
    id: "neon",
    font: "Arial Black",
    size: 80,
    primary: "&H00FF9EC8",
    secondary: "&H00828282",
    outline: 4,
    shadow: 2,
    spacing: 1,
    marginV: 185,
  },
];

export const CLIP_PALETTES: [string, string][] = [
  ["#7c5cff", "#3d8bff"],
  ["#ff5d5d", "#ffb454"],
  ["#0ea5a4", "#2dd4bf"],
  ["#e11d7e", "#ff7ec8"],
  ["#1f2937", "#4b6bfb"],
  ["#f59e0b", "#ef4444"],
];

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function ensureDirs() {
  if (!fs.existsSync(CLIPS_DIR)) fs.mkdirSync(CLIPS_DIR, { recursive: true });
  if (!fs.existsSync(WORK_DIR)) fs.mkdirSync(WORK_DIR, { recursive: true });
}

async function run(command: string, timeout: number): Promise<void> {
  try {
    await execAsync(command, { timeout });
  } catch (error: unknown) {
    const err = error as { stderr?: string; stdout?: string; message?: string };
    const detail = err?.stderr || err?.stdout || err?.message || String(error);
    throw new Error(detail.slice(0, 2000));
  }
}

async function getDuration(videoPath: string): Promise<number> {
  try {
    const res = await execAsync(`${FFMPEG} -i "${videoPath}" 2>&1`, { timeout: 30000 });
    const match = res.stdout.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
    if (match) {
      return parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseFloat(match[3]);
    }
  } catch (error: unknown) {
    const err = error as { stdout?: string; stderr?: string };
    const out = err?.stdout || err?.stderr || "";
    const match = out.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
    if (match) {
      return parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseFloat(match[3]);
    }
  }
  return 0;
}

export async function downloadVideoFromUrl(url: string): Promise<string> {
  ensureDirs();
  const id = uuidv4();
  const out = path.join(WORK_DIR, `${id}.mp4`);
  await run(
    `${YT_DLP} ${YT_SPEED} ${FFMPEG_DIR} -f "best[height<=720]/bestvideo[height<=720]+bestaudio/best[height<=720]" --merge-output-format mp4 -o "${out}" "${url}"`,
    600000
  );
  if (!fs.existsSync(out)) throw new Error("Video download failed.");
  return out;
}

export async function saveUploadedVideo(file: File): Promise<string> {
  ensureDirs();
  const id = uuidv4();
  const ext = path.extname(file.name) || ".mp4";
  const out = path.join(WORK_DIR, `${id}${ext}`);
  fs.writeFileSync(out, Buffer.from(await file.arrayBuffer()));
  return out;
}

export async function extractAudio(videoPath: string): Promise<string> {
  ensureDirs();
  const audio = path.join(WORK_DIR, `${path.basename(videoPath, path.extname(videoPath))}.m4a`);
  try {
    // Fast path: copy the audio stream directly when the container allows it
    await run(`${FFMPEG} -y -i "${videoPath}" -vn -c:a copy "${audio}"`, 120000);
  } catch {
    // Fallback: re-encode to AAC
    await run(`${FFMPEG} -y -i "${videoPath}" -vn -acodec aac -b:a 128k "${audio}"`, 120000);
  }
  return audio;
}

interface ScoreWindow {
  start: number;
  end: number;
  text: string;
  words: number;
  duration: number;
}

function mergeWindows(segments: TranscriptSegment[]): ScoreWindow[] {
  const windows: ScoreWindow[] = [];
  let current: ScoreWindow | null = null;
  for (const seg of segments) {
    const text = (seg.text || "").trim();
    if (!text) continue;
    if (!current) {
      current = { start: seg.start, end: seg.end, text, words: text.split(/\s+/).length, duration: Math.max(seg.end - seg.start, 0.5) };
      continue;
    }
    const gap = seg.start - current.end;
    if (gap <= 2) {
      current.end = seg.end;
      current.text += " " + text;
      current.words += text.split(/\s+/).length;
      current.duration = current.end - current.start;
    } else {
      windows.push(current);
      current = { start: seg.start, end: seg.end, text, words: text.split(/\s+/).length, duration: Math.max(seg.end - seg.start, 0.5) };
    }
  }
  if (current) windows.push(current);
  return windows;
}

function clampClip(start: number, end: number, duration: number, total: number): { start: number; end: number } {
  const minLen = Math.min(6, total);
  let s = start;
  let e = end;
  if (e - s < minLen) {
    const mid = (s + e) / 2;
    s = Math.max(0, mid - minLen / 2);
    e = Math.min(total, mid + minLen / 2);
  }
  if (e - s > duration + 8) {
    const mid = (s + e) / 2;
    s = Math.max(0, mid - duration / 2);
    e = Math.min(total, mid + duration / 2);
  }
  return { start: Math.max(0, s), end: Math.min(total, Math.max(e, s + 1)) };
}

function pickHeuristic(segments: TranscriptSegment[], count: number, duration: number, total: number): ClipPlan[] {
  const windows = mergeWindows(segments);
  if (windows.length === 0) {
    return [{ start: 0, end: Math.min(duration, total), title: "Best moments" }];
  }
  const scored = windows
    .map((w) => ({ w, score: (w.words / w.duration) * Math.log(1 + w.words) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, count);
  scored.sort((a, b) => a.w.start - b.w.start);
  return scored.map((s, i) => {
    const clamped = clampClip(s.w.start, s.w.end, duration, total);
    return { start: clamped.start, end: clamped.end, title: `Clip ${i + 1}` };
  });
}

async function pickWithAI(
  segments: TranscriptSegment[],
  title: string,
  count: number,
  duration: number,
  total: number
): Promise<ClipPlan[] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const candidates = mergeWindows(segments);
  if (candidates.length === 0) return null;

  const lines = candidates
    .map(
      (w) =>
        `[${w.start.toFixed(1)}s - ${w.end.toFixed(1)}s] ${w.text.trim().slice(0, 180)}`
    )
    .join("\n");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const baseUrl = apiKey.startsWith("sk-or-v1-")
      ? "https://openrouter.ai/api/v1"
      : "https://api.openai.com/v1";
    const model = apiKey.startsWith("sk-or-v1-") ? "openai/gpt-4o-mini" : "gpt-4o-mini";

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        max_tokens: 800,
        messages: [
          {
            role: "system",
            content: `You are a viral short-form video editor. From the timed segments, pick the ${count} most engaging, quotable, or emotional moments for a ~${duration}s clip. Return ONLY a JSON array of exactly ${count} objects: [{"start": seconds, "end": seconds, "title": "short punchy clip title (max 5 words)"}]. Use ONLY start/end values that appear in the segments. Each clip should be ${duration} to ${duration + 10} seconds long when possible. No overlapping clips.`,
          },
          {
            role: "user",
            content: `Video: "${title}"\n\nSegments:\n${lines}\n\nTotal duration: ${total.toFixed(0)}s`,
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) return null;
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return null;

    const allowed = new Set(candidates.flatMap((c) => [c.start, c.end]));
    const used: { start: number; end: number }[] = [];
    for (const item of parsed) {
      const s = Number(item.start);
      const e = Number(item.end);
      if (!Number.isFinite(s) || !Number.isFinite(e)) continue;
      if (used.some((u) => s < u.end && e > u.start)) continue;
      const start = Math.max(0, s);
      const end = Math.min(total, Math.max(e, s + 4));
      if (end <= start) continue;
      used.push({ start, end });
      void allowed;
    }
    if (used.length === 0) return null;

    const ordered = used.sort((a, b) => a.start - b.start);
    return ordered.map((c, i) => ({
      start: Math.round(c.start * 10) / 10,
      end: Math.round(c.end * 10) / 10,
      title: String(parsed[i]?.title ?? `Clip ${i + 1}`).slice(0, 40),
    }));
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function pickClips(
  segments: TranscriptSegment[],
  title: string,
  count: number,
  duration: number,
  total: number
): Promise<ClipPlan[]> {
  const ai = await pickWithAI(segments, title, count, duration, total);
  if (ai) return ai;
  return pickHeuristic(segments, count, duration, total);
}

function fmtAssTime(seconds: number): string {
  const s = Math.max(0, seconds);
  const cs = Math.round((s % 1) * 100);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

const WORD_RE = /(\S+\s*)/g;

export function buildAssKaraoke(
  segments: TranscriptSegment[],
  start: number,
  end: number,
  style: CaptionStyle,
  aspect: "9:16" | "1:1" | "16:9"
): string {
  // Output resolutions match the 1080-based design size, so scale stays at 1.0
  const S = 1;
  const playRes = aspect === "9:16" ? "1080 1920" : aspect === "1:1" ? "1080 1080" : "1920 1080";
  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: ${playRes.split(" ")[0]}
PlayResY: ${playRes.split(" ")[1]}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Arial Black,${Math.round(84 * S)},&H00FFFFFF,&H00999999,&H00000000,&H96000000,1,0,0,0,100,100,${Math.round(2 * S)},0,1,${Math.max(1, Math.round(4 * S))},${Math.max(1, Math.round(2 * S))},2,40,40,${Math.round(170 * S)},1
Style: Karaoke,${style.font},${Math.round(style.size * S)},${style.primary},${style.secondary},&H00000000,&H96000000,1,0,0,0,100,100,${Math.max(0, Math.round(style.spacing * S))},0,1,${Math.max(1, Math.round(style.outline * S))},${Math.max(1, Math.round(style.shadow * S))},2,40,40,${Math.round(style.marginV * S)},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const lines: string[] = [];
  const spoken: { tStart: number; tEnd: number; text: string }[] = [];

  for (const seg of segments) {
    const s = Math.max(seg.start, start);
    const e = Math.min(seg.end, end);
    if (e <= s) continue;
    const text = (seg.text || "").trim();
    if (!text) continue;
    const words = text.match(WORD_RE);
    if (!words || words.length === 0) continue;
    const segDur = e - s;
    const wordDur = segDur / words.length;
    words.forEach((w, i) => {
      spoken.push({
        tStart: s + i * wordDur,
        tEnd: s + (i + 1) * wordDur,
        text: w.trim(),
      });
    });
  }

  // Group words into lines of up to 5 words, max 2 lines per Dialogue
  const groupSize = 5;
  const groups: { words: { text: string; tStart: number; tEnd: number }[] }[] = [];
  for (let i = 0; i < spoken.length; i += groupSize) {
    const slice = spoken.slice(i, i + groupSize);
    if (slice.length === 0) continue;
    groups.push({ words: slice });
  }

  for (const g of groups) {
    let karaokeText = "";
    for (const w of g.words) {
      const durCs = Math.max(4, Math.round((w.tEnd - w.tStart) * 100));
      karaokeText += `{\\k${durCs}}${w.text} `;
    }
    lines.push(
      `Dialogue: 0,${fmtAssTime(g.words[0].tStart)},${fmtAssTime(
        Math.max(g.words[g.words.length - 1].tEnd, g.words[0].tStart + 0.05)
      )},Karaoke,,0,0,0,,${karaokeText.trim()}`
    );
  }

  return header + lines.join("\n");
}

export function escapeAssPath(p: string): string {
  return p.replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "\\'");
}

export async function renderClip(
  inputPath: string,
  clip: ClipPlan,
  assPath: string | null,
  outPath: string,
  aspect: "9:16" | "1:1" | "16:9"
): Promise<void> {
  const start = Math.max(0, clip.start);
  const duration = Math.max(1, clip.end - clip.start);

  let filter: string;
  if (aspect === "16:9") {
    const ass = assPath ? `,ass=filename='${escapeAssPath(assPath)}'` : "";
    filter = `[0:v]scale=1920:-2,format=yuv420p${ass}[v]`;
  } else {
    const [w, h] = aspect === "1:1" ? [1080, 1080] : [1080, 1920];
    const ass = assPath ? `,ass=filename='${escapeAssPath(assPath)}'` : "";
    // Fill the frame with the video (center crop), no background overlay
    filter = `[0:v]scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},format=yuv420p${ass}[v]`;
  }

  const scriptPath = path.join(WORK_DIR, `${path.basename(outPath, ".mp4")}.txt`);
  fs.writeFileSync(scriptPath, filter, "utf8");

  await run(
    `${FFMPEG} -y -ss ${start.toFixed(3)} -i "${inputPath}" -t ${duration.toFixed(3)} -filter_complex_script "${scriptPath}" -map "[v]" -map "0:a:0" -c:v libx264 -preset veryfast -crf 18 -profile:v high -level 4.1 -c:a aac -b:a 160k -movflags +faststart "${outPath}"`,
    600000
  );

  try {
    fs.unlinkSync(scriptPath);
  } catch {
    // ignore
  }
}

export async function generateClipThumbnail(videoPath: string, thumbPath: string): Promise<void> {
  await run(
    `${FFMPEG} -y -ss 0.5 -i "${videoPath}" -frames:v 1 -q:v 3 "${thumbPath}"`,
    30000
  );
}

const ARABIC_TEXT_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;

// Generate a designed gradient thumbnail (like the AI Thumbnails cards): a
// diagonal gradient background with the clip's AI title + subtitle. Falls back
// to a plain frame when the text can't be rendered (e.g. Arabic script).
export async function generateAiClipThumbnail(
  videoPath: string,
  thumbPath: string,
  title: string,
  subtitle: string,
  aspect: "9:16" | "1:1" | "16:9",
  paletteIndex = 0
): Promise<void> {
  const cleanTitle = (title || "").replace(/\s+/g, " ").trim().slice(0, 24);
  const cleanSub = (subtitle || "").replace(/\s+/g, " ").trim().slice(0, 20);
  if (!cleanTitle || ARABIC_TEXT_RE.test(cleanTitle + cleanSub)) {
    await generateClipThumbnail(videoPath, thumbPath);
    return;
  }

  const [w, h] = aspect === "9:16" ? [1080, 1920] : aspect === "1:1" ? [1080, 1080] : [1920, 1080];
  const [c1, c2] = CLIP_PALETTES[((paletteIndex % CLIP_PALETTES.length) + CLIP_PALETTES.length) % CLIP_PALETTES.length];
  const [r1, g1, b1] = hexToRgb(c1);
  const [r2, g2, b2] = hexToRgb(c2);
  const base = path.basename(thumbPath, ".jpg");
  const titleFile = path.join(WORK_DIR, `${base}_t.txt`);
  const scriptPath = path.join(WORK_DIR, `${base}_gf.txt`);
  fs.writeFileSync(titleFile, cleanTitle, "utf8");
  if (cleanSub) fs.writeFileSync(path.join(WORK_DIR, `${base}_s.txt`), cleanSub, "utf8");

  const font = escapeAssPath("C:/Windows/Fonts/arialbd.ttf");
  const t = "(X+Y)/(W+H)";
  const c = (a: number, b: number) => `${a}*(1-(${t}))+${b}*(${t})`;
  let graph = `[0:v]geq=r='${c(r1, r2)}':g='${c(g1, g2)}':b='${c(b1, b2)}'`;
  graph += `,drawtext=fontfile='${font}':textfile='${escapeAssPath(titleFile)}':fontcolor=white:fontsize=96:box=1:boxcolor=black@0.35:boxborderw=30:x=(w-text_w)/2:y=h*0.55`;
  if (cleanSub) {
    graph += `,drawtext=fontfile='${font}':textfile='${escapeAssPath(
      path.join(WORK_DIR, `${base}_s.txt`)
    )}':fontcolor=white@0.88:fontsize=52:x=(w-text_w)/2:y=h*0.55+170`;
  }
  fs.writeFileSync(scriptPath, graph, "utf8");

  try {
    await run(
      `${FFMPEG} -y -f lavfi -i color=s=${w}x${h}:c=black -filter_complex_script "${scriptPath}" -frames:v 1 -q:v 2 "${thumbPath}"`,
      60000
    );
  } catch {
    // fall back to a plain frame thumbnail
    await generateClipThumbnail(videoPath, thumbPath);
  } finally {
    cleanup([titleFile, path.join(WORK_DIR, `${base}_s.txt`), scriptPath]);
  }
}

export function cleanup(files: string[]) {
  for (const f of files) {
    try {
      if (f && fs.existsSync(f)) fs.unlinkSync(f);
    } catch {
      // ignore
    }
  }
}

export async function getMediaDuration(p: string): Promise<number> {
  return getDuration(p);
}
