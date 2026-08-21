import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Clip Studio",
  description:
    "Create viral short-form clips from any video with AI-powered selection and karaoke captions.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
