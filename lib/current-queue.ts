import { z } from "zod";

const queueResponseSchema = z.object({ id: z.string(), sendId: z.string(), status: z.enum(["pending", "sending", "acknowledged", "failed"]) }).passthrough();
type QueueRequest = { id: string; sendId: string; sessionId: string; seconds: number };

export async function enqueueCurrentQueue(payload: QueueRequest) {
  if (process.env.APP_ENV !== "production" || process.env.CURRENT_QUEUE_REAL_SEND !== "true") throw new Error("Real queue sending is disabled outside production");
  const base = process.env.CURRENT_QUEUE_API_BASE_URL;
  const authorization = process.env.CURRENT_SITES_AUTHORIZATION;
  if (!base || !authorization) throw new Error("Current queue server configuration is incomplete");
  const response = await fetch(`${base.replace(/\/$/, "")}/transfers`, {
    method: "POST", headers: { "content-type": "application/json", authorization }, body: JSON.stringify(payload), cache: "no-store", signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error(`Current queue returned HTTP ${response.status}`);
  return queueResponseSchema.parse(await response.json());
}
