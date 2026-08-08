"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import VideoCard from "@/components/VideoCard";
import ThemeDropdown from "@/components/ThemeDropdown";

interface Video {
  id: string;
  title: string | null;
  source: string;
  status: string;
  createdAt: string;
  thumbnailUrl: string | null;
  transcript: { id: string } | null;
  analysis: { id: string } | null;
}

interface User {
  userId: string;
  name: string;
  email: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVideos = useCallback(async () => {
    try {
      const res = await fetch("/api/videos");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      setVideos(data.videos || []);
    } catch {
      console.error("Failed to fetch videos");
    } finally {
      setLoading(false);
    }
  }, [router]);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial async data fetch
    fetchUser();
    fetchVideos();
  }, [fetchUser, fetchVideos]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this video?")) return;

    try {
      const res = await fetch(`/api/videos/${id}`, { method: "DELETE" });
      if (res.ok) {
        setVideos((prev) => prev.filter((v) => v.id !== id));
      }
    } catch {
      console.error("Failed to delete video");
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const analyzedCount = videos.filter((v) => v.analysis).length;

  return (
    <div className="min-h-screen bg-(--bg) text-(--fg)">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 border-r border-(--border) bg-(--bg-2) lg:flex lg:flex-col">
          <div className="flex h-20 items-center border-b border-(--border) px-6">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-(--border-2) bg-(--surface-2) text-sm font-bold">
                V
              </div>
              <div>
                <div className="font-semibold tracking-tight">Videology</div>
                <div className="text-[9px] uppercase tracking-[0.2em] text-(--fg)/35">AI Video Intelligence</div>
              </div>
            </Link>
          </div>

          <nav className="flex-1 px-3 py-6">
            <p className="px-3 pb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-(--fg)/25">Workspace</p>

            <div className="space-y-1">
              <Link
                href="/dashboard"
                className="flex items-center gap-3 rounded-xl bg-(--surface-3) px-3 py-2.5 text-sm text-(--fg) transition"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-(--border) text-xs">⌂</span>
                Overview
              </Link>
              <Link
                href="/tools"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-(--fg)/50 transition hover:bg-(--surface-2) hover:text-(--fg)"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-(--border) text-xs">◧</span>
                Free Tools
              </Link>
              <Link
                href="/clips"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-(--fg)/50 transition hover:bg-(--surface-2) hover:text-(--fg)"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-(--border) text-xs">✂</span>
                Clip Studio
              </Link>
            </div>
          </nav>

          <div className="border-t border-(--border) p-4">
            {user && (
              <div className="mb-3 px-3">
                <p className="text-xs font-medium text-(--fg)/60">{user.name}</p>
                <p className="text-[10px] text-(--fg)/30">{user.email}</p>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-(--fg)/40 transition hover:bg-(--surface-2) hover:text-(--fg)"
            >
              <span>←</span>
              Sign out
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1">
          <header className="flex h-20 items-center justify-between border-b border-(--border) px-5 sm:px-8">
            <div>
              <p className="text-xs text-(--fg)/35">Workspace</p>
              <h1 className="mt-0.5 text-lg font-semibold">Dashboard</h1>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/tools"
                className="hidden rounded-xl border border-(--border-2) bg-(--surface-2) px-4 py-2.5 text-sm font-medium text-(--fg) transition hover:bg-(--surface-hover) sm:inline-flex"
              >
                Free Tools
              </Link>
              <Link
                href="/clips"
                className="hidden rounded-xl border border-(--border-2) bg-(--surface-2) px-4 py-2.5 text-sm font-medium text-(--fg) transition hover:bg-(--surface-hover) sm:inline-flex"
              >
                Clip Studio
              </Link>
              <Link
                href="/analyze"
                className="rounded-xl bg-(--btn) px-4 py-2.5 text-sm font-semibold text-(--btn-fg) transition hover:bg-(--btn-hover)"
              >
                + Analyze video
              </Link>
              <ThemeDropdown />
            </div>
          </header>

          <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
            {/* Welcome */}
            <section className="relative overflow-hidden rounded-3xl border border-(--border) bg-(--surface-1) p-7 sm:p-10">
              <div className="pointer-events-none absolute -right-24 -top-32 h-72 w-72 rounded-full bg-(--accent)/10 blur-[100px]" />

              <div className="relative max-w-2xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-(--border-2) bg-(--surface-2) px-3 py-1.5 text-[11px] text-(--fg)/50">
                  <span className="h-1.5 w-1.5 rounded-full bg-(--accent-2)" />
                  Videology workspace
                </div>

                <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  {user ? `Welcome, ${user.name}` : "Turn any video into knowledge."}
                </h2>

                <p className="mt-4 max-w-xl text-sm leading-6 text-(--fg)/45 sm:text-base">
                  Start by giving Videology a video. The AI pipeline will transcribe, analyze, and help you learn from any video content.
                </p>

                <Link
                  href="/analyze"
                  className="mt-7 inline-flex items-center gap-2 rounded-xl bg-(--btn) px-5 py-3 text-sm font-semibold text-(--btn-fg) transition hover:bg-(--btn-hover)"
                >
                  Analyze your first video
                  <span>→</span>
                </Link>
              </div>
            </section>

            {/* Stats */}
            <section className="mt-6 grid gap-4 sm:grid-cols-3">
              {([
                [String(videos.length), "Videos analyzed"],
                [String(videos.filter((v) => v.transcript).length), "Transcribed"],
                [String(analyzedCount), "AI analyzed"],
              ] as [string, string][]).map(([value, label]) => (
                <div key={label} className="rounded-2xl border border-(--border) bg-(--surface-1) p-5">
                  <div className="text-2xl font-semibold">{value}</div>
                  <div className="mt-1 text-xs text-(--fg)/35">{label}</div>
                </div>
              ))}
            </section>

            {/* Videos Grid */}
            {!loading && videos.length > 0 && (
              <section className="mt-8">
                <h3 className="mb-4 text-lg font-semibold">Your Videos</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {videos.map((video) => (
                    <VideoCard
                      key={video.id}
                      id={video.id}
                      title={video.title || "Untitled"}
                      source={video.source}
                      status={video.status}
                      createdAt={video.createdAt}
                      thumbnailUrl={video.thumbnailUrl}
                      hasTranscript={!!video.transcript}
                      hasAnalysis={!!video.analysis}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Empty state */}
            {loading && (
              <section className="mt-8 rounded-3xl border border-dashed border-(--border-2) bg-(--surface-0) px-6 py-14 text-center">
                <p className="text-sm text-(--fg)/35">Loading videos...</p>
              </section>
            )}

            {!loading && videos.length === 0 && (
              <section className="mt-8 rounded-3xl border border-dashed border-(--border-2) bg-(--surface-0) px-6 py-14 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-(--border-2) bg-(--surface-2) text-xl">
                  ▶
                </div>
                <h3 className="mt-5 text-lg font-semibold">No videos yet</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-(--fg)/35">
                  Your analyzed videos, transcripts, summaries, quizzes, and conversations will appear here.
                </p>
                <Link
                  href="/analyze"
                  className="mt-6 inline-flex rounded-xl border border-(--border-2) bg-(--surface-2) px-5 py-2.5 text-sm font-medium text-(--fg) transition hover:bg-(--surface-hover)"
                >
                  Add your first video
                </Link>
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
