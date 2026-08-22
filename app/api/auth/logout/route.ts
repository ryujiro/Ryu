import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated, requestIsSameOrigin, SESSION_COOKIE, sessionCookieOptions } from "@/lib/security";

export async function POST(request: NextRequest) {
  if (!isAuthenticated(request) || !requestIsSameOrigin(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
  return response;
}
