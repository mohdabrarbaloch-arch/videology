import { processClipJob } from "../../lib/clip-job";

interface BackgroundEvent {
  body: string | null;
}

export default async function handler(event: BackgroundEvent) {
  const payload = JSON.parse(event.body || "{}") as { jobId?: string };
  if (!payload.jobId) {
    return { statusCode: 400, body: JSON.stringify({ error: "jobId is required" }) };
  }
  await processClipJob(payload.jobId);
  return { statusCode: 202 };
}

export const config = {
  background: true,
};
