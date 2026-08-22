import { NextRequest, NextResponse } from "next/server";
import { createPreviewGrant } from "@/lib/preview-store";
import { allowRate, requestIsSameOrigin } from "@/lib/security";
import { manualTimeInputSchema } from "@/lib/validation";
import { enqueueCurrentQueue, getCurrentQueueStatus, stableQueueUuid } from "@/lib/current-queue";
import type { TimeGrant } from "@/lib/types";

export async function POST(request: NextRequest) {
  if (!requestIsSameOrigin(request)) return NextResponse.json({ error: "invalid origin" }, { status: 403 });
  const ip = request.headers.get("x-nf-client-connection-ip") ?? request.headers.get("x-forwarded-for") ?? "unknown";
  if (!allowRate(`grant:${ip}`, 6)) return NextResponse.json({ error: "しばらく待ってからお試しください" }, { status: 429 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "入力を確認してください" }, { status: 400 }); }
  const parsed = manualTimeInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "1～1,440の整数を入力してください" }, { status: 400 });
  if (process.env.APP_ENV === "production") {
    const { requestId, minutes } = parsed.data;
    const id = stableQueueUuid("transfer", requestId);
    const sendId = stableQueueUuid("send", requestId);
    const seconds = minutes * 60;
    const createdAt = new Date().toISOString();
    let result;
    try {
      result = await enqueueCurrentQueue({ id, sendId, sessionId: `manual:${requestId}`, seconds });
    } catch {
      try { result = await getCurrentQueueStatus(sendId, id); }
      catch { result = { id, sendId, status: "failed" as const, responseText: "送信キューへ登録できませんでした", remainingSeconds: null, actualAddedSeconds: null, attempts: 0 }; }
    }
    const grant: TimeGrant = {
      id: result.id, requestId, sendId: result.sendId, transferId: result.id,
      sessionId: `manual:${requestId}`, minutes, seconds, status: result.status,
      responseText: result.responseText, remainingSeconds: result.remainingSeconds,
      actualAddedSeconds: result.actualAddedSeconds, attempts: result.attempts,
      createdAt, updatedAt: createdAt, source: "manual",
    };
    return NextResponse.json({ grant }, { status: 201, headers: { "cache-control": "no-store" } });
  }
  return NextResponse.json({ grant: createPreviewGrant(parsed.data.requestId, parsed.data.minutes) }, { status: 201, headers: { "cache-control": "no-store" } });
}

export async function GET() {
  return NextResponse.json({ grants: [], preview: true }, { headers: { "cache-control": "no-store" } });
}
