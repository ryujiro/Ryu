import { randomUUID } from "node:crypto";
import type { TimeGrant } from "./types";
import { minutesToSeconds } from "./validation";

const byRequest = new Map<string, TimeGrant>();
const byId = new Map<string, TimeGrant>();

export function createPreviewGrant(requestId: string, minutes: number): TimeGrant {
  const existing = byRequest.get(requestId);
  if (existing) return currentPreviewGrant(existing);
  const now = new Date().toISOString();
  const id = randomUUID();
  const grant: TimeGrant = {
    id, requestId, sendId: randomUUID(), transferId: randomUUID(), sessionId: `manual:${requestId}`,
    minutes, seconds: minutesToSeconds(minutes), status: "pending", responseText: null,
    remainingSeconds: null, actualAddedSeconds: null, attempts: 0, createdAt: now, updatedAt: now, source: "manual"
  };
  byRequest.set(requestId, grant); byId.set(id, grant); return grant;
}

export function getPreviewGrant(id: string) { const grant = byId.get(id); return grant ? currentPreviewGrant(grant) : null; }
export function retryPreviewGrant(id: string) {
  const grant = byId.get(id);
  if (!grant || grant.status !== "failed") return null;
  grant.status = "pending"; grant.updatedAt = new Date().toISOString(); grant.attempts += 1; return grant;
}

function currentPreviewGrant(grant: TimeGrant): TimeGrant {
  const elapsed = Date.now() - new Date(grant.createdAt).getTime();
  if (elapsed < 2500) return { ...grant, status: "pending" };
  if (elapsed < 5200) return { ...grant, status: "sending", attempts: Math.max(1, grant.attempts) };
  const before = 6000;
  const actual = Math.min(grant.seconds, 86400 - before);
  const remaining = before + actual;
  return { ...grant, status: "acknowledged", attempts: Math.max(1, grant.attempts), responseText: `OK remaining=${remaining} added=${actual}`, remainingSeconds: remaining, actualAddedSeconds: actual, updatedAt: new Date().toISOString() };
}
