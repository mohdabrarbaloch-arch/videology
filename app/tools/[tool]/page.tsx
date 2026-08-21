import Link from "next/link";
import { notFound } from "next/navigation";
import { getTool, TOOLS } from "@/lib/tool-config";
import ToolWorkbench from "@/components/ToolWorkbench";
import ThemeDropdown from "@/components/ThemeDropdown";

interface Props {
  params: Promise<{ tool: string }>;
}

export function generateStaticParams() {
  return TOOLS.map((tool) => ({ tool: tool.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { tool: slug } = await params;
  const tool = getTool(slug);
  return {
    title: tool ? `${tool.name} | Videology Tools` : "Tools | Videology",
    description: tool?.tagline,
  };
}

export default async function ToolPage({ params }: Props) {
  const { tool: slug } = await params;
  const tool = getTool(slug);
  if (!tool) notFound();

  return (
    <main className="min-h-screen bg-(--bg) text-(--fg)">
      <header className="border-b border-(--border)">
        <div className="mx-auto flex h-20 max-w-5xl items-center justify-between px-5 sm:px-8">
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
            <Link href="/tools" className="text-sm text-(--fg)/60 transition hover:text-(--fg)">
              ← All tools
            </Link>
            <ThemeDropdown />
          </div>
        </div>
      </header>

      <section className="relative mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-96 w-[600px] -translate-x-1/2 rounded-full bg-(--accent)/10 blur-[130px]" />

        <div className="mx-auto max-w-2xl text-center">
          <div
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-(--border-2) text-2xl"
            style={{ color: tool.accent, backgroundColor: `${tool.accent}12` }}
          >
            {tool.icon}
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
            {tool.name}
          </h1>
          <p className="mt-3 text-sm leading-6 text-(--fg)/60 sm:text-base">{tool.tagline}</p>
        </div>

        <div className="mx-auto mt-10 max-w-3xl">
          <ToolWorkbench tool={tool} />
        </div>
      </section>
    </main>
  );
}
