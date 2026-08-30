import { NextRequest, NextResponse } from "next/server";
import { fetchKanjiAppSettings, kanjiAppSettingsSchema, saveKanjiAppSettings } from "@/lib/kanji-admin-settings";
import { allowRate, requestIsSameOrigin } from "@/lib/security";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "cache-control": "no-store, max-age=0" };

export async function GET() {
  try {
    const settings = await fetchKanjiAppSettings();
    return NextResponse.json({ settings }, { headers: noStoreHeaders });
  } catch (error) {
    console.error("kanji settings fetch failed", error);
    return NextResponse.json({ error: "覚える君の設定を読み込めませんでした" }, { status: 502, headers: noStoreHeaders });
  }
}

export async function POST(request: NextRequest) {
  if (!requestIsSameOrigin(request)) return NextResponse.json({ error: "invalid origin" }, { status: 403, headers: noStoreHeaders });
  const ip = request.headers.get("x-nf-client-connection-ip") ?? request.headers.get("x-forwarded-for") ?? "unknown";
  if (!allowRate(`kanji-settings:${ip}`, 10)) return NextResponse.json({ error: "しばらく待ってからお試しください" }, { status: 429, headers: noStoreHeaders });

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "入力を確認してください" }, { status: 400, headers: noStoreHeaders }); }
  const parsed = kanjiAppSettingsSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "設定内容を確認してください" }, { status: 400, headers: noStoreHeaders });

  if (process.env.APP_ENV !== "production") {
    return NextResponse.json({ settings: parsed.data, preview: true }, { headers: noStoreHeaders });
  }

  try {
    const settings = await saveKanjiAppSettings(parsed.data, process.env.KANJI_ADMIN_PASSCODE ?? "");
    return NextResponse.json({ settings }, { headers: noStoreHeaders });
  } catch (error) {
    console.error("kanji settings save failed", error);
    const missingConfiguration = !process.env.KANJI_ADMIN_PASSCODE;
    return NextResponse.json(
      { error: missingConfiguration ? "覚える君の管理用接続設定がありません" : "覚える君の設定を保存できませんでした" },
      { status: missingConfiguration ? 503 : 502, headers: noStoreHeaders },
    );
  }
}
