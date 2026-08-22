"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { DeviceStatus } from "@/lib/types";

export function SettingsPanel() {
  const router = useRouter();
  const [device, setDevice] = useState<DeviceStatus | null>(null);
  useEffect(() => { fetch("/api/device/status", { cache: "no-store" }).then((response) => response.json()).then(setDevice).catch(() => setDevice(null)); }, []);
  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); router.replace("/login"); }
  return <section className="card" aria-labelledby="settings-title"><h1 id="settings-title" className="sectionTitle">設定</h1><dl className="settingsList"><div className="settingRow"><dt>M5Stack表示名</dt><dd>{device?.deviceLabel ?? "確認中"}</dd></div><div className="settingRow"><dt>最終接続日時</dt><dd>{device?.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString("ja-JP") : "まだ接続されていません"}</dd></div><div className="settingRow"><dt>API状態</dt><dd>{device?.apiStatus === "ok" ? "正常" : "確認中"}</dd></div></dl><button className="dangerButton" type="button" onClick={logout}>ログアウト</button></section>;
}
