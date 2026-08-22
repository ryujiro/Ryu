import { createHmac } from "node:crypto";
import type { GrantStatus } from "./types";

type QueueRequest = { id: string; sendId: string; sessionId: string; seconds: number };
export type QueueResult = {
  id: string;
  sendId: string;
  status: GrantStatus;
  responseText: string | null;
  remainingSeconds: number | null;
  actualAddedSeconds: number | null;
  attempts: number;
};

function config() {
  if (process.env.APP_ENV !== "production" || process.env.CURRENT_QUEUE_REAL_SEND !== "true") throw new Error("Real queue sending is disabled outside production");
  const base = process.env.CURRENT_QUEUE_API_BASE_URL;
  const authorization = process.env.CURRENT_SITES_AUTHORIZATION;
  if (!base || !authorization) throw new Error("Current queue server configuration is incomplete");
  return { base: base.replace(/\/$/, ""), authorization };
}

function headers(authorization: string) {
  return { "content-type": "application/json", authorization, "OAI-Sites-Authorization": authorization };
}
function text(value: unknown, max = 500) { return typeof value === "string" ? value.slice(0, max) : null; }
function integer(value: unknown) { return Number.isInteger(value) ? value as number : null; }
function status(value: unknown): GrantStatus { return value === "sending" || value === "acknowledged" || value === "failed" ? value : "pending"; }
function normalize(raw: unknown, fallback: { id: string; sendId: string }): QueueResult {
  const root = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const nested = root.transfer && typeof root.transfer === "object" ? root.transfer as Record<string, unknown>
    : root.result && typeof root.result === "object" ? root.result as Record<string, unknown> : root;
  return {
    id: text(nested.id) ?? fallback.id,
    sendId: text(nested.sendId ?? nested.send_id) ?? fallback.sendId,
    status: status(nested.status),
    responseText: text(nested.responseText ?? nested.response_text ?? nested.message),
    remainingSeconds: integer(nested.remainingSeconds ?? nested.remaining_seconds),
    actualAddedSeconds: integer(nested.actualAddedSeconds ?? nested.actual_added_seconds),
    attempts: integer(nested.attempts) ?? 0,
  };
}

export function stableQueueUuid(kind: "transfer" | "send", requestId: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is required");
  const hex = createHmac("sha256", secret).update(`${kind}:${requestId}`).digest("hex").slice(0, 32).split("");
  hex[12] = "5";
  hex[16] = "8";
  const value = hex.join("");
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

export async function enqueueCurrentQueue(payload: QueueRequest) {
  const { base, authorization } = config();
  const response = await fetch(`${base}/transfers`, {
    method: "POST", headers: headers(authorization), body: JSON.stringify(payload), cache: "no-store", signal: AbortSignal.timeout(12_000)
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok && response.status !== 409) throw new Error(`Current queue returned HTTP ${response.status}`);
  return normalize(body, payload);
}

export async function getCurrentQueueStatus(sendId: string, fallbackId: string) {
  const { base, authorization } = config();
  const response = await fetch(`${base}/transfers?sendId=${encodeURIComponent(sendId)}`, {
    method: "GET", headers: headers(authorization), cache: "no-store", signal: AbortSignal.timeout(12_000)
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Current queue status returned HTTP ${response.status}`);
  return normalize(body, { id: fallbackId, sendId });
}
