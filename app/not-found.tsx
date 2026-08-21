import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-(--bg) px-4">
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-(--accent)/10 blur-[130px]" />

      <div className="w-full max-w-md text-center">
        <div className="text-6xl font-bold text-(--fg)/10">404</div>
        <h1 className="mt-4 text-2xl font-semibold text-(--fg)">Page not found</h1>
        <p className="mt-3 text-sm leading-6 text-(--fg)/60">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex rounded-xl bg-(--btn) px-6 py-3 text-sm font-semibold text-(--btn-fg) transition hover:bg-(--btn-hover)"
        >
          Go home
        </Link>
      </div>
    </main>
  );
}
