import { NextRequest, NextResponse } from "next/server";
import { getPreviewGrant } from "@/lib/preview-store";
import { isAuthenticated } from "@/lib/security";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isAuthenticated(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const grant = getPreviewGrant(id);
  if (!grant) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ grant }, { headers: { "cache-control": "no-store" } });
}
