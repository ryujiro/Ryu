import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { TimeGrantPanel } from "@/components/TimeGrantPanel";

export default function HomePage() { return <RequireAuth><AppShell><TimeGrantPanel /></AppShell></RequireAuth>; }
