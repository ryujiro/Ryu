import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/security";

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) return NextResponse.json({ authenticated: false }, { status: 401, headers: { "cache-control": "no-store" } });
  return NextResponse.json({ authenticated: true }, { headers: { "cache-control": "no-store" } });
}
