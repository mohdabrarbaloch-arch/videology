import { processVideoJob } from "../../lib/video-job";

interface BackgroundEvent {
  body: string | null;
}

export default async function handler(event: BackgroundEvent) {
  const payload = JSON.parse(event.body || "{}") as { videoId?: string };
  if (!payload.videoId) {
    return { statusCode: 400, body: JSON.stringify({ error: "videoId is required" }) };
  }
  await processVideoJob(payload.videoId);
  return { statusCode: 202 };
}

export const config = {
  background: true,
};
