import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ status: "ok", environment: process.env.APP_ENV ?? "preview", realQueueEnabled: process.env.APP_ENV === "production" && process.env.CURRENT_QUEUE_REAL_SEND === "true" }, { headers: { "cache-control": "no-store" } });
}
