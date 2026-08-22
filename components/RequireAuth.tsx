"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    fetch("/api/auth/session", { cache: "no-store" }).then((response) => { if (!response.ok) router.replace("/login"); else setReady(true); }).catch(() => router.replace("/login"));
  }, [router]);
  if (!ready) return <div className="srOnly" role="status">確認中</div>;
  return children;
}
