import { NextRequest, NextResponse } from "next/server";
import { combineLearningTotals, fetchSheetTotals } from "@/lib/learning-summary";

export const dynamic = "force-dynamic";

function validDate(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");
  if (!validDate(date)) return NextResponse.json({ error: "日付が正しくありません" }, { status: 400 });

  const generalId = process.env.LEARNING_SHEET_ID_GENERAL;
  const kanjiId = process.env.LEARNING_SHEET_ID_KANJI;
  if (!generalId || !kanjiId) return NextResponse.json({ error: "学習記録の接続設定がありません" }, { status: 503 });

  try {
    const [general, kanji] = await Promise.all([
      fetchSheetTotals(generalId, date),
      fetchSheetTotals(kanjiId, date),
    ]);
    return NextResponse.json({ date, general, kanji, total: combineLearningTotals(general, kanji) });
  } catch (error) {
    console.error("learning-summary fetch failed", error);
    return NextResponse.json({ error: "学習記録を読み込めませんでした" }, { status: 502 });
  }
}
