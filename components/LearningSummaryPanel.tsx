"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { LearningDashboard, LearningDay, LearningTotals } from "@/lib/learning-summary";

function formatDuration(seconds: number) {
  if (seconds <= 0) return "0分";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return `${hours ? `${hours}時間` : ""}${minutes ? `${minutes}分` : ""}${remainder ? `${remainder}秒` : ""}`;
}

function shortDate(date: string) {
  const [, month, day] = date.split("-");
  return `${Number(month)}/${Number(day)}`;
}

function SummaryItem({ label, value, total = false }: { label: string; value: LearningTotals; total?: boolean }) {
  return <div className={`learningItem${total ? " learningTotal" : ""}`}>
    <div className="learningLabel">{label}</div>
    <div className="learningValues"><strong>{value.problems.toLocaleString("ja-JP")}問</strong><span>{formatDuration(value.seconds)}</span></div>
  </div>;
}

type TrendChartProps = {
  title: string;
  data: LearningDay[];
  getValue: (day: LearningDay) => number;
  formatValue: (value: number) => string;
  total: string;
  tone: "green" | "blue";
};

function TrendChart({ title, data, getValue, formatValue, total, tone }: TrendChartProps) {
  const values = data.map(getValue);
  const max = Math.max(...values, 1);
  const left = 36;
  const right = 548;
  const top = 18;
  const bottom = 164;
  const points = values.map((value, index) => ({
    x: left + (index / Math.max(values.length - 1, 1)) * (right - left),
    y: bottom - (value / max) * (bottom - top),
    value,
  }));
  const path = points.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");

  return <section className="trendChart">
    <div className="trendHeading"><h4>{title}</h4><span>{total}</span></div>
    <svg className={`trendSvg trend${tone}`} viewBox="0 0 560 205" role="img" aria-label={`${title}の直近14日間の推移`}>
      {[top, (top + bottom) / 2, bottom].map((y) => <line key={y} className="chartGridLine" x1={left} x2={right} y1={y} y2={y} />)}
      <text className="chartAxisText" x="2" y={top + 4}>{formatValue(max)}</text>
      <text className="chartAxisText" x="20" y={bottom + 4}>0</text>
      <path className="chartLine" d={path} />
      {points.map((point, index) => <circle key={data[index].date} className="chartPoint" cx={point.x} cy={point.y} r="4"><title>{shortDate(data[index].date)}：{formatValue(point.value)}</title></circle>)}
      {data.map((day, index) => index % 3 === 0 || index === data.length - 1 ? <text key={day.date} className="chartDate" x={points[index].x} y="194" textAnchor="middle">{shortDate(day.date)}</text> : null)}
    </svg>
  </section>;
}

export function LearningSummaryPanel() {
  const [dashboard, setDashboard] = useState<LearningDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/learning-summary", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "読み込みに失敗しました");
      setDashboard(data as LearningDashboard);
    } catch (reason) {
      setDashboard(null);
      setError(reason instanceof Error ? reason.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  const totals = useMemo(() => dashboard?.history.reduce((sum, day) => ({ problems: sum.problems + day.problems, seconds: sum.seconds + day.seconds }), { problems: 0, seconds: 0 }) ?? { problems: 0, seconds: 0 }, [dashboard]);

  return <section className="learningCard" aria-labelledby="learning-title">
    <div className="learningHeader"><div><p className="eyebrow">学習記録</p><h2 id="learning-title">今日の学習</h2></div></div>
    {loading ? <div className="learningState" role="status">読み込み中…</div> : null}
    {!loading && error ? <div className="learningState learningError" role="alert"><span>{error}</span><button type="button" onClick={() => void load()}>再読み込み</button></div> : null}
    {!loading && dashboard ? <>
      <div className="learningGrid">
        <SummaryItem label="通常学習" value={dashboard.today.general} />
        <SummaryItem label="漢字学習" value={dashboard.today.kanji} />
        <SummaryItem label="合計" value={dashboard.today.total} total />
      </div>
      <div className="trendSection">
        <h3>直近2週間</h3>
        <div className="trendGrid">
          <TrendChart title="問題数" data={dashboard.history} getValue={(day) => day.problems} formatValue={(value) => `${Math.round(value)}問`} total={`14日合計 ${totals.problems}問`} tone="green" />
          <TrendChart title="学習時間" data={dashboard.history} getValue={(day) => day.seconds / 60} formatValue={(value) => `${Math.round(value)}分`} total={`14日合計 ${formatDuration(totals.seconds)}`} tone="blue" />
        </div>
      </div>
    </> : null}
  </section>;
}
