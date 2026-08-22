import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export const SESSION_COOKIE = "game_time_parent_session";
const SESSION_SECONDS = 12 * 60 * 60;
const PREVIEW_PIN = "1234";
const PREVIEW_SECRET = "preview-only-session-key-not-for-production";

function isPreview() { return process.env.APP_ENV !== "production"; }
function sessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (secret) return secret;
  if (isPreview()) return PREVIEW_SECRET;
  throw new Error("SESSION_SECRET is required in production");
}
function signature(payload: string) { return createHmac("sha256", sessionSecret()).update(payload).digest("base64url"); }

export function createSessionCookieValue() {
  const payload = Buffer.from(JSON.stringify({ sub: "parent", exp: Date.now() + SESSION_SECONDS * 1000 })).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function verifySessionCookie(value: string | undefined): boolean {
  if (!value) return false;
  const [payload, supplied] = value.split(".");
  if (!payload || !supplied) return false;
  const a = Buffer.from(supplied);
  const b = Buffer.from(signature(payload));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { sub?: string; exp?: number };
    return parsed.sub === "parent" && typeof parsed.exp === "number" && parsed.exp > Date.now();
  } catch { return false; }
}

export function isAuthenticated(request: NextRequest) { return verifySessionCookie(request.cookies.get(SESSION_COOKIE)?.value); }

export function verifyParentPin(pin: string): boolean {
  const configured = process.env.PARENT_PIN_HASH;
  if (!configured) return isPreview() && pin === PREVIEW_PIN;
  const [algorithm, salt, expectedHex] = configured.split("$");
  if (algorithm !== "scrypt" || !salt || !expectedHex) return false;
  const actual = scryptSync(pin, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function requestIsSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return origin === `${proto}://${host}`;
}

const buckets = new Map<string, { count: number; resetAt: number }>();
export function allowRate(key: string, limit: number, windowMs = 60_000) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) { buckets.set(key, { count: 1, resetAt: now + windowMs }); return true; }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

export const sessionCookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: SESSION_SECONDS };
