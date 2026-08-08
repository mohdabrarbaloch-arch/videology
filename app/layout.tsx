import type { Metadata } from "next";
import { ThemeProvider } from "@/components/ThemeProvider";
import ThreeBackground from "@/components/ThreeBackground";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Videology — Watch. Analyze. Learn.",
    template: "%s | Videology",
  },
  description:
    "Transform videos into searchable knowledge with AI-powered transcription, analysis, thumbnails, quizzes, translations, and intelligent video Q&A.",
  applicationName: "Videology",
  authors: [{ name: "Abrar Baloch" }],
  creator: "Abrar Baloch",
  keywords: [
    "AI video analysis",
    "video transcription",
    "AI video assistant",
    "video summarizer",
    "AI thumbnails",
    "video quiz",
    "video learning",
    "Videology",
  ],
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>
          <ThreeBackground />
          <div className="relative z-10">{children}</div>
        </ThemeProvider>
      </body>
    </html>
  );
}
