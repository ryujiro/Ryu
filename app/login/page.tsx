"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter(); const [pin, setPin] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  async function login(event: FormEvent) {
    event.preventDefault(); if (loading) return; setLoading(true); setError("");
    try { const response = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pin }) }); if (!response.ok) { setError("パスコードを確認してください"); return; } router.replace("/"); }
    catch { setError("通信を確認して、もう一度お試しください"); } finally { setLoading(false); }
  }
  return <main className="loginPage"><section className="loginCard" aria-labelledby="login-title"><h1 id="login-title" className="pageTitle">保護者用</h1><p className="subtitle">パスコードを入力してください</p><form onSubmit={login}><label className="loginLabel" htmlFor="parent-pin">パスコード</label><input id="parent-pin" className="loginInput" type="password" inputMode="numeric" autoComplete="current-password" value={pin} onChange={(event) => setPin(event.target.value)} required maxLength={64} autoFocus /><p className="loginError" role="alert">{error}</p><button className="primary" type="submit" disabled={!pin || loading}>{loading ? "確認中…" : "管理画面を開く"}</button></form><p className="previewNote">テスト版パスコード：1234<br />テスト版は実機M5Stackへ送信しません。</p></section></main>;
}
