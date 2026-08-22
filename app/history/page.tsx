import { AppShell } from "@/components/AppShell";
import { HistoryPanel } from "@/components/HistoryPanel";
import { RequireAuth } from "@/components/RequireAuth";

export default function HistoryPage() { return <RequireAuth><AppShell><HistoryPanel /></AppShell></RequireAuth>; }
