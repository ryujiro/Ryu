import Link from "next/link";

export function AppShell({ children }: { children: React.ReactNode }) {
  return <div className="shell"><header className="header"><Link className="brand" href="/">M5Stack 親アプリ</Link><nav className="nav" aria-label="保護者用メニュー"><Link href="/history">履歴</Link><Link href="/settings">設定</Link></nav></header><main className="page">{children}</main></div>;
}
