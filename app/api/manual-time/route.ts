import { NextRequest, NextResponse } from "next/server";
import { createPreviewGrant } from "@/lib/preview-store";
import { allowRate, isAuthenticated, requestIsSameOrigin } from "@/lib/security";
import { manualTimeInputSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!requestIsSameOrigin(request)) return NextResponse.json({ error: "invalid origin" }, { status: 403 });
  const ip = request.headers.get("x-nf-client-connection-ip") ?? request.headers.get("x-forwarded-for") ?? "unknown";
  if (!allowRate(`grant:${ip}`, 6)) return NextResponse.json({ error: "しばらく待ってからお試しください" }, { status: 429 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "入力を確認してください" }, { status: 400 }); }
  const parsed = manualTimeInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "1～1,440の整数を入力してください" }, { status: 400 });
  if (process.env.APP_ENV === "production") return NextResponse.json({ error: "Production database is not configured" }, { status: 503 });
  return NextResponse.json({ grant: createPreviewGrant(parsed.data.requestId, parsed.data.minutes) }, { status: 201, headers: { "cache-control": "no-store" } });
}

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ grants: [], preview: true }, { headers: { "cache-control": "no-store" } });
}
