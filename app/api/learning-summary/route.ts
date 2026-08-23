import { NextResponse } from "next/server";
import { buildLearningHistory, combineLearningTotals, fetchSheetDailyTotals } from "@/lib/learning-summary";

export const dynamic = "force-dynamic";

const DEFAULT_GENERAL_SHEET_ID = "1WzfYzBeUDyka_coDd0-c48zItgTzYS6ocEYlvPcQTbY";
const DEFAULT_KANJI_SHEET_ID = "1X44JkuPeX1shOjjL6LVZDhZ-8OcC7hpgORzQRiWj5SM";

function currentDateInJapan() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export async function GET() {
  const date = currentDateInJapan();
  const generalId = process.env.LEARNING_SHEET_ID_GENERAL ?? DEFAULT_GENERAL_SHEET_ID;
  const kanjiId = process.env.LEARNING_SHEET_ID_KANJI ?? DEFAULT_KANJI_SHEET_ID;

  try {
    const [generalDaily, kanjiDaily] = await Promise.all([
      fetchSheetDailyTotals(generalId),
      fetchSheetDailyTotals(kanjiId),
    ]);
    const general = generalDaily[date] ?? { problems: 0, seconds: 0 };
    const kanji = kanjiDaily[date] ?? { problems: 0, seconds: 0 };
    return NextResponse.json({
      date,
      today: { general, kanji, total: combineLearningTotals(general, kanji) },
      history: buildLearningHistory(generalDaily, kanjiDaily, date),
    });
  } catch (error) {
    console.error("learning-summary fetch failed", error);
    return NextResponse.json({ error: "学習記録を読み込めませんでした" }, { status: 502 });
  }
}
