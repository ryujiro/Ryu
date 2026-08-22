import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/security";

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ deviceLabel: "M5Stack（テスト表示）", lastSeenAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(), apiStatus: "ok", preview: true }, { headers: { "cache-control": "no-store" } });
}
