"use client";

import Link from "next/link";
import Image from "next/image";

interface VideoCardProps {
  id: string;
  title: string;
  source: string;
  status: string;
  createdAt: string;
  thumbnailUrl?: string | null;
  hasTranscript: boolean;
  hasAnalysis: boolean;
  onDelete?: (id: string) => void;
}

const statusColors: Record<string, string> = {
  uploaded: "bg-(--btn)/10 text-(--fg)/65",
  transcribing: "bg-yellow-500/10 text-yellow-400",
  transcribed: "bg-blue-500/10 text-blue-400",
  analyzing: "bg-purple-500/10 text-purple-400",
  analyzed: "bg-green-500/10 text-green-400",
  error: "bg-red-500/10 text-red-400",
};

export default function VideoCard({ id, title, source, status, createdAt, thumbnailUrl, hasTranscript, hasAnalysis, onDelete }: VideoCardProps) {
  const date = new Date(createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const statusText = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <div className="group overflow-hidden rounded-2xl border border-(--border) bg-(--surface-1) transition hover:bg-(--surface-2)">
      {/* Thumbnail */}
      <Link href={`/video/${id}`} className="relative block aspect-video w-full overflow-hidden bg-(--btn)/[0.03]">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-(--border-2) bg-(--surface-2) text-lg">
              {source === "youtube" ? "▶" : source === "upload" ? "↑" : "🔗"}
            </div>
          </div>
        )}
      </Link>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-(--fg)">{title || "Untitled"}</h3>
            <p className="mt-0.5 text-xs text-(--fg)/55">{date}</p>
          </div>

          <span className={`shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-medium ${statusColors[status] || statusColors.uploaded}`}>
            {statusText}
          </span>
        </div>

        <div className="mt-4 flex items-center gap-2">
          {hasTranscript && (
            <span className="rounded-md bg-(--accent)/10 px-2 py-1 text-[10px] font-medium text-(--accent-2)">
              Transcribed
            </span>
          )}
          {hasAnalysis && (
            <span className="rounded-md bg-green-500/10 px-2 py-1 text-[10px] font-medium text-green-400">
              Analyzed
            </span>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Link
            href={`/video/${id}`}
            className="flex-1 rounded-xl border border-(--border-2) bg-(--surface-2) px-4 py-2.5 text-center text-xs font-medium text-(--fg) transition hover:bg-(--surface-3)"
          >
            Open
          </Link>
          {onDelete && (
            <button
              onClick={() => onDelete(id)}
              className="rounded-xl border border-(--border-2) bg-(--surface-2) px-3 py-2.5 text-xs font-medium text-(--fg)/60 transition hover:border-red-400/30 hover:bg-red-400/10 hover:text-red-400"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
