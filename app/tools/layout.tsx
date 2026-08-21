import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free Tools",
  description:
    "Free video processing tools — convert, compress, extract audio, generate thumbnails, and more.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
