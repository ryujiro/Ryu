"use client";

import { useCallback, useEffect, useState } from "react";
import type { LearningSummary, LearningTotals } from "@/lib/learning-summary";

function localDateKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function formatDuration(seconds: number) {
  if (seconds <= 0) return "0分";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  const parts = [];
  if (hours) parts.push(`${hours}時間`);
  if (minutes) parts.push(`${minutes}分`);
  if (remainder) parts.push(`${remainder}秒`);
  return parts.join("");
}

function SummaryItem({ label, value, total = false }: { label: string; value: LearningTotals; total?: boolean }) {
  return <div className={`learningItem${total ? " learningTotal" : ""}`}>
    <div className="learningLabel">{label}</div>
    <div className="learningValues"><strong>{value.problems.toLocaleString("ja-JP")}問</strong><span>{formatDuration(value.seconds)}</span></div>
  </div>;
}

export function LearningSummaryPanel() {
  const [date, setDate] = useState(localDateKey);
  const [summary, setSummary] = useState<LearningSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/learning-summary?date=${encodeURIComponent(date)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "読み込みに失敗しました");
      setSummary(data as LearningSummary);
    } catch (reason) {
      setSummary(null);
      setError(reason instanceof Error ? reason.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { void load(); }, [load]);

  return <section className="learningCard" aria-labelledby="learning-title">
    <div className="learningHeader">
      <div><p className="eyebrow">学習記録</p><h2 id="learning-title">この日の学習</h2></div>
      <label className="learningDate"><span>日付</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
    </div>
    {loading ? <div className="learningState" role="status">読み込み中…</div> : null}
    {!loading && error ? <div className="learningState learningError" role="alert"><span>{error}</span><button type="button" onClick={() => void load()}>再読み込み</button></div> : null}
    {!loading && summary ? <div className="learningGrid">
      <SummaryItem label="通常学習" value={summary.general} />
      <SummaryItem label="漢字学習" value={summary.kanji} />
      <SummaryItem label="合計" value={summary.total} total />
    </div> : null}
  </section>;
}
