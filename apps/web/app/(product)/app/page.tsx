import { Suspense } from "react";
import { HomeShell } from "../../../components/home-shell";

export default function AppPage() {
  return (
    <Suspense fallback={<div className="text-sm text-[var(--text-soft)]">Loading…</div>}>
      <HomeShell />
    </Suspense>
  );
}
