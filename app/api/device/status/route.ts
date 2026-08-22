import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/security";

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const preview = process.env.APP_ENV !== "production";
  return NextResponse.json({ deviceLabel: preview ? "M5Stack（テスト表示）" : "M5Stack", lastSeenAt: preview ? new Date(Date.now() - 2 * 60 * 1000).toISOString() : null, apiStatus: "ok", preview }, { headers: { "cache-control": "no-store" } });
}
