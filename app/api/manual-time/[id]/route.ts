import { NextRequest, NextResponse } from "next/server";
import { getPreviewGrant } from "@/lib/preview-store";
import { isAuthenticated } from "@/lib/security";
import { getCurrentQueueStatus } from "@/lib/current-queue";
import type { TimeGrant } from "@/lib/types";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isAuthenticated(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await context.params;
  if (process.env.APP_ENV === "production") {
    const sendId = request.nextUrl.searchParams.get("sendId");
    const requestId = request.nextUrl.searchParams.get("requestId");
    const minutes = Number(request.nextUrl.searchParams.get("minutes"));
    const createdAt = request.nextUrl.searchParams.get("createdAt") ?? new Date().toISOString();
    if (!sendId || !requestId || !Number.isInteger(minutes) || minutes < 1 || minutes > 1440) return NextResponse.json({ error: "invalid status request" }, { status: 400 });
    try {
      const result = await getCurrentQueueStatus(sendId, id);
      const grant: TimeGrant = {
        id: result.id, requestId, sendId: result.sendId, transferId: result.id,
        sessionId: `manual:${requestId}`, minutes, seconds: minutes * 60,
        status: result.status, responseText: result.responseText,
        remainingSeconds: result.remainingSeconds, actualAddedSeconds: result.actualAddedSeconds,
        attempts: result.attempts, createdAt, updatedAt: new Date().toISOString(), source: "manual",
      };
      return NextResponse.json({ grant }, { headers: { "cache-control": "no-store" } });
    } catch { return NextResponse.json({ error: "status unavailable" }, { status: 502 }); }
  }
  const grant = getPreviewGrant(id);
  if (!grant) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ grant }, { headers: { "cache-control": "no-store" } });
}
