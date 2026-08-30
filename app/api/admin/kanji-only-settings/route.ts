import { NextRequest, NextResponse } from "next/server";
import { fetchKanjiOnlySettings, kanjiOnlySettingsSchema, saveKanjiOnlySettings } from "@/lib/kanji-only-admin-settings";
import { allowRate, requestIsSameOrigin } from "@/lib/security";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "cache-control": "no-store, max-age=0" };

export async function GET() {
  try {
    const settings = await fetchKanjiOnlySettings();
    return NextResponse.json({ settings }, { headers: noStoreHeaders });
  } catch (error) {
    console.error("kanji-only settings fetch failed", error);
    return NextResponse.json({ error: "漢字覚える君の設定を読み込めませんでした" }, { status: 502, headers: noStoreHeaders });
  }
}

export async function POST(request: NextRequest) {
  if (!requestIsSameOrigin(request)) return NextResponse.json({ error: "invalid origin" }, { status: 403, headers: noStoreHeaders });
  const ip = request.headers.get("x-nf-client-connection-ip") ?? request.headers.get("x-forwarded-for") ?? "unknown";
  if (!allowRate(`kanji-only-settings:${ip}`, 10)) return NextResponse.json({ error: "しばらく待ってからお試しください" }, { status: 429, headers: noStoreHeaders });

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "入力を確認してください" }, { status: 400, headers: noStoreHeaders }); }
  const parsed = kanjiOnlySettingsSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "問題数は1〜1,000の整数で入力してください" }, { status: 400, headers: noStoreHeaders });

  if (process.env.APP_ENV !== "production") {
    return NextResponse.json({ settings: parsed.data, preview: true }, { headers: noStoreHeaders });
  }

  const credentials = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON ?? "";
  if (!credentials) {
    return NextResponse.json({ error: "漢字覚える君の書き込み接続設定がありません" }, { status: 503, headers: noStoreHeaders });
  }

  try {
    const settings = await saveKanjiOnlySettings(parsed.data, credentials);
    return NextResponse.json({ settings }, { headers: noStoreHeaders });
  } catch (error) {
    console.error("kanji-only settings save failed", error);
    return NextResponse.json({ error: "漢字覚える君の設定を保存できませんでした" }, { status: 502, headers: noStoreHeaders });
  }
}
