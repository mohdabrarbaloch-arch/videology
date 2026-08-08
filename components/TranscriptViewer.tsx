"use client";

import { useState } from "react";

interface Segment {
  start: number;
  end: number;
  text: string;
}

interface TranscriptViewerProps {
  text: string;
  segments: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function TranscriptViewer({ text, segments: segmentsJson }: TranscriptViewerProps) {
  const [view, setView] = useState<"full" | "segments">("full");

  let segments: Segment[] = [];
  try {
    segments = JSON.parse(segmentsJson);
  } catch {
    segments = [];
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => setView("full")}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            view === "full" ? "bg-(--btn) text-(--btn-fg)" : "text-(--fg)/40 hover:text-(--fg)"
          }`}
        >
          Full Text
        </button>
        <button
          onClick={() => setView("segments")}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            view === "segments" ? "bg-(--btn) text-(--btn-fg)" : "text-(--fg)/40 hover:text-(--fg)"
          }`}
        >
          Timestamped
        </button>
      </div>

      {view === "full" ? (
        <div className="max-h-[500px] overflow-y-auto rounded-2xl border border-(--border) bg-(--input-bg) p-5">
          <p className="text-sm leading-7 text-(--fg)/70">{text}</p>
        </div>
      ) : (
        <div className="max-h-[500px] space-y-1 overflow-y-auto rounded-2xl border border-(--border) bg-(--input-bg) p-5">
          {segments.length > 0 ? (
            segments.map((seg, i) => (
              <div key={i} className="flex gap-3 py-1.5">
                <span className="shrink-0 font-mono text-xs text-(--accent-2)">
                  {formatTime(seg.start)}
                </span>
                <span className="text-sm text-(--fg)/60">{seg.text}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-(--fg)/40">No timestamped segments available.</p>
          )}
        </div>
      )}
    </div>
  );
}
