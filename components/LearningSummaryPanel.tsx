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

function ImageCountItem({ count }: { count: number | null }) {
  return <div className="learningItem">
    <div className="learningLabel">今日の画像</div>
    <div className="learningValues"><strong>{count === null ? "--枚" : `${count.toLocaleString("ja-JP")}枚`}</strong></div>
  </div>;
}

function CombinedTrendChart({ data, totals }: { data: LearningDay[]; totals: LearningTotals }) {
  const problemValues = data.map((day) => day.problems);
  const minuteValues = data.map((day) => day.seconds / 60);
  const problemMax = Math.max(...problemValues, 1);
  const minuteMax = Math.max(...minuteValues, 1);
  const left = 58;
  const right = 662;
  const top = 26;
  const bottom = 226;
  const makePoints = (values: number[], max: number) => values.map((value, index) => ({
    x: left + (index / Math.max(values.length - 1, 1)) * (right - left),
    y: bottom - (value / max) * (bottom - top),
    value,
  }));
  const problemPoints = makePoints(problemValues, problemMax);
  const minutePoints = makePoints(minuteValues, minuteMax);
  const makePath = (points: typeof problemPoints) => points.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");

  return <section className="trendChart">
    <div className="trendLegend" aria-label="グラフの凡例">
      <span className="legendItem legendProblems"><i aria-hidden="true" />問題数 <b>合計{totals.problems}問</b></span>
      <span className="legendItem legendMinutes"><i aria-hidden="true" />学習時間 <b>合計{formatDuration(totals.seconds)}</b></span>
    </div>
    <svg className="trendSvg" viewBox="0 0 720 276" role="img" aria-label="問題数と学習時間の直近14日間の推移">
      {[top, top + (bottom - top) / 2, bottom].map((y) => <line key={y} className="chartGridLine" x1={left} x2={right} y1={y} y2={y} />)}
      <text className="chartAxisTitle chartProblemsText" x={left} y="14">問題数</text>
      <text className="chartAxisTitle chartMinutesText" x={right} y="14" textAnchor="end">学習時間</text>
      <text className="chartAxisText chartProblemsText" x="4" y={top + 4}>{Math.round(problemMax)}問</text>
      <text className="chartAxisText chartMinutesText" x="716" y={top + 4} textAnchor="end">{Math.round(minuteMax)}分</text>
      <text className="chartAxisText" x="37" y={bottom + 4}>0</text>
      <text className="chartAxisText" x="678" y={bottom + 4}>0</text>
      <path className="chartLine chartProblemsLine" d={makePath(problemPoints)} />
      <path className="chartLine chartMinutesLine" d={makePath(minutePoints)} />
      {problemPoints.map((point, index) => <circle key={`problems-${data[index].date}`} className="chartPoint chartProblemsPoint" cx={point.x} cy={point.y} r="4"><title>{shortDate(data[index].date)}：{Math.round(point.value)}問</title></circle>)}
      {minutePoints.map((point, index) => <circle key={`minutes-${data[index].date}`} className="chartPoint chartMinutesPoint" cx={point.x} cy={point.y} r="4"><title>{shortDate(data[index].date)}：{formatDuration(data[index].seconds)}</title></circle>)}
      {data.map((day, index) => index % 2 === 0 || index === data.length - 1 ? <text key={day.date} className="chartDate" x={problemPoints[index].x} y="260" textAnchor="middle">{shortDate(day.date)}</text> : null)}
    </svg>
  </section>;
}

export function LearningSummaryPanel() {
  const [dashboard, setDashboard] = useState<LearningDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [imageCount, setImageCount] = useState<number | null>(null);

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
  useEffect(() => {
    let active = true;
    fetch("/api/today-image-count", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || typeof data.count !== "number") throw new Error("画像枚数を取得できませんでした");
        if (active) setImageCount(data.count);
      })
      .catch(() => { if (active) setImageCount(null); });
    return () => { active = false; };
  }, []);
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
        <ImageCountItem count={imageCount} />
      </div>
      <div className="trendSection">
        <h3>直近2週間</h3>
        <CombinedTrendChart data={dashboard.history} totals={totals} />
      </div>
    </> : null}
  </section>;
}
