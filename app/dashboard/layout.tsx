import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "Your Videology workspace — manage analyzed videos, transcripts, and insights.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
