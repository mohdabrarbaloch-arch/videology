import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { createRequire } from "module";

const execAsync = promisify(exec);
const requireLocal = createRequire(import.meta.url);

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptionResult {
  text: string;
  segments: TranscriptSegment[];
  language: string;
}

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const GROQ_KEY = process.env.GROQ_API_KEY;

function isOpenRouterKey(key: string): boolean {
  return key.startsWith("sk-or-v1-");
}

interface ProviderConfig {
  url: string;
  model: string;
  apiKey: string;
  authHeader: string;
}

function getProvider(): ProviderConfig | null {
  if (GROQ_KEY) {
    return {
      url: "https://api.groq.com/openai/v1/audio/transcriptions",
      model: "whisper-large-v3-turbo",
      apiKey: GROQ_KEY,
      authHeader: `Bearer ${GROQ_KEY}`,
    };
  }

  if (OPENAI_KEY) {
    const baseUrl = isOpenRouterKey(OPENAI_KEY)
      ? "https://openrouter.ai/api/v1"
      : "https://api.openai.com/v1";

    return {
      url: `${baseUrl}/audio/transcriptions`,
      model: isOpenRouterKey(OPENAI_KEY) ? "openai/whisper-1" : "whisper-1",
      apiKey: OPENAI_KEY,
      authHeader: `Bearer ${OPENAI_KEY}`,
    };
  }

  return null;
}

function getFfmpegPath(): string {
  try {
    const installer = requireLocal("@ffmpeg-installer/ffmpeg");
    if (installer.path && fs.existsSync(installer.path)) return installer.path;
  } catch {
    // ignore
  }
  return process.env.FFMPEG_PATH || "ffmpeg";
}

async function getAudioDuration(audioPath: string): Promise<number> {
  const ffmpeg = getFfmpegPath();
  try {
    const res = await execAsync(`"${ffmpeg}" -i "${audioPath}" 2>&1`, { timeout: 30000 });
    const match = res.stdout.match(/Duration:\s*(\d+):(\d+):(\d+)/);
    if (match) {
      return parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseFloat(match[3]);
    }
  } catch (error: unknown) {
    const err = error as { stdout?: string; stderr?: string; message?: string };
    const output: string = err.stdout || err.stderr || err.message || "";
    const match = output.match(/Duration:\s*(\d+):(\d+):(\d+)/);
    if (match) {
      return parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseFloat(match[3]);
    }
  }
  return 0;
}

async function splitAudio(audioPath: string): Promise<string[]> {
  const duration = await getAudioDuration(audioPath);

  // If audio is short (under ~9 min), transcribe directly
  if (duration <= 540) return [audioPath];

  const ffmpeg = getFfmpegPath();
  const dir = path.dirname(audioPath);
  const base = path.basename(audioPath, path.extname(audioPath));
  const chunkPattern = path.join(dir, `${base}_chunk_%03d.m4a`);
  const chunkDuration = 480; // 8 minutes per chunk

  try {
    await execAsync(
      `"${ffmpeg}" -i "${audioPath}" -f segment -segment_time ${chunkDuration} -c copy "${chunkPattern}" -y`,
      { timeout: 120000 }
    );

    const chunks = fs
      .readdirSync(dir)
      .filter((f) => f.startsWith(`${base}_chunk_`) && f.endsWith(".m4a"))
      .sort()
      .map((f) => path.join(dir, f));

    if (chunks.length > 0) return chunks;
  } catch (error) {
    console.error("Audio splitting failed:", error);
  }

  return [audioPath];
}

async function transcribeChunk(
  audioPath: string,
  startOffset: number,
  provider: ProviderConfig
): Promise<{ text: string; segments: TranscriptSegment[]; language: string }> {
  const fileBuffer = fs.readFileSync(audioPath);
  const ext = path.extname(audioPath).toLowerCase();
  const mimeMap: Record<string, string> = {
    ".mp3": "audio/mpeg",
    ".m4a": "audio/mp4",
    ".mp4": "audio/mp4",
    ".wav": "audio/wav",
    ".webm": "audio/webm",
    ".ogg": "audio/ogg",
    ".aac": "audio/aac",
  };
  const mime = mimeMap[ext] || "audio/mpeg";
  const fileName = `audio${ext || ".mp3"}`;

  // Try the primary model first, then fall back (turbo may be unavailable on some accounts)
  const models =
    provider.model === "whisper-large-v3-turbo"
      ? ["whisper-large-v3-turbo", "whisper-large-v3"]
      : [provider.model];

  let lastError: unknown = null;
  for (const model of models) {
    try {
      const blob = new Blob([fileBuffer], { type: mime });
      const file = new File([blob], fileName, { type: mime });

      const formData = new FormData();
      formData.append("file", file);
      formData.append("model", model);
      formData.append("response_format", "verbose_json");

      const response = await fetch(provider.url, {
        method: "POST",
        headers: {
          Authorization: provider.authHeader,
        },
        body: formData,
      });

      if (!response.ok) {
        const err = await response.text();
        lastError = new Error(`Transcription API error: ${err}`);
        if (response.status === 404 || /model/i.test(err)) continue;
        throw lastError;
      }

      const data = await response.json() as {
        text?: string;
        language?: string;
        segments?: { start?: number; end?: number; text?: string }[];
      };

      const segments: TranscriptSegment[] = (data.segments || []).map((s) => ({
        start: (s.start || 0) + startOffset,
        end: (s.end || 0) + startOffset,
        text: s.text || "",
      }));

      return {
        text: data.text || "",
        segments,
        language: data.language || "en",
      };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

export async function transcribeAudio(
  audioPath: string,
  onProgress?: (done: number, total: number) => void
): Promise<TranscriptionResult> {
  const provider = getProvider();

  if (!provider) {
    return fallbackTranscription(
      "No transcription provider configured. Set GROQ_API_KEY (free) or OPENAI_API_KEY in your .env file."
    );
  }

  try {
    const chunks = await splitAudio(audioPath);
    const allText: string[] = [];
    const allSegments: TranscriptSegment[] = [];
    let language = "en";

    // Transcribe chunks in parallel batches of 2 (respects rate limits, much faster)
    for (let i = 0; i < chunks.length; i += 2) {
      const batch = chunks.slice(i, i + 2);
      const results = await Promise.all(
        batch.map((chunkPath, j) => transcribeChunk(chunkPath, (i + j) * 480, provider))
      );

      for (const result of results) {
        if (result.text) {
          allText.push(result.text.trim());
          allSegments.push(...result.segments);
        }
        if (result.language) language = result.language;
      }

      onProgress?.(Math.min(i + batch.length, chunks.length), chunks.length);

      for (const chunkPath of batch) {
        if (chunkPath !== audioPath) {
          try {
            fs.unlinkSync(chunkPath);
          } catch {
            // ignore
          }
        }
      }
    }

    if (allText.length === 0) {
      throw new Error("Transcription returned no text");
    }

    return {
      text: allText.join(" "),
      segments: allSegments,
      language,
    };
  } catch (error) {
    console.error("Transcription failed:", error);
    return fallbackTranscription(error instanceof Error ? error.message : String(error));
  }
}

function fallbackTranscription(detail?: string): TranscriptionResult {
  return {
    text: detail
      ? `Transcription failed: ${detail}`
      : "Transcription failed. Please check your API configuration.",
    segments: [
      {
        start: 0,
        end: 0,
        text: detail ? "Transcription failed." : "Transcription failed.",
      },
    ],
    language: "en",
  };
}
