"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-(--bg) px-4">
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-red-500/10 blur-[130px]" />

      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-red-400/20 bg-red-400/10 text-2xl">
          !
        </div>
        <h1 className="mt-6 text-2xl font-semibold text-(--fg)">Something went wrong</h1>
        <p className="mt-3 text-sm leading-6 text-(--fg)/45">
          An unexpected error occurred. Please try again.
        </p>
        <button
          onClick={reset}
          className="mt-8 rounded-xl bg-(--btn) px-6 py-3 text-sm font-semibold text-(--btn-fg) transition hover:bg-(--btn-hover)"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
