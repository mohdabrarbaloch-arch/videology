"use client";

import { useMemo, useState } from "react";

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
  const [searchQuery, setSearchQuery] = useState("");

  let segments: Segment[] = [];
  try {
    segments = JSON.parse(segmentsJson);
  } catch {
    segments = [];
  }

  const query = searchQuery.trim().toLowerCase();

  const filteredSegments = useMemo(() => {
    if (!query) return segments;
    return segments.filter((seg) => seg.text.toLowerCase().includes(query));
  }, [segments, query]);

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

      <div className="mb-3 flex items-center gap-3">
        <input
          type="text"
          placeholder="Search transcript…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-(--border-2) bg-(--input-bg) px-4 py-2.5 text-sm text-(--fg) placeholder:text-(--fg)/30 focus:outline-none focus:ring-1 focus:ring-(--accent)"
        />
        {query && (
          <span className="shrink-0 text-xs text-(--fg)/40">
            {filteredSegments.length} of {segments.length} segments
          </span>
        )}
      </div>

      {view === "full" ? (
        <div className="max-h-[500px] overflow-y-auto rounded-2xl border border-(--border) bg-(--input-bg) p-5">
          {query ? (
            <HighlightedText text={text} query={query} />
          ) : (
            <p className="text-sm leading-7 text-(--fg)/70">{text}</p>
          )}
        </div>
      ) : (
        <div className="max-h-[500px] space-y-1 overflow-y-auto rounded-2xl border border-(--border) bg-(--input-bg) p-5">
          {filteredSegments.length > 0 ? (
            filteredSegments.map((seg, i) => (
              <div key={i} className="flex gap-3 py-1.5">
                <span className="shrink-0 font-mono text-xs text-(--accent-2)">
                  {formatTime(seg.start)}
                </span>
                <span className="text-sm text-(--fg)/60">{seg.text}</span>
              </div>
            ))
          ) : query ? (
            <p className="text-sm text-(--fg)/40">No segments match your search.</p>
          ) : (
            <p className="text-sm text-(--fg)/40">No timestamped segments available.</p>
          )}
        </div>
      )}
    </div>
  );
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query) return <p className="text-sm leading-7 text-(--fg)/70">{text}</p>;

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);

  return (
    <p className="text-sm leading-7 text-(--fg)/70">
      {parts.map((part, i) =>
        part.toLowerCase() === query ? (
          <mark key={i} className="rounded bg-yellow-200/30 px-0.5 text-inherit dark:bg-yellow-400/20">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </p>
  );
}
