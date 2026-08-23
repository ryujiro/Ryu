export type LearningTotals = {
  problems: number;
  seconds: number;
};

export type LearningSummary = {
  date: string;
  general: LearningTotals;
  kanji: LearningTotals;
  total: LearningTotals;
};

type GvizCell = { v?: unknown; f?: string | null } | null;
type GvizResponse = { table?: { rows?: Array<{ c?: GvizCell[] }> } };

const DATE_CALL = /^Date\((\d{4}),(\d{1,2}),(\d{1,2})/;
const DATE_TIME_CALL = /^Date\(\d{4},\d{1,2},\d{1,2},(\d{1,2}),(\d{1,2}),(\d{1,2})\)$/;
const ISO_DATE = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/;
const US_DATE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
const CLOCK = /^(?:(\d+):)?(\d{1,2}):(\d{2})$/;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function dateKey(cell: GvizCell): string | null {
  if (!cell) return null;
  if (typeof cell.v === "number") {
    const date = new Date(Date.UTC(1899, 11, 30) + Math.round(cell.v) * 86_400_000);
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
  }

  const value = typeof cell.v === "string" ? cell.v : cell.f;
  if (!value) return null;
  const dateCall = value.match(DATE_CALL);
  if (dateCall) return `${dateCall[1]}-${pad(Number(dateCall[2]) + 1)}-${pad(Number(dateCall[3]))}`;
  const iso = value.match(ISO_DATE);
  if (iso) return `${iso[1]}-${pad(Number(iso[2]))}-${pad(Number(iso[3]))}`;
  const us = value.match(US_DATE);
  if (us) return `${us[3]}-${pad(Number(us[1]))}-${pad(Number(us[2]))}`;
  return null;
}

function numeric(cell: GvizCell): number {
  if (!cell) return 0;
  if (typeof cell.v === "number" && Number.isFinite(cell.v)) return cell.v;
  const value = Number(cell.v ?? cell.f ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function durationSeconds(cell: GvizCell): number {
  if (!cell) return 0;
  if (typeof cell.v === "number" && Number.isFinite(cell.v)) return Math.max(0, Math.round(cell.v * 86_400));
  const rawValue = String(cell.v ?? "").trim();
  const dateTime = rawValue.match(DATE_TIME_CALL);
  if (dateTime) return Number(dateTime[1]) * 3600 + Number(dateTime[2]) * 60 + Number(dateTime[3]);
  const value = String(cell.f ?? rawValue).trim();
  const clock = value.match(CLOCK);
  if (clock) return Number(clock[1] ?? 0) * 3600 + Number(clock[2]) * 60 + Number(clock[3]);
  return 0;
}

export function parseGvizTable(text: string, targetDate: string): LearningTotals {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Google Sheetsの応答を読み取れませんでした");
  const response = JSON.parse(text.slice(start, end + 1)) as GvizResponse;
  const totals = { problems: 0, seconds: 0 };

  for (const row of response.table?.rows ?? []) {
    const cells = row.c ?? [];
    if (dateKey(cells[0] ?? null) !== targetDate) continue;
    totals.problems += Math.max(0, Math.round(numeric(cells[1] ?? null)));
    totals.seconds += durationSeconds(cells[2] ?? null);
  }
  return totals;
}

export async function fetchSheetTotals(spreadsheetId: string, targetDate: string): Promise<LearningTotals> {
  const params = new URLSearchParams({
    tqx: "out:json",
    sheet: "学習履歴",
    headers: "1",
    tq: "select B,C,I where B is not null",
  });
  const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/gviz/tq?${params}`;
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`Google Sheetsから取得できませんでした (${response.status})`);
  return parseGvizTable(await response.text(), targetDate);
}

export function combineLearningTotals(general: LearningTotals, kanji: LearningTotals): LearningTotals {
  return { problems: general.problems + kanji.problems, seconds: general.seconds + kanji.seconds };
}
