"use client";

import { useEffect, useState } from "react";
import { loadHistory, previewProgress, saveGrant } from "@/lib/client-history";
import type { GrantStatus, TimeGrant } from "@/lib/types";

const labels: Record<GrantStatus, string> = { pending: "送信待ち", sending: "受信中", acknowledged: "追加済み", failed: "失敗" };
export function HistoryPanel() {
  const [items, setItems] = useState<TimeGrant[]>([]);
  const [date, setDate] = useState("");
  useEffect(() => { const updated = loadHistory().map(previewProgress); updated.forEach(saveGrant); setItems(updated); }, []);
  async function retry(item: TimeGrant) {
    if (item.status !== "failed") return;
    const response = await fetch(`/api/manual-time/${item.id}/retry`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ requestId: item.requestId, sendId: item.sendId, minutes: item.minutes }) });
    const now = new Date().toISOString();
    const grant = response.ok
      ? (await response.json()).grant as TimeGrant
      : { ...item, status: "pending" as const, createdAt: now, updatedAt: now, attempts: item.attempts + 1 };
    saveGrant(grant); setItems((current) => current.map((entry) => entry.id === grant.id ? grant : entry));
  }
  const filtered = items.filter((item) => !date || item.createdAt.slice(0, 10) === date);
  return <section className="card" aria-labelledby="history-title"><h1 id="history-title" className="sectionTitle">追加履歴</h1><div className="toolbar"><label className="filterLabel">日付で絞り込み<input className="dateInput" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>{date ? <button className="secondary" type="button" onClick={() => setDate("")}>絞り込みを解除</button> : null}</div><div className="historyList">{filtered.length === 0 ? <div className="empty">表示する履歴はありません</div> : filtered.map((item) => <article className="historyRow" key={item.id}><div className="historyTop"><div className="historyMinutes">{item.minutes}分</div><span className={`smallStatus ${item.status}`}>{labels[item.status]}</span></div><div className="historyDetails">{new Date(item.createdAt).toLocaleString("ja-JP")}<br />{item.seconds.toLocaleString("ja-JP")}秒 ／ 操作元：保護者（手動）{item.responseText ? <><br />{item.responseText}</> : null}</div>{item.status === "failed" ? <button className="retry" type="button" onClick={() => retry(item)}>安全に再送する</button> : null}</article>)}</div></section>;
}
