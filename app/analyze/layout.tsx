import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analyze Video",
  description:
    "Upload or paste a URL to analyze a video with AI transcription, analysis, and learning tools.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
