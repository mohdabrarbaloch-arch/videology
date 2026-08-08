"use client";

import { ChangeEvent, DragEvent, useState } from "react";
import Link from "next/link";
import ThemeDropdown from "@/components/ThemeDropdown";

type Aspect = "9:16" | "1:1" | "16:9";
type StyleId = "viral" | "clean" | "neon";

interface Clip {
  id: string;
  title: string;
  aiTitle?: string;
  duration: number;
  url: string;
  thumbnail: string;
}

const STYLES: { id: StyleId; name: string; desc: string; example: { a: string; b: string } }[] = [
  {
    id: "viral",
    name: "Viral",
    desc: "Bold, high-energy captions",
    example: { a: "This", b: "is crazy" },
  },
  {
    id: "clean",
    name: "Clean",
    desc: "Minimal, modern captions",
    example: { a: "This", b: "is crazy" },
  },
  {
    id: "neon",
    name: "Neon",
    desc: "Glowing night vibes",
    example: { a: "This", b: "is crazy" },
  },
];

export default function ClipsPage() {
  const [mode, setMode] = useState<"youtube" | "upload">("youtube");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [count, setCount] = useState(1);
  const [duration, setDuration] = useState(30);
  const [aspect, setAspect] = useState<Aspect>("9:16");
  const [style, setStyle] = useState<StyleId>("viral");
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState("");
  const [clips, setClips] = useState<Clip[] | null>(null);

  function handleFile(selected: File | undefined) {
    setError("");
    if (!selected) return;

    const allowedExts = ["mp4", "webm", "mov", "mkv"];
    const ext = (selected.name || "").split(".").pop()?.toLowerCase() || "";
    if (!allowedExts.includes(ext)) {
      setError("Please select a supported video file.");
      return;
    }

    if (selected.size > 500 * 1024 * 1024) {
      setError("Video size must be 500 MB or less.");
      return;
    }

    setFile(selected);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    handleFile(event.target.files?.[0]);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    handleFile(event.dataTransfer.files?.[0]);
  }

  function isValidUrl(value: string) {
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }

  async function handleGenerate() {
    setError("");
    setClips(null);
    setStatus("");
    setProcessing(true);

    try {
      const formData = new FormData();
      formData.append("count", String(count));
      formData.append("duration", String(duration));
      formData.append("aspect", aspect);
      formData.append("style", style);

      if (mode === "upload") {
        if (!file) {
          setError("Please select a video before continuing.");
          setProcessing(false);
          return;
        }
        formData.append("file", file);
      } else {
        const trimmedUrl = url.trim();
        if (!trimmedUrl) {
          setError("Please enter a YouTube URL.");
          setProcessing(false);
          return;
        }
        if (!isValidUrl(trimmedUrl)) {
          setError("Please enter a valid URL.");
          setProcessing(false);
          return;
        }
        formData.append("url", trimmedUrl);
      }

      const res = await fetch("/api/clips/generate", {
        method: "POST",
        body: formData,
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Failed to generate clips.");
        setProcessing(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() ?? "";

        for (const block of blocks) {
          let dataStr = "";
          for (const line of block.split("\n")) {
            if (line.startsWith("data:")) dataStr += line.slice(5).trim();
          }
          if (!dataStr) continue;

          let data: Record<string, unknown>;
          try {
            data = JSON.parse(dataStr);
          } catch {
            continue;
          }

          if (data.type === "status") {
            setStatus(String(data.message ?? ""));
          } else if (data.type === "clips") {
            setClips((data.clips as Clip[]) || []);
            setProcessing(false);
          } else if (data.type === "error") {
            setError(String(data.message ?? "Failed to generate clips."));
            setProcessing(false);
          }
        }
      }

      setProcessing(false);
    } catch {
      setError("Something went wrong. Please try again.");
      setProcessing(false);
    }
  }

  const stylePreview = STYLES.find((s) => s.id === style)!;

  return (
    <main className="min-h-screen bg-(--bg) text-(--fg)">
      <header className="border-b border-(--border)">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-(--border-2) bg-(--surface-2) text-sm font-bold">
              V
            </div>
            <div>
              <div className="font-semibold tracking-tight">Videology</div>
              <div className="text-[9px] uppercase tracking-[0.2em] text-(--fg)/35">Clip Studio</div>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-(--fg)/40 transition hover:text-(--fg)">
              ← Dashboard
            </Link>
            <ThemeDropdown />
          </div>
        </div>
      </header>

      <section className="relative mx-auto max-w-5xl px-5 py-14 sm:px-8 sm:py-20">
        <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-96 w-[600px] -translate-x-1/2 rounded-full bg-(--accent)/10 blur-[130px]" />

        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-(--border-2) bg-(--surface-2) px-3 py-1.5 text-[11px] text-(--fg)/50">
            <span className="h-1.5 w-1.5 rounded-full bg-(--accent-2)" />
            Auto-clip · Captions · Shorts-ready
          </div>

          <h1 className="text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">
            Turn videos into viral shorts
          </h1>

          <p className="mt-4 text-sm leading-6 text-(--fg)/40 sm:text-base">
            Paste a YouTube link or upload a video. We&apos;ll find the best moments and
            add karaoke-style captions automatically.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-3xl rounded-3xl border border-(--border) bg-(--surface-1) p-5 shadow-2xl shadow-(--shadow) sm:p-8">
          {/* Source tabs */}
          <div className="grid grid-cols-2 rounded-2xl border border-(--border) bg-(--input-bg) p-1">
            {[
              ["youtube", "YouTube"],
              ["upload", "Upload"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setMode(value as "youtube" | "upload");
                  setError("");
                }}
                className={`rounded-xl px-3 py-3 text-sm font-medium transition ${
                  mode === value ? "bg-(--btn) text-(--btn-fg)" : "text-(--fg)/40 hover:text-(--fg)"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* YouTube */}
          {mode === "youtube" && (
            <div className="mt-8">
              <label htmlFor="clip-url" className="mb-2 block text-sm font-medium text-(--fg)/75">
                YouTube video URL
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  id="clip-url"
                  type="url"
                  value={url}
                  onChange={(event) => { setUrl(event.target.value); setError(""); }}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="min-w-0 flex-1 rounded-xl border border-(--border-2) bg-(--input-bg) px-4 py-3.5 text-sm text-(--fg) outline-none placeholder:text-(--fg)/20 transition focus:border-(--accent)/60 focus:ring-2 focus:ring-(--accent)/10"
                />
              </div>
              <p className="mt-3 text-xs text-(--fg)/25">Public YouTube videos are supported.</p>
            </div>
          )}

          {/* Upload */}
          {mode === "upload" && (
            <div className="mt-8">
              <label
                htmlFor="clip-file"
                onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-6 text-center transition ${
                  isDragging
                    ? "border-(--accent-2) bg-(--accent)/10"
                    : "border-(--border-2) bg-(--input-bg) hover:border-(--border-3) hover:bg-(--surface-1)"
                }`}
              >
                <input
                  id="clip-file"
                  type="file"
                  accept="video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-(--border-2) bg-(--surface-2) text-xl">
                  ↑
                </div>

                {file ? (
                  <>
                    <h2 className="mt-5 text-sm font-semibold text-(--fg)">{file.name}</h2>
                    <p className="mt-2 text-xs text-(--fg)/35">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    <span className="mt-5 text-xs text-(--accent-3)">Choose another file</span>
                  </>
                ) : (
                  <>
                    <h2 className="mt-5 text-sm font-semibold">Drop your video here</h2>
                    <p className="mt-2 text-xs text-(--fg)/35">or click to browse from your computer</p>
                    <span className="mt-5 rounded-lg border border-(--border-2) px-3 py-2 text-xs text-(--fg)/50">Select video</span>
                  </>
                )}
              </label>
              <p className="mt-3 text-xs text-(--fg)/25">MP4, WebM, MOV, MKV · Maximum 500 MB</p>
            </div>
          )}

          {/* Options */}
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-(--fg)/75">Clip count</label>
              <select
                value={count}
                onChange={(event) => setCount(Number(event.target.value))}
                className="w-full rounded-xl border border-(--border-2) bg-(--input-bg) px-3 py-3 text-sm text-(--fg) outline-none transition focus:border-(--accent)/60"
              >
                <option value={1}>1 clip</option>
                <option value={2}>2 clips</option>
                <option value={3}>3 clips</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-(--fg)/75">Target length</label>
              <select
                value={duration}
                onChange={(event) => setDuration(Number(event.target.value))}
                className="w-full rounded-xl border border-(--border-2) bg-(--input-bg) px-3 py-3 text-sm text-(--fg) outline-none transition focus:border-(--accent)/60"
              >
                <option value={20}>~20 seconds</option>
                <option value={30}>~30 seconds</option>
                <option value={45}>~45 seconds</option>
                <option value={60}>~60 seconds</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-(--fg)/75">Aspect ratio</label>
              <select
                value={aspect}
                onChange={(event) => setAspect(event.target.value as Aspect)}
                className="w-full rounded-xl border border-(--border-2) bg-(--input-bg) px-3 py-3 text-sm text-(--fg) outline-none transition focus:border-(--accent)/60"
              >
                <option value="9:16">9:16 · Shorts / Reels</option>
                <option value="1:1">1:1 · Square</option>
                <option value="16:9">16:9 · Widescreen</option>
              </select>
            </div>
          </div>

          {/* Caption style */}
          <div className="mt-8">
            <label className="mb-3 block text-sm font-medium text-(--fg)/75">Caption style</label>
            <div className="grid gap-3 sm:grid-cols-3">
              {STYLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStyle(s.id)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    style === s.id
                      ? "border-(--accent)/60 bg-(--accent)/10"
                      : "border-(--border-2) bg-(--input-bg) hover:border-(--border-3)"
                  }`}
                >
                  <div
                    className="mb-3 rounded-xl px-3 py-4 text-center text-sm font-bold leading-tight"
                    style={{
                      backgroundColor: s.id === "viral" ? "#111" : s.id === "clean" ? "rgba(255,255,255,0.85)" : "#05010f",
                      color: s.id === "clean" ? "#0a0a0a" : "#fff",
                      border: "1px solid rgba(128,128,128,0.25)",
                      fontFamily: s.id === "viral" ? "'Archivo Black', Arial, sans-serif" : s.id === "neon" ? "'Orbitron', Arial, sans-serif" : "Arial, sans-serif",
                      textShadow: s.id === "neon" ? "0 0 8px #22d3ee, 0 0 16px #a855f7" : "0 2px 4px rgba(0,0,0,0.6)",
                    }}
                  >
                    <span style={{ color: s.id === "viral" ? "#fbbf24" : s.id === "neon" ? "#22d3ee" : "#7c3aed" }}>
                      {s.example.a}
                    </span>{" "}
                    {s.example.b}
                  </div>
                  <div className="text-xs font-semibold text-(--fg)">{s.name}</div>
                  <div className="mt-1 text-[11px] text-(--fg)/35">{s.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Generate */}
          <div className="mt-8">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={processing}
              className="w-full rounded-xl bg-(--btn) px-6 py-4 text-sm font-semibold text-(--btn-fg) transition hover:bg-(--btn-hover) disabled:opacity-50"
            >
              {processing ? "Generating clips..." : "Generate clips →"}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div role="alert" className="mt-5 rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {/* Processing pipeline */}
          {processing && (
            <div className="mt-8">
              <div className="rounded-2xl border border-(--border) bg-(--input-bg) px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-(--accent-2)" />
                  <p className="text-sm text-(--fg)/60">
                    {status || "Starting..."}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["01", "Download"],
                  ["02", "Transcribe"],
                  ["03", "Pick moments"],
                  ["04", "Render + captions"],
                ].map(([number, label]) => (
                  <div key={number} className="rounded-2xl border border-(--border) bg-(--surface-1) p-4 text-center">
                    <div className="animate-pulse text-[10px] font-semibold text-(--accent-2)">{number}</div>
                    <div className="mt-2 text-xs font-medium text-(--fg)/55">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        {clips && clips.length > 0 && (
          <div className="mx-auto mt-12 max-w-5xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-semibold tracking-tight">Your clips</h2>
              <button
                type="button"
                onClick={() => { setClips(null); setProcessing(false); }}
                className="text-sm text-(--fg)/40 transition hover:text-(--fg)"
              >
                Start over
              </button>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {clips.map((clip, index) => (
                <div
                  key={clip.id}
                  className="overflow-hidden rounded-3xl border border-(--border) bg-(--surface-1) shadow-xl shadow-(--shadow)"
                >
                  <div className="relative">
                    <video
                      src={clip.url}
                      poster={clip.thumbnail}
                      controls
                      playsInline
                      preload="metadata"
                      className="aspect-video w-full bg-black object-contain"
                    />
                    <div className="absolute left-3 top-3 rounded-full border border-white/10 bg-black/70 px-3 py-1 text-[11px] font-semibold text-white">
                      Clip {index + 1} · {clip.duration}s
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{clip.title}</h3>
                    <p className="mt-1 text-[11px] text-(--fg)/35">AI thumbnail: {clip.aiTitle}</p>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <a
                        href={clip.url}
                        download
                        className="rounded-xl border border-(--border-2) bg-(--input-bg) px-4 py-2.5 text-center text-xs font-semibold text-(--fg)/70 transition hover:border-(--border-3) hover:text-(--fg)"
                      >
                        Download video
                      </a>
                      <a
                        href={clip.thumbnail}
                        download={`${clip.title || "clip"}-thumbnail.jpg`}
                        className="rounded-xl border border-(--border-2) bg-(--input-bg) px-4 py-2.5 text-center text-xs font-semibold text-(--fg)/70 transition hover:border-(--border-3) hover:text-(--fg)"
                      >
                        Download thumbnail
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-8 text-center text-xs text-(--fg)/25">
              Caption style {stylePreview.name} · {aspect} · ~{duration}s
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
