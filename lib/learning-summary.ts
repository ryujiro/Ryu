export type LearningTotals = {
  problems: number;
  seconds: number;
};

export type LearningDay = LearningTotals & {
  date: string;
};

export type LearningDashboard = {
  date: string;
  today: {
    general: LearningTotals;
    kanji: LearningTotals;
    total: LearningTotals;
  };
  history: LearningDay[];
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

export function parseGvizDailyTotals(text: string): Record<string, LearningTotals> {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Google Sheetsの応答を読み取れませんでした");
  const response = JSON.parse(text.slice(start, end + 1)) as GvizResponse;
  const daily: Record<string, LearningTotals> = {};

  for (const row of response.table?.rows ?? []) {
    const cells = row.c ?? [];
    const date = dateKey(cells[0] ?? null);
    if (!date) continue;
    const totals = daily[date] ?? { problems: 0, seconds: 0 };
    totals.problems += Math.max(0, Math.round(numeric(cells[1] ?? null)));
    totals.seconds += durationSeconds(cells[2] ?? null);
    daily[date] = totals;
  }
  return daily;
}

export async function fetchSheetDailyTotals(spreadsheetId: string): Promise<Record<string, LearningTotals>> {
  const params = new URLSearchParams({
    tqx: "out:json",
    sheet: "学習履歴",
    headers: "1",
    tq: "select B,C,I where B is not null",
  });
  const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/gviz/tq?${params}`;
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`Google Sheetsから取得できませんでした (${response.status})`);
  return parseGvizDailyTotals(await response.text());
}

export function combineLearningTotals(general: LearningTotals, kanji: LearningTotals): LearningTotals {
  return { problems: general.problems + kanji.problems, seconds: general.seconds + kanji.seconds };
}

export function buildLearningHistory(
  general: Record<string, LearningTotals>,
  kanji: Record<string, LearningTotals>,
  endDate: string,
  days = 14,
): LearningDay[] {
  const end = new Date(`${endDate}T00:00:00Z`);
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(end);
    date.setUTCDate(end.getUTCDate() - (days - index - 1));
    const key = date.toISOString().slice(0, 10);
    return { date: key, ...combineLearningTotals(general[key] ?? { problems: 0, seconds: 0 }, kanji[key] ?? { problems: 0, seconds: 0 }) };
  });
}
