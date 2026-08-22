import { NextRequest, NextResponse } from "next/server";
import { retryPreviewGrant } from "@/lib/preview-store";
import { isAuthenticated, requestIsSameOrigin } from "@/lib/security";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isAuthenticated(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!requestIsSameOrigin(request)) return NextResponse.json({ error: "invalid origin" }, { status: 403 });
  const { id } = await context.params;
  const grant = retryPreviewGrant(id);
  if (!grant) return NextResponse.json({ error: "failedの要求だけ再送できます" }, { status: 409 });
  return NextResponse.json({ grant }, { headers: { "cache-control": "no-store" } });
}
