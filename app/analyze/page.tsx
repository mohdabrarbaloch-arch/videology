"use client";

import { ChangeEvent, DragEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ThemeDropdown from "@/components/ThemeDropdown";

type InputMode = "youtube" | "url" | "upload";

export default function AnalyzePage() {
  const router = useRouter();
  const [mode, setMode] = useState<InputMode>("youtube");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);

  function handleFile(selected: File | undefined) {
    setError("");
    if (!selected) return;

    const allowedTypes = ["video/mp4", "video/webm", "video/quicktime", "video/x-matroska"];
    const allowedExts = ["mp4", "webm", "mov", "mkv"];
    const ext = (selected.name || "").split(".").pop()?.toLowerCase() || "";
    if (!allowedTypes.includes(selected.type) && !allowedExts.includes(ext)) {
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

  function isYouTubeUrl(value: string) {
    try {
      const parsed = new URL(value);
      const hostname = parsed.hostname.toLowerCase();
      return (
        hostname === "youtube.com" ||
        hostname === "www.youtube.com" ||
        hostname === "m.youtube.com" ||
        hostname === "youtu.be" ||
        hostname === "www.youtube-nocookie.com"
      );
    } catch {
      return false;
    }
  }

  async function handleContinue() {
    setError("");
    setProcessing(true);

    try {
      if (mode === "upload") {
        if (!file) {
          setError("Please select a video before continuing.");
          setProcessing(false);
          return;
        }

        // Cloud mode: upload straight to Supabase via a signed URL, then
        // reference the storage key. Dev mode falls back to multipart.
        const urlRes = await fetch("/api/videos/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: file.name, type: file.type }),
        });

        if (urlRes.ok) {
          const { key, uploadUrl } = await urlRes.json();

          if (uploadUrl) {
            const putRes = await fetch(uploadUrl, { method: "PUT", body: file });
            if (!putRes.ok) {
              setError("Video upload failed. Please try again.");
              setProcessing(false);
              return;
            }
            const res = await fetch("/api/videos", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ inputKey: key, fileType: file.type }),
            });
            const data = await res.json();
            if (!res.ok) {
              setError(data.error || "Failed to upload video");
              setProcessing(false);
              return;
            }
            router.push(`/video/${data.video.id}`);
            return;
          }
        }

        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/videos", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to upload video");
          setProcessing(false);
          return;
        }

        router.push(`/video/${data.video.id}`);
        return;
      }

      const trimmedUrl = url.trim();

      if (!trimmedUrl) {
        setError("Please enter a video URL.");
        setProcessing(false);
        return;
      }

      if (!isValidUrl(trimmedUrl)) {
        setError("Please enter a valid URL.");
        setProcessing(false);
        return;
      }

      if (mode === "youtube" && !isYouTubeUrl(trimmedUrl)) {
        setError("Please enter a valid YouTube URL.");
        setProcessing(false);
        return;
      }

      const res = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmedUrl, mode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to process video");
        setProcessing(false);
        return;
      }

      router.push(`/video/${data.video.id}`);
    } catch {
      setError("Something went wrong. Please try again.");
      setProcessing(false);
    }
  }

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
              <div className="text-[9px] uppercase tracking-[0.2em] text-(--fg)/35">Analyze</div>
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
            New video analysis
          </div>

          <h1 className="text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">
            What should we analyze?
          </h1>

          <p className="mt-4 text-sm leading-6 text-(--fg)/40 sm:text-base">
            Give Videology a video and we&apos;ll turn its content into searchable, understandable knowledge.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-3xl rounded-3xl border border-(--border) bg-(--surface-1) p-5 shadow-2xl shadow-(--shadow) sm:p-8">
          {/* Tabs */}
          <div className="grid grid-cols-3 rounded-2xl border border-(--border) bg-(--input-bg) p-1">
            {[
              ["youtube", "YouTube"],
              ["url", "Video URL"],
              ["upload", "Upload"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setMode(value as InputMode);
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

          {/* YouTube / URL */}
          {mode !== "upload" && (
            <div className="mt-8">
              <label htmlFor="video-url" className="mb-2 block text-sm font-medium text-(--fg)/75">
                {mode === "youtube" ? "YouTube video URL" : "Direct video URL"}
              </label>

              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  id="video-url"
                  type="url"
                  value={url}
                  onChange={(event) => { setUrl(event.target.value); setError(""); }}
                  placeholder={
                    mode === "youtube"
                      ? "https://www.youtube.com/watch?v=..."
                      : "https://example.com/video.mp4"
                  }
                  className="min-w-0 flex-1 rounded-xl border border-(--border-2) bg-(--input-bg) px-4 py-3.5 text-sm text-(--fg) outline-none placeholder:text-(--fg)/20 transition focus:border-(--accent)/60 focus:ring-2 focus:ring-(--accent)/10"
                />

                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={processing}
                  className="rounded-xl bg-(--btn) px-6 py-3.5 text-sm font-semibold text-(--btn-fg) transition hover:bg-(--btn-hover) disabled:opacity-50"
                >
                  {processing ? "Processing..." : "Continue →"}
                </button>
              </div>

              <p className="mt-3 text-xs text-(--fg)/25">
                {mode === "youtube"
                  ? "Public YouTube videos are supported."
                  : "Use a publicly accessible direct video URL."}
              </p>
            </div>
          )}

          {/* Upload */}
          {mode === "upload" && (
            <div className="mt-8">
              <label
                htmlFor="video-file"
                onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-6 text-center transition ${
                  isDragging
                    ? "border-(--accent-2) bg-(--accent)/10"
                    : "border-(--border-2) bg-(--input-bg) hover:border-(--border-3) hover:bg-(--surface-1)"
                }`}
              >
                <input
                  id="video-file"
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

              <div className="mt-5 flex items-center justify-between gap-4">
                <p className="text-xs text-(--fg)/25">MP4, WebM, MOV, MKV · Maximum 500 MB</p>

                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={processing || !file}
                  className="shrink-0 rounded-xl bg-(--btn) px-5 py-3 text-sm font-semibold text-(--btn-fg) transition hover:bg-(--btn-hover) disabled:opacity-50"
                >
                  {processing ? "Uploading..." : "Continue →"}
                </button>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div role="alert" className="mt-5 rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}
        </div>

        {/* Processing pipeline */}
        <div className="mx-auto mt-12 max-w-3xl">
          <p className="text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-(--fg)/25">
            Your analysis pipeline
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            {[
              ["01", "Transcribe"],
              ["02", "Understand"],
              ["03", "Generate"],
              ["04", "Learn"],
            ].map(([number, label]) => (
              <div key={number} className="rounded-2xl border border-(--border) bg-(--surface-1) p-4 text-center">
                <div className="text-[10px] font-semibold text-(--accent-2)">{number}</div>
                <div className="mt-2 text-xs font-medium text-(--fg)/55">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
