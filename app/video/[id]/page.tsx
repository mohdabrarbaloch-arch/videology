"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import TranscriptViewer from "@/components/TranscriptViewer";
import ChatInterface from "@/components/ChatInterface";
import QuizInterface from "@/components/QuizInterface";
import AiThumbnails from "@/components/AiThumbnails";
import ThemeDropdown from "@/components/ThemeDropdown";

interface VideoData {
  id: string;
  title: string | null;
  source: string;
  status: string;
  createdAt: string;
  thumbnailUrl: string | null;
  duration: number | null;
  transcript: { id: string; text: string; segments: string; language: string } | null;
  analysis: {
    summary: string;
    keyPoints: string;
    topics: string;
    chapters: string;
    importantMoments: string;
    learningInsights: string;
  } | null;
  chatMessages: { id: string; role: string; content: string }[];
  quizzes: { id: string; title: string; questions: string; score: number | null }[];
}

type Tab = "overview" | "transcript" | "chat" | "quiz";

export default function VideoDetailPage() {
  const router = useRouter();
  const params = useParams();
  const videoId = params.id as string;

  const [video, setVideo] = useState<VideoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [processingStep, setProcessingStep] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);

  const fetchVideo = useCallback(async () => {
    try {
      const res = await fetch(`/api/videos/${videoId}`);
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) {
        router.push("/dashboard");
        return;
      }
      const data = await res.json();
      setVideo(data.video);
    } catch {
      console.error("Failed to fetch video");
    } finally {
      setLoading(false);
    }
  }, [videoId, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial async data fetch
    fetchVideo();
  }, [fetchVideo]);

  // Auto-process: transcribe then analyze
  useEffect(() => {
    if (!video) return;
    if (video.status === "uploaded") {
      runTranscription();
    } else if (video.status === "transcribed" && !video.analysis) {
      runAnalysis();
    }
  }, [video?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  async function runTranscription() {
    setProcessingStep("Transcribing audio...");
    try {
      const res = await fetch(`/api/videos/${videoId}/transcribe`, { method: "POST" });
      if (res.ok) {
        setProcessingStep("Transcription complete! Starting analysis...");
        await fetchVideo();
      } else {
        setProcessingStep("Transcription failed. Please try again.");
      }
    } catch {
      setProcessingStep("Transcription failed. Please try again.");
    }
  }

  async function runAnalysis() {
    setProcessingStep("Analyzing content with AI...");
    try {
      const res = await fetch(`/api/videos/${videoId}/analyze`, { method: "POST" });
      if (res.ok) {
        setProcessingStep("Analysis complete!");
        await fetchVideo();
      } else {
        setProcessingStep("Analysis failed. Please try again.");
      }
    } catch {
      setProcessingStep("Analysis failed. Please try again.");
    }
  }

  async function saveTitle() {
    const trimmed = titleValue.trim();
    if (!trimmed || trimmed === (video?.title || "")) {
      setEditingTitle(false);
      return;
    }
    setSavingTitle(true);
    try {
      const res = await fetch(`/api/videos/${videoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      if (res.ok) {
        setVideo((prev) => (prev ? { ...prev, title: trimmed } : prev));
      }
    } catch {
      console.error("Failed to save title");
    } finally {
      setSavingTitle(false);
      setEditingTitle(false);
    }
  }

  async function handleGenerateQuiz() {
    setProcessingStep("Generating quiz...");
    try {
      const res = await fetch(`/api/videos/${videoId}/quiz`, { method: "POST" });
      if (res.ok) {
        await fetchVideo();
        setActiveTab("quiz");
      }
    } catch {
      console.error("Quiz generation failed");
    } finally {
      setProcessingStep("");
    }
  }

  function parseJson<T>(json: string, fallback: T): T {
    try {
      return JSON.parse(json);
    } catch {
      return fallback;
    }
  }

  function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-(--bg) text-(--fg)">
        <p className="text-sm text-(--fg)/40">Loading video...</p>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-(--bg) text-(--fg)">
        <p className="text-sm text-(--fg)/40">Video not found</p>
      </div>
    );
  }

  const isProcessing = ["uploaded", "transcribing", "analyzing"].includes(video.status);
  const analysis = video.analysis;
  const keyPoints = analysis ? parseJson<string[]>(analysis.keyPoints, []) : [];
  const topics = analysis ? parseJson<string[]>(analysis.topics, []) : [];
  const chapters = analysis ? parseJson<{ time: string; title: string }[]>(analysis.chapters, []) : [];
  const importantMoments = analysis ? parseJson<string[]>(analysis.importantMoments, []) : [];
  const learningInsights = analysis ? parseJson<string[]>(analysis.learningInsights, []) : [];

  return (
    <div className="min-h-screen bg-(--bg) text-(--fg)">
      <header className="border-b border-(--border)">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-(--border-2) bg-(--surface-2) text-sm font-bold">
              V
            </div>
            <div>
              <div className="font-semibold tracking-tight">Videology</div>
              <div className="text-[9px] uppercase tracking-[0.2em] text-(--fg)/35">Analysis</div>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                if (confirm("Delete this video?")) {
                  fetch(`/api/videos/${videoId}`, { method: "DELETE" }).then(() => {
                    router.push("/dashboard");
                  });
                }
              }}
              className="text-sm text-(--fg)/30 transition hover:text-red-400"
            >
              Delete
            </button>
            <Link href="/dashboard" className="text-sm text-(--fg)/40 transition hover:text-(--fg)">
              ← Dashboard
            </Link>
            <ThemeDropdown />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        {/* Video title */}
        <div>
          {editingTitle ? (
            <div className="flex items-center gap-3">
              <input
                autoFocus
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveTitle();
                  if (e.key === "Escape") setEditingTitle(false);
                }}
                className="flex-1 rounded-xl border border-(--border-2) bg-(--surface-2) px-4 py-2 text-2xl font-semibold tracking-tight text-(--fg) outline-none focus:border-(--accent) sm:text-3xl"
                disabled={savingTitle}
              />
              {savingTitle && (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-(--accent) border-t-transparent" />
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {video.title || "Untitled Video"}
              </h1>
              <button
                onClick={() => {
                  setTitleValue(video.title || "");
                  setEditingTitle(true);
                }}
                className="rounded-lg px-2 py-1 text-xs text-(--fg)/25 transition hover:bg-(--surface-2) hover:text-(--fg)/50"
                title="Edit title"
              >
                ✎
              </button>
            </div>
          )}
          <p className="mt-2 text-sm text-(--fg)/35">
            {video.source} · {new Date(video.createdAt).toLocaleDateString()}
            {video.duration ? ` · ${formatDuration(video.duration)}` : ""}
          </p>
        </div>

        {/* Thumbnail */}
        {video.thumbnailUrl && (
          <div className="relative mt-6 aspect-video w-full overflow-hidden rounded-2xl border border-(--border)">
            <Image
              src={video.thumbnailUrl}
              alt={video.title || "Video thumbnail"}
              fill
              sizes="(max-width: 1280px) 100vw, 1280px"
              className="object-cover"
            />
          </div>
        )}

        {/* Processing status */}
        {isProcessing && (
          <div className="mt-6 rounded-2xl border border-(--accent)/20 bg-(--accent)/[0.06] p-6">
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#7c5cff] border-t-transparent" />
              <p className="text-sm text-(--accent-3)">{processingStep || `Status: ${video.status}...`}</p>
            </div>

            <div className="mt-4 flex gap-3">
              {["uploaded", "transcribing", "transcribed", "analyzing", "analyzed"].map((step, i) => {
                const steps = ["uploaded", "transcribing", "transcribed", "analyzing", "analyzed"];
                const currentIdx = steps.indexOf(video.status);
                const isDone = i <= currentIdx;
                return (
                  <div key={step} className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${isDone ? "bg-(--accent-2)" : "bg-(--btn)/10"}`} />
                    <span className={`text-[10px] ${isDone ? "text-(--accent-2)" : "text-(--fg)/25"}`}>
                      {step.charAt(0).toUpperCase() + step.slice(1)}
                    </span>
                    {i < 4 && <div className={`h-px w-4 ${isDone ? "bg-(--accent)/40" : "bg-(--btn)/10"}`} />}
                  </div>
                );
              })}
            </div>

            {processingStep.includes("failed") && (
              <div className="mt-4 flex gap-3">
                <button
                  onClick={runTranscription}
                  className="rounded-xl bg-(--btn) px-4 py-2 text-xs font-semibold text-(--btn-fg) transition hover:bg-(--btn-hover)"
                >
                  Retry Transcription
                </button>
                <button
                  onClick={runAnalysis}
                  className="rounded-xl border border-(--border-2) bg-(--surface-2) px-4 py-2 text-xs font-medium text-(--fg) transition hover:bg-(--surface-hover)"
                >
                  Retry Analysis
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="mt-8 flex gap-2 overflow-x-auto">
          {(["overview", "transcript", "chat", "quiz"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                activeTab === tab ? "bg-(--btn) text-(--btn-fg)" : "text-(--fg)/40 hover:text-(--fg) hover:bg-(--surface-2)"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {/* OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {analysis ? (
                <>
                  {/* Summary */}
                  <div className="rounded-2xl border border-(--border) bg-(--surface-1) p-6">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-(--accent-2)">Summary</h3>
                    <p className="mt-3 text-sm leading-7 text-(--fg)/70">{analysis.summary}</p>
                  </div>

                  {/* Key Points */}
                  <div className="rounded-2xl border border-(--border) bg-(--surface-1) p-6">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-(--accent-2)">Key Points</h3>
                    <ul className="mt-3 space-y-2">
                      {keyPoints.map((point, i) => (
                        <li key={i} className="flex gap-3 text-sm text-(--fg)/60">
                          <span className="shrink-0 text-(--accent-2)">•</span>
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* Topics */}
                    <div className="rounded-2xl border border-(--border) bg-(--surface-1) p-6">
                      <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-(--accent-2)">Topics</h3>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {topics.map((topic, i) => (
                          <span key={i} className="rounded-lg bg-(--surface-2) px-3 py-1.5 text-xs text-(--fg)/50">
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Chapters */}
                    <div className="rounded-2xl border border-(--border) bg-(--surface-1) p-6">
                      <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-(--accent-2)">Chapters</h3>
                      <div className="mt-3 space-y-2">
                        {chapters.map((ch, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <span className="font-mono text-xs text-(--accent-2)">{ch.time}</span>
                            <span className="text-sm text-(--fg)/60">{ch.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Important Moments */}
                  <div className="rounded-2xl border border-(--border) bg-(--surface-1) p-6">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-(--accent-2)">Important Moments</h3>
                    <ul className="mt-3 space-y-2">
                      {importantMoments.map((moment, i) => (
                        <li key={i} className="flex gap-3 text-sm text-(--fg)/60">
                          <span className="shrink-0 text-yellow-400">★</span>
                          {moment}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Learning Insights */}
                  <div className="rounded-2xl border border-(--border) bg-(--surface-1) p-6">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-(--accent-2)">Learning Insights</h3>
                    <ul className="mt-3 space-y-2">
                      {learningInsights.map((insight, i) => (
                        <li key={i} className="flex gap-3 text-sm text-(--fg)/60">
                          <span className="shrink-0 text-green-400">✓</span>
                          {insight}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* AI Thumbnails */}
                  <AiThumbnails videoId={videoId} hasTranscript={!!video.transcript} />
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-(--border-2) bg-(--surface-0) p-10 text-center">
                  <p className="text-sm text-(--fg)/35">
                    {isProcessing ? "Video is being processed..." : "Analysis not available yet."}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TRANSCRIPT */}
          {activeTab === "transcript" && (
            <div>
              {video.transcript ? (
                <TranscriptViewer text={video.transcript.text} segments={video.transcript.segments} />
              ) : (
                <div className="rounded-2xl border border-dashed border-(--border-2) bg-(--surface-0) p-10 text-center">
                  <p className="text-sm text-(--fg)/35">
                    {isProcessing ? "Transcription in progress..." : "No transcript available."}
                  </p>
                  {!isProcessing && (
                    <button
                      onClick={runTranscription}
                      className="mt-4 rounded-xl bg-(--btn) px-5 py-2.5 text-sm font-semibold text-(--btn-fg) transition hover:bg-(--btn-hover)"
                    >
                      Transcribe Now
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* CHAT */}
          {activeTab === "chat" && (
            <div>
              {video.transcript ? (
                <ChatInterface videoId={videoId} initialMessages={video.chatMessages} />
              ) : (
                <div className="rounded-2xl border border-dashed border-(--border-2) bg-(--surface-0) p-10 text-center">
                  <p className="text-sm text-(--fg)/35">
                    Transcribe the video first to enable AI chat.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* QUIZ */}
          {activeTab === "quiz" && (
            <div>
              {video.quizzes.length > 0 ? (
                <div className="space-y-6">
                  {/* New Quiz button */}
                  <div className="flex justify-end">
                    <button
                      onClick={handleGenerateQuiz}
                      disabled={!!processingStep}
                      className="rounded-xl border border-(--border-2) bg-(--surface-2) px-4 py-2 text-xs font-medium text-(--fg) transition hover:bg-(--surface-3)"
                    >
                      Generate New Quiz
                    </button>
                  </div>

                  {/* Show latest quiz */}
                  {video.quizzes.map((quiz) => (
                    <div key={quiz.id}>
                      <QuizInterface
                        videoId={videoId}
                        quizId={quiz.id}
                        title={quiz.title}
                        questionsJson={quiz.questions}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-(--border-2) bg-(--surface-0) p-10 text-center">
                  <p className="text-sm text-(--fg)/35">
                    {video.transcript
                      ? "Generate a quiz based on the video content."
                      : "Transcribe the video first to generate quizzes."}
                  </p>
                  {video.transcript && (
                    <button
                      onClick={handleGenerateQuiz}
                      disabled={!!processingStep}
                      className="mt-4 rounded-xl bg-(--btn) px-5 py-2.5 text-sm font-semibold text-(--btn-fg) transition hover:bg-(--btn-hover) disabled:opacity-50"
                    >
                      {processingStep ? "Generating..." : "Generate Quiz"}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
