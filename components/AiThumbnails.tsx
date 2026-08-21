"use client";

import { useState } from "react";
import type { ThumbnailConcept } from "@/lib/ai";

const PALETTES = [
  "linear-gradient(135deg,#7c5cff,#3d8bff)",
  "linear-gradient(135deg,#ff5d5d,#ffb454)",
  "linear-gradient(135deg,#0ea5a4,#2dd4bf)",
  "linear-gradient(135deg,#e11d7e,#ff7ec8)",
  "linear-gradient(135deg,#1f2937,#4b6bfb)",
  "linear-gradient(135deg,#f59e0b,#ef4444)",
];

interface Props {
  videoId: string;
  hasTranscript: boolean;
}

export default function AiThumbnails({ videoId, hasTranscript }: Props) {
  const [concepts, setConcepts] = useState<ThumbnailConcept[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/videos/${videoId}/thumbnails`, { method: "POST" });
      if (!res.ok) {
        let message = "Thumbnail generation failed.";
        try {
          const data = await res.json();
          if (data.error) message = data.error;
        } catch {
          // keep default
        }
        setError(message);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setConcepts(data.concepts || []);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-(--border) bg-(--surface-1) p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-(--accent-2)">
            AI Thumbnails
          </h3>
          <p className="mt-1 text-sm text-(--fg)/60">
            Thumbnail concepts built from the video&apos;s strongest ideas.
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading || !hasTranscript}
          className="rounded-xl bg-(--btn) px-4 py-2 text-xs font-semibold text-(--btn-fg) transition hover:bg-(--btn-hover) disabled:opacity-40"
        >
          {loading ? "Generating…" : concepts ? "Regenerate" : "Generate concepts"}
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-red-300">{error}</p>}

      {!loading && concepts && concepts.length > 0 && (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {concepts.map((c, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-(--border-2)">
              <div
                className="relative flex aspect-video items-center justify-center overflow-hidden"
                style={{ background: PALETTES[i % PALETTES.length] }}
              >
                <span className="text-5xl drop-shadow-lg">{c.emoji}</span>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-3 pt-8">
                  <p className="text-sm font-bold leading-tight text-white">{c.title}</p>
                  <p className="mt-0.5 text-[11px] text-white/70">{c.subtitle}</p>
                </div>
              </div>
              <p className="px-3 py-3 text-xs leading-5 text-(--fg)/60">{c.description}</p>
            </div>
          ))}
        </div>
      )}

      {!loading && !concepts && (
        <div className="mt-5 rounded-xl border border-dashed border-(--border-2) bg-(--surface-0) p-6 text-center">
          <p className="text-sm text-(--fg)/55">
            {hasTranscript
              ? "Generate a few thumbnail directions you can reuse for YouTube, TikTok, or any platform."
              : "Transcribe the video first to generate thumbnail concepts."}
          </p>
        </div>
      )}
    </div>
  );
}
