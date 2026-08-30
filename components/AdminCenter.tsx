"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { KanjiAppSettings } from "@/lib/kanji-admin-settings";

const SUBJECT_ORDER = ["国語", "数学", "英語", "理科", "社会"];

function orderedSubjects(weights: Record<string, number>) {
  const known = SUBJECT_ORDER.filter((subject) => subject in weights);
  const extra = Object.keys(weights).filter((subject) => !SUBJECT_ORDER.includes(subject)).sort((a, b) => a.localeCompare(b, "ja"));
  return [...known, ...extra];
}

export function AdminCenter() {
  const [settings, setSettings] = useState<KanjiAppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/kanji-settings", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.settings) throw new Error(data.error ?? "設定を読み込めませんでした");
      setSettings(data.settings as KanjiAppSettings);
    } catch (reason) {
      setSettings(null);
      setError(reason instanceof Error ? reason.message : "設定を読み込めませんでした");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const subjects = useMemo(() => settings ? orderedSubjects(settings.subjectWeights) : [], [settings]);
  const hasActiveSubject = settings ? Object.values(settings.subjectWeights).some((weight) => weight > 0) : false;

  function updateWeight(subject: string, value: string) {
    const weight = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
    setSettings((current) => current ? { ...current, subjectWeights: { ...current.subjectWeights, [subject]: weight } } : current);
    setMessage("");
  }

  async function save() {
    if (!settings || saving || !hasActiveSubject) return;
    setSaving(true);
    setError("");
    setMessage("保存しています…");
    try {
      const response = await fetch("/api/admin/kanji-settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await response.json();
      if (!response.ok || !data.settings) throw new Error(data.error ?? "保存できませんでした");
      setSettings(data.settings as KanjiAppSettings);
      setMessage(data.preview ? "テスト保存しました（実データは変更していません）" : "保存しました。すべての端末に反映されます。");
    } catch (reason) {
      setMessage("");
      setError(reason instanceof Error ? reason.message : "保存できませんでした");
    } finally {
      setSaving(false);
    }
  }

  return <section className="adminCenter" aria-labelledby="admin-title">
    <div className="adminIntro">
      <p className="eyebrow">管理センター</p>
      <h1 id="admin-title" className="sectionTitle">管理</h1>
      <p>各アプリの設定を、ここにまとめていきます。</p>
    </div>

    <section className="adminAppCard" aria-labelledby="kanji-admin-title">
      <div className="adminAppHeading">
        <div><p className="adminAppKicker">学習アプリ</p><h2 id="kanji-admin-title">覚える君</h2></div>
        <span>共通設定</span>
      </div>

      {loading ? <div className="adminState" role="status">設定を読み込んでいます…</div> : null}
      {!loading && error && !settings ? <div className="adminState adminStateError" role="alert"><span>{error}</span><button type="button" onClick={() => void load()}>再読み込み</button></div> : null}

      {!loading && settings ? <div className="adminSettings">
        <label className="adminField">
          <span><strong>1日の問題数</strong><small>1〜1,000問</small></span>
          <span className="adminNumber"><input type="number" min="1" max="1000" inputMode="numeric" value={settings.questionCount} onChange={(event) => setSettings({ ...settings, questionCount: Math.max(1, Math.min(1000, Math.round(Number(event.target.value) || 1))) })} /><b>問</b></span>
        </label>

        <div className="adminField">
          <span><strong>英語の音声・音読</strong><small>すべての端末で共通</small></span>
          <div className="adminToggle" role="group" aria-label="英語の音声・音読">
            <button type="button" className={settings.englishAudioEnabled ? "active" : ""} aria-pressed={settings.englishAudioEnabled} onClick={() => { setSettings({ ...settings, englishAudioEnabled: true }); setMessage(""); }}>ON</button>
            <button type="button" className={!settings.englishAudioEnabled ? "active" : ""} aria-pressed={!settings.englishAudioEnabled} onClick={() => { setSettings({ ...settings, englishAudioEnabled: false }); setMessage(""); }}>OFF</button>
          </div>
        </div>

        <fieldset className="subjectWeights">
          <legend>教科の出題割合</legend>
          <p>0にすると、その教科は出題しません。</p>
          <div className="subjectWeightList">
            {subjects.map((subject) => <label key={subject}><span>{subject}</span><input aria-label={`${subject}の出題割合`} type="number" min="0" max="100" inputMode="numeric" value={settings.subjectWeights[subject]} onChange={(event) => updateWeight(subject, event.target.value)} /></label>)}
          </div>
          {!hasActiveSubject ? <p className="adminValidation" role="alert">少なくとも1教科は1以上にしてください。</p> : null}
        </fieldset>

        {error ? <p className="adminValidation" role="alert">{error}</p> : null}
        {message ? <p className="adminSuccess" role="status">{message}</p> : null}
        <button className="primary adminSave" type="button" disabled={saving || !hasActiveSubject} onClick={() => void save()}>{saving ? "保存中…" : "設定を保存"}</button>
      </div> : null}
    </section>
  </section>;
}
