"use client";

import { useCallback, useEffect, useState } from "react";
import type { KanjiOnlySettings } from "@/lib/kanji-only-admin-settings";

export function KanjiOnlySettingsCard() {
  const [settings, setSettings] = useState<KanjiOnlySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/kanji-only-settings", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.settings) throw new Error(data.error ?? "設定を読み込めませんでした");
      setSettings(data.settings as KanjiOnlySettings);
    } catch (reason) {
      setSettings(null);
      setError(reason instanceof Error ? reason.message : "設定を読み込めませんでした");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function save() {
    if (!settings || saving) return;
    setSaving(true);
    setError("");
    setMessage("保存しています…");
    try {
      const response = await fetch("/api/admin/kanji-only-settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await response.json();
      if (!response.ok || !data.settings) throw new Error(data.error ?? "保存できませんでした");
      setSettings(data.settings as KanjiOnlySettings);
      setMessage(data.preview ? "テスト保存しました（Googleシートは変更していません）" : "保存しました。漢字覚える君に反映されます。");
    } catch (reason) {
      setMessage("");
      setError(reason instanceof Error ? reason.message : "保存できませんでした");
    } finally {
      setSaving(false);
    }
  }

  return <section className="adminAppCard" aria-labelledby="kanji-only-admin-title">
    <div className="adminAppHeading">
      <div><p className="adminAppKicker">学習アプリ</p><h2 id="kanji-only-admin-title">漢字覚える君</h2></div>
      <span>Googleシート</span>
    </div>

    {loading ? <div className="adminState" role="status">設定を読み込んでいます…</div> : null}
    {!loading && error && !settings ? <div className="adminState adminStateError" role="alert"><span>{error}</span><button type="button" onClick={() => void load()}>再読み込み</button></div> : null}

    {!loading && settings ? <div className="adminSettings">
      <label className="adminField">
        <span><strong>1日の問題数</strong><small>1〜1,000問</small></span>
        <span className="adminNumber"><input aria-label="漢字覚える君の1日の問題数" type="number" min="1" max="1000" inputMode="numeric" value={settings.questionCount} onChange={(event) => { setSettings({ questionCount: Math.max(1, Math.min(1000, Math.round(Number(event.target.value) || 1))) }); setMessage(""); }} /><b>問</b></span>
      </label>

      {error ? <p className="adminValidation" role="alert">{error}</p> : null}
      {message ? <p className="adminSuccess" role="status">{message}</p> : null}
      <button className="primary adminSave" type="button" disabled={saving} onClick={() => void save()}>{saving ? "保存中…" : "設定を保存"}</button>
    </div> : null}
  </section>;
}
