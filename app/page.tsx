import Link from "next/link";
import ThemeDropdown from "@/components/ThemeDropdown";

const features = [
  {
    title: "Smart Transcription",
    description:
      "Turn spoken content into searchable, timestamped text with multilingual speech recognition.",
    icon: "01",
  },
  {
    title: "Deep Video Analysis",
    description:
      "Extract summaries, key points, topics, chapters, important moments, and learning insights.",
    icon: "02",
  },
  {
    title: "AI Video Chat",
    description:
      "Ask questions about the actual video and get contextual answers grounded in its content.",
    icon: "03",
  },
  {
    title: "AI Thumbnails",
    description:
      "Create multiple AI-powered thumbnail concepts from the video's strongest ideas.",
    icon: "04",
  },
  {
    title: "Learn & Quiz",
    description:
      "Generate quizzes, learning outcomes, revision notes, and actionable takeaways.",
    icon: "05",
  },
  {
    title: "Translate",
    description:
      "Convert transcripts and subtitles into multiple languages while preserving timestamps.",
    icon: "06",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden">
      {/* Navigation */}
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-(--border-2) bg-(--surface-2) text-sm font-bold text-(--fg) shadow-[0_0_30px_var(--accent-glow)]">
            V
          </div>

          <div>
            <div className="text-lg font-semibold tracking-tight text-(--fg)">
              Videology
            </div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-(--fg)/40">
              Watch · Analyze · Learn
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-(--fg)/55 lg:flex">
          <a className="transition hover:text-(--fg)" href="#features">
            Features
          </a>
          <a className="transition hover:text-(--fg)" href="#how-it-works">
            How it works
          </a>
        </nav>

        <div className="flex items-center gap-2.5">
          <Link
            href="/analyze"
            className="hidden rounded-xl bg-(--btn) px-4 py-2.5 text-sm font-semibold text-(--btn-fg) shadow-[0_0_24px_var(--accent-glow)] transition hover:opacity-90 active:scale-95 sm:block"
          >
            Analyze video
          </Link>
          <Link
            href="/tools"
            className="hidden rounded-xl border border-(--border-2) bg-(--surface-2) px-4 py-2.5 text-sm font-medium text-(--fg) transition hover:border-(--border-3) hover:bg-(--surface-hover) md:block"
          >
            Free Tools
          </Link>
          <Link
            href="/clips"
            className="hidden rounded-xl border border-(--border-2) bg-(--surface-2) px-4 py-2.5 text-sm font-medium text-(--fg) transition hover:border-(--border-3) hover:bg-(--surface-hover) md:block"
          >
            Clip Studio
          </Link>
          <Link
            href="/dashboard"
            className="rounded-xl border border-(--border-2) bg-(--surface-3) px-4 py-2.5 text-sm font-medium text-(--fg) transition hover:border-(--border-3) hover:bg-(--surface-hover)"
          >
            Open Dashboard
          </Link>
          <ThemeDropdown />
        </div>
      </header>

      {/* Hero */}
      <section className="relative mx-auto flex min-h-[720px] max-w-7xl items-center px-6 pb-24 pt-20 lg:px-8">
        <div className="pointer-events-none absolute left-1/2 top-10 -z-10 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-(--accent)/10 blur-[130px]" />

        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-(--border-2) bg-(--surface-2) px-4 py-2 text-xs font-medium text-(--fg)/60">
            <span className="h-1.5 w-1.5 rounded-full bg-(--accent-2) shadow-[0_0_12px_var(--accent)]" />
            AI-powered video intelligence
          </div>

          <h1 className="text-5xl font-semibold leading-[1.05] tracking-[-0.045em] text-(--fg) sm:text-6xl lg:text-8xl">
            Your videos.
            <br />
            <span className="bg-gradient-to-r from-(--fg) via-(--accent-3) to-(--accent) bg-clip-text text-transparent">
              Understood.
            </span>
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-(--fg)/50 sm:text-lg">
            Videology transforms videos into searchable knowledge with AI
            transcription, analysis, translation, intelligent Q&A, quizzes,
            learning insights, and generated thumbnails.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/dashboard"
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-(--btn) px-6 py-3.5 text-sm font-semibold text-(--btn-fg) transition hover:bg-(--btn-hover) sm:w-auto"
            >
              Analyze a video
              <span className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </Link>

            <a
              href="#features"
              className="w-full rounded-xl border border-(--border-2) bg-(--surface-2) px-6 py-3.5 text-sm font-medium text-(--fg)/75 transition hover:bg-(--surface-3) sm:w-auto"
            >
              Explore features
            </a>

            <Link
              href="/clips"
              className="w-full rounded-xl border border-(--border-2) bg-(--surface-3) px-6 py-3.5 text-sm font-medium text-(--fg) transition hover:border-(--border-3) hover:bg-(--surface-hover) sm:w-auto"
            >
              ✂ Make viral clips
            </Link>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-xs text-(--fg)/35">
            <span>● YouTube URLs</span>
            <span>● Direct video URLs</span>
            <span>● Video uploads</span>
            <span>● Multilingual</span>
          </div>
        </div>
      </section>

      {/* Feature section */}
      <section
        id="features"
        className="border-t border-(--border) bg-(--surface-0)"
      >
        <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-(--accent-2)">
              One video. Many possibilities.
            </p>

            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-(--fg) sm:text-4xl">
              Everything you need to understand and learn from video.
            </h2>

            <p className="mt-4 leading-7 text-(--fg)/45">
              A single workspace for turning long-form video content into
              structured, useful knowledge.
            </p>
          </div>

          <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-(--border) bg-(--surface-3) sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.icon}
                className="group bg-(--bg-3) p-7 transition hover:bg-(--surface-hover)"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium tracking-widest text-(--fg)/25">
                    {feature.icon}
                  </span>

                  <div className="h-2 w-2 rounded-full bg-(--btn)/10 transition group-hover:bg-(--accent-2) group-hover:shadow-[0_0_12px_var(--accent)]" />
                </div>

                <h3 className="mt-12 text-lg font-semibold text-(--fg)">
                  {feature.title}
                </h3>

                <p className="mt-3 text-sm leading-6 text-(--fg)/40">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
        <div className="rounded-3xl border border-(--border) bg-(--surface-1) p-8 sm:p-12">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-(--accent-2)">
              How it works
            </p>

            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-(--fg)">
              From video to knowledge in one workflow.
            </h2>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-4">
            {[
              ["01", "Add your video", "Upload a file or provide a supported video URL."],
              ["02", "Process", "Videology transcribes and analyzes the real content."],
              ["03", "Understand", "Explore summaries, chapters, topics, and key moments."],
              ["04", "Learn", "Ask questions, generate quizzes, and review what you learned."],
            ].map(([number, title, description]) => (
              <div key={number}>
                <div className="text-xs font-semibold text-(--accent-2)">
                  {number}
                </div>

                <h3 className="mt-4 font-semibold text-(--fg)">{title}</h3>

                <p className="mt-2 text-sm leading-6 text-(--fg)/40">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-(--border)">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-8 text-sm text-(--fg)/35 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <span>© {new Date().getFullYear()} Videology</span>
          <span>Created by Abrar Baloch</span>
        </div>
      </footer>
    </main>
  );
}