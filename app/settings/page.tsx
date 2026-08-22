import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { SettingsPanel } from "@/components/SettingsPanel";

export default function SettingsPage() { return <RequireAuth><AppShell><SettingsPanel /></AppShell></RequireAuth>; }
