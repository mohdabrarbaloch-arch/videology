import Link from "next/link";
import ThemeDropdown from "@/components/ThemeDropdown";
import { TOOLS } from "@/lib/tool-config";

export const metadata = {
  title: "Free Video & Audio Tools",
  description:
    "Free video and audio tools — cutter, cropper, compressor, MP3 converter, YouTube downloader, subtitle remover, and more.",
};

export default function ToolsPage() {
  const categories = ["Editing", "Audio", "Download"] as const;

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
              <div className="text-[9px] uppercase tracking-[0.2em] text-(--fg)/35">Free Tools</div>
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

      <section className="relative mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-16">
        <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-96 w-[700px] -translate-x-1/2 rounded-full bg-(--accent)/10 blur-[130px]" />

        <div className="max-w-2xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-(--border-2) bg-(--surface-2) px-3 py-1.5 text-[11px] text-(--fg)/50">
            <span className="h-1.5 w-1.5 rounded-full bg-(--accent-2)" />
            10 tools · free forever
          </div>

          <h1 className="text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">
            Video & audio tools.
          </h1>

          <p className="mt-4 max-w-xl text-sm leading-6 text-(--fg)/40 sm:text-base">
            Cut, crop, compress, convert, download, and clean up media — all in your browser, no watermark.
          </p>
        </div>

        {categories.map((category) => (
          <section key={category} className="mt-12">
            <h2 className="mb-5 text-[10px] font-semibold uppercase tracking-[0.22em] text-(--fg)/25">
              {category}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {TOOLS.filter((tool) => tool.category === category).map((tool) => (
                <Link
                  key={tool.slug}
                  href={`/tools/${tool.slug}`}
                  className="group relative overflow-hidden rounded-2xl border border-(--border) bg-(--surface-1) p-5 transition hover:border-(--border-3) hover:bg-(--surface-2)"
                >
                  <div
                    className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full opacity-[0.12] blur-2xl transition group-hover:opacity-25"
                    style={{ backgroundColor: tool.accent }}
                  />
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-(--border-2) text-lg"
                    style={{ color: tool.accent, backgroundColor: `${tool.accent}12` }}
                  >
                    {tool.icon}
                  </div>
                  <h3 className="mt-4 font-semibold tracking-tight">{tool.name}</h3>
                  <p className="mt-1.5 text-xs leading-5 text-(--fg)/40">{tool.tagline}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-(--fg)/35 transition group-hover:text-(--fg)">
                    Open tool
                    <span className="transition group-hover:translate-x-0.5">→</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </section>
    </main>
  );
}
