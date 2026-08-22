import { NextRequest, NextResponse } from "next/server";
import { retryPreviewGrant } from "@/lib/preview-store";
import { isAuthenticated, requestIsSameOrigin } from "@/lib/security";
import { enqueueCurrentQueue } from "@/lib/current-queue";
import { z } from "zod";

const retrySchema = z.object({ requestId: z.uuid(), sendId: z.uuid(), minutes: z.number().int().min(1).max(1440) });

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isAuthenticated(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!requestIsSameOrigin(request)) return NextResponse.json({ error: "invalid origin" }, { status: 403 });
  const { id } = await context.params;
  if (process.env.APP_ENV === "production") {
    const parsed = retrySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "invalid retry" }, { status: 400 });
    const { requestId, sendId, minutes } = parsed.data;
    try {
      const result = await enqueueCurrentQueue({ id, sendId, sessionId: `manual:${requestId}`, seconds: minutes * 60 });
      const now = new Date().toISOString();
      return NextResponse.json({ grant: { id: result.id, requestId, sendId: result.sendId, transferId: result.id, sessionId: `manual:${requestId}`, minutes, seconds: minutes * 60, status: result.status, responseText: result.responseText, remainingSeconds: result.remainingSeconds, actualAddedSeconds: result.actualAddedSeconds, attempts: result.attempts, createdAt: now, updatedAt: now, source: "manual" } }, { headers: { "cache-control": "no-store" } });
    } catch { return NextResponse.json({ error: "retry failed" }, { status: 502 }); }
  }
  const grant = retryPreviewGrant(id);
  if (!grant) return NextResponse.json({ error: "failedの要求だけ再送できます" }, { status: 409 });
  return NextResponse.json({ grant }, { headers: { "cache-control": "no-store" } });
}
