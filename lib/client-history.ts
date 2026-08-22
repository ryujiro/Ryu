import type { TimeGrant } from "./types";

const STORAGE_KEY = "game-time-grants:v1";
export function loadHistory(): TimeGrant[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TimeGrant[];
    return Array.isArray(parsed) ? parsed.slice(0, 50) : [];
  } catch { return []; }
}
export function saveGrant(grant: TimeGrant) {
  const next = [grant, ...loadHistory().filter((item) => item.id !== grant.id)].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 50);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
export function previewProgress(grant: TimeGrant): TimeGrant {
  if (grant.status === "failed") return grant;
  const elapsed = Date.now() - new Date(grant.createdAt).getTime();
  if (elapsed < 2500) return { ...grant, status: "pending" };
  if (elapsed < 5200) return { ...grant, status: "sending", attempts: Math.max(1, grant.attempts) };
  const actual = Math.min(grant.seconds, 86400 - 6000);
  const remaining = 6000 + actual;
  return { ...grant, status: "acknowledged", attempts: Math.max(1, grant.attempts), responseText: `OK remaining=${remaining} added=${actual}`, remainingSeconds: remaining, actualAddedSeconds: actual, updatedAt: new Date().toISOString() };
}
