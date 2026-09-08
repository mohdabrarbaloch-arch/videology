import Link from "next/link";
import type { Metadata } from "next";
import { TOOLS } from "@/lib/tool-config";
import ThemeDropdown from "@/components/ThemeDropdown";

export const metadata: Metadata = {
  title: "Free Tools",
  description:
    "Free video processing tools — trim, crop, compress, extract audio, generate thumbnails, and more.",
};

export default function ToolsPage() {
  const categories = Array.from(new Set(TOOLS.map((t) => t.category)));

  return (
    <main className="min-h-screen bg-(--bg) text-(--fg)">
      <header className="border-b border-(--border)">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-(--border-2) bg-(--surface-2) text-sm font-bold">
              V
            </div>
            <div>
              <div className="font-semibold tracking-tight">Videology</div>
              <div className="text-[9px] uppercase tracking-[0.2em] text-(--fg)/55">Tools</div>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-(--fg)/60 transition hover:text-(--fg)">
              ← Back to dashboard
            </Link>
            <ThemeDropdown />
          </div>
        </div>
      </header>

      <section className="relative mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-96 w-[600px] -translate-x-1/2 rounded-full bg-(--accent)/10 blur-[130px]" />

        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-(--fg)/50">
            Free video & audio tools
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
            Everything you need to edit media
          </h1>
          <p className="mt-3 text-sm leading-6 text-(--fg)/60 sm:text-base">
            No upload limits, no watermarks. Processing runs directly in the cloud and your files are ready to download.
          </p>
        </div>

        {categories.map((category) => (
          <section key={category} className="mt-12">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-(--fg)/50">{category}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {TOOLS.filter((t) => t.category === category).map((tool) => (
                <Link
                  key={tool.slug}
                  href={`/tools/${tool.slug}`}
                  className="group rounded-2xl border border-(--border) bg-(--surface-1) p-5 transition hover:border-(--border-2) hover:bg-(--surface-2)"
                >
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-(--border-2) text-xl"
                    style={{ color: tool.accent, backgroundColor: `${tool.accent}12` }}
                  >
                    {tool.icon}
                  </div>
                  <h3 className="mt-4 font-semibold tracking-tight">{tool.name}</h3>
                  <p className="mt-1.5 text-sm leading-5 text-(--fg)/55">{tool.tagline}</p>
                  <p className="mt-3 text-[11px] text-(--fg)/40">
                    {tool.hint}
                    <span className="ml-1.5 text-(--accent-2) transition group-hover:ml-2">→</span>
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </section>
    </main>
  );
}