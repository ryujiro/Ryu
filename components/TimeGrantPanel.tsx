"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { loadHistory, previewProgress, saveGrant } from "@/lib/client-history";
import type { DeviceStatus, GrantStatus, TimeGrant } from "@/lib/types";
import { parseMinuteText } from "@/lib/validation";

const presets = [5, 10, 30, 60];
const labels: Record<GrantStatus, string> = { pending: "M5Stackへの送信待ち", sending: "M5Stackが受信中", acknowledged: "ゲーム時間を追加しました", failed: "追加できませんでした" };
const icons: Record<GrantStatus, string> = { pending: "◷", sending: "↗", acknowledged: "✓", failed: "!" };

export function TimeGrantPanel() {
  const [value, setValue] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [current, setCurrent] = useState<TimeGrant | null>(null);
  const [device, setDevice] = useState<DeviceStatus | null>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const minutes = parseMinuteText(value);

  useEffect(() => {
    const recent = loadHistory()[0];
    if (recent) setCurrent(previewProgress(recent));
    fetch("/api/device/status", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((data: DeviceStatus | null) => setDevice(data)).catch(() => setDevice(null));
  }, []);
  useEffect(() => {
    if (!current || current.status === "acknowledged" || current.status === "failed") return;
    const timer = window.setInterval(() => {
      if (device?.preview === false) {
        const query = new URLSearchParams({ sendId: current.sendId, requestId: current.requestId, minutes: String(current.minutes), createdAt: current.createdAt });
        fetch(`/api/manual-time/${current.id}?${query}`, { cache: "no-store" })
          .then((response) => response.ok ? response.json() : null)
          .then((data) => { if (data?.grant) { saveGrant(data.grant); setCurrent(data.grant); } })
          .catch(() => undefined);
        return;
      }
      setCurrent((previous) => {
        if (!previous) return previous;
        const next = previewProgress(previous); saveGrant(next); return next;
      });
    }, device?.preview === false ? 2500 : 900);
    return () => window.clearInterval(timer);
  }, [current, device?.preview]);
  useEffect(() => { if (confirming) backRef.current?.focus(); }, [confirming]);

  function requestConfirmation(event: FormEvent) { event.preventDefault(); if (minutes !== null) setConfirming(true); }
  async function submitGrant() {
    if (minutes === null || submitting) return;
    setSubmitting(true);
    const requestId = crypto.randomUUID();
    try {
      const response = await fetch("/api/manual-time", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ requestId, minutes }) });
      const data = await response.json();
      if (!response.ok) throw new Error("request failed");
      const grant = data.grant as TimeGrant;
      saveGrant(grant); setCurrent(grant); setValue(""); setConfirming(false);
    } catch {
      const now = new Date().toISOString();
      const failed: TimeGrant = { id: crypto.randomUUID(), requestId, sendId: crypto.randomUUID(), transferId: crypto.randomUUID(), sessionId: `manual:${requestId}`, minutes, seconds: minutes * 60, status: "failed", responseText: "通信を確認して再度お試しください", remainingSeconds: null, actualAddedSeconds: null, attempts: 0, createdAt: now, updatedAt: now, source: "manual" };
      saveGrant(failed); setCurrent(failed); setConfirming(false);
    } finally { setSubmitting(false); }
  }

  const inputError = value !== "" && minutes === null ? "1～1,440の整数を入力してください" : "";
  return <section className="card" aria-labelledby="grant-title">
    <h1 id="grant-title" className="pageTitle">ゲーム時間を追加</h1>
    <p className="subtitle">追加する時間を選ぶか、分数を入力してください</p>
    <form onSubmit={requestConfirmation} noValidate>
      <div className="presets" aria-label="追加時間のプリセット">{presets.map((preset) => <button key={preset} type="button" className="preset" aria-pressed={value === String(preset)} onClick={() => setValue(String(preset))}>{preset}分</button>)}</div>
      <label className="minuteField"><span className="srOnly">追加する分数</span><input className="minuteInput" value={value} onChange={(event) => setValue(event.target.value)} inputMode="numeric" pattern="[0-9]*" autoComplete="off" maxLength={4} aria-invalid={Boolean(inputError)} aria-describedby="minute-error" placeholder="60" /><span className="unit">分</span></label>
      <p id="minute-error" className="validation" role="alert">{inputError}</p>
      <button className="primary" type="submit" disabled={minutes === null || submitting}>ゲーム時間を追加</button>
    </form>
    <div className="deviceLine" aria-live="polite"><span className="dot" aria-hidden="true" />{device?.lastSeenAt ? "最終接続 2分前" : "まだ接続されていません"}</div>
    {current ? <div className={`statusBox ${current.status}`} role="status" aria-live="polite"><span className="statusIcon" aria-hidden="true">{icons[current.status]}</span><div><div>{labels[current.status]}</div><div className="statusMeta">{current.minutes}分（{current.seconds.toLocaleString("ja-JP")}秒）{current.responseText ? ` ／ ${current.responseText}` : ""}{current.actualAddedSeconds !== null && current.actualAddedSeconds < current.seconds ? " ／ 上限24時間のため、実際に追加された時間が少なくなりました" : ""}</div></div></div> : null}
    <div className="cardLinks"><Link href="/history">履歴を見る</Link></div>
    {confirming && minutes !== null ? <div className="dialogBackdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setConfirming(false); }}><div className="dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title"><h2 id="confirm-title">ゲーム時間を追加します</h2><div className="dialogSummary">追加時間：<strong>{minutes}分（{(minutes * 60).toLocaleString("ja-JP")}秒）</strong>{minutes >= 120 ? <div className="warning">長時間の追加です。内容をもう一度確認してください。</div> : null}</div><p>この内容でよろしいですか？</p><div className="dialogActions"><button ref={backRef} className="secondary" type="button" onClick={() => setConfirming(false)}>もどる</button><button className="primary" type="button" onClick={submitGrant} disabled={submitting}>{submitting ? "登録中…" : "追加する"}</button></div></div></div> : null}
  </section>;
}
