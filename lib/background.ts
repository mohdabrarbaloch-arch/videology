// Platform-agnostic background job trigger. Netlify uses its 15-minute
// background functions; Vercel uses an internal route with `after()`.
// Local dev runs jobs in-process (see the generate/videos routes).

const IS_NETLIFY = Boolean(process.env.NETLIFY);
const IS_VERCEL = Boolean(process.env.VERCEL);

export function backgroundBaseUrl(): string {
  return process.env.URL || process.env.DEPLOY_URL || "http://localhost:8888";
}

export async function triggerBackgroundFunction(
  name: string,
  payload: Record<string, unknown>
): Promise<void> {
  if (IS_VERCEL) {
    const base = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";
    await fetch(`${base}/api/jobs/${name}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }).catch((err) => console.error(`Failed to trigger ${name}:`, err));
    return;
  }

  if (IS_NETLIFY) {
    await fetch(`${backgroundBaseUrl()}/.netlify/functions/${name}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }).catch((err) => console.error(`Failed to trigger ${name}:`, err));
    return;
  }

  console.warn(`No background platform detected; job ${name} not triggered.`);
}
