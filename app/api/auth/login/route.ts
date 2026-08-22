import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { allowRate, createSessionCookieValue, requestIsSameOrigin, SESSION_COOKIE, sessionCookieOptions, verifyParentPin } from "@/lib/security";

const bodySchema = z.object({ pin: z.string().min(1).max(64) });
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-nf-client-connection-ip") ?? request.headers.get("x-forwarded-for") ?? "unknown";
  if (!requestIsSameOrigin(request) || !allowRate(`login:${ip}`, 6)) return NextResponse.json({ error: "ログインできません" }, { status: 429 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "パスコードを確認してください" }, { status: 400 }); }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success || !verifyParentPin(parsed.data.pin)) return NextResponse.json({ error: "パスコードを確認してください" }, { status: 401 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, createSessionCookieValue(), sessionCookieOptions);
  response.headers.set("cache-control", "no-store");
  return response;
}
