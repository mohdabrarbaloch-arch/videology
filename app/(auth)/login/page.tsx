"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-(--bg) px-4">
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-(--accent)/10 blur-[130px]" />

      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-(--border-2) bg-(--surface-2) text-sm font-bold text-(--fg)">
              V
            </div>
            <div>
              <div className="text-lg font-semibold tracking-tight text-(--fg)">Videology</div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-(--fg)/60">Watch · Analyze · Learn</div>
            </div>
          </Link>
        </div>

        <div className="rounded-3xl border border-(--border) bg-(--surface-1) p-8">
          <h1 className="text-2xl font-semibold tracking-tight text-(--fg)">Welcome back</h1>
          <p className="mt-2 text-sm text-(--fg)/60">Sign in to your account</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-(--fg)/75">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                placeholder="you@example.com"
                required
                className="w-full rounded-xl border border-(--border-2) bg-(--input-bg) px-4 py-3.5 text-sm text-(--fg) outline-none placeholder:text-(--fg)/35 transition focus:border-(--accent)/60 focus:ring-2 focus:ring-(--accent)/10"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-(--fg)/75">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder="••••••••"
                required
                className="w-full rounded-xl border border-(--border-2) bg-(--input-bg) px-4 py-3.5 text-sm text-(--fg) outline-none placeholder:text-(--fg)/35 transition focus:border-(--accent)/60 focus:ring-2 focus:ring-(--accent)/10"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-(--btn) px-6 py-3.5 text-sm font-semibold text-(--btn-fg) transition hover:bg-(--btn-hover) disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-(--fg)/60">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-medium text-(--accent-2) transition hover:text-(--accent-3)">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
