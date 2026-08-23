import { AppShell } from "@/components/AppShell";
import { LearningSummaryPanel } from "@/components/LearningSummaryPanel";
import { TimeGrantPanel } from "@/components/TimeGrantPanel";

export default function HomePage() { return <AppShell><div className="homeStack"><LearningSummaryPanel /><TimeGrantPanel /></div></AppShell>; }
