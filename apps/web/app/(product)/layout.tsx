import type { ReactNode } from "react";
import Link from "next/link";
import { ThemeToggle } from "../../components/theme-toggle";

export const metadata = {
  description: "Run experiments and open proof receipts."
};

export default function ProductLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto min-h-screen max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-[28px] border border-[var(--border)] bg-[var(--surface-elevated)]/88 px-5 py-4 shadow-[var(--shadow-soft)] backdrop-blur-xl">
        <Link href="/" className="flex min-w-0 flex-1 items-center gap-3 sm:flex-initial">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] text-sm font-semibold text-slate-950 shadow-[0_10px_30px_rgba(87,181,255,0.28)]">
            FM
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium tracking-[0.22em] text-[var(--muted)] uppercase">Factum</div>
            <div className="hidden truncate text-sm text-[var(--text-soft)] sm:block">
              AI agents should prove what they tested.
            </div>
          </div>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3" aria-label="Product">
          <Link
            href="/app"
            className="rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-strong)] px-4 py-2 text-sm font-medium text-[var(--text)] transition hover:border-[var(--accent)]"
          >
            Run
          </Link>
          <ThemeToggle />
        </nav>
      </header>
      <main className="pb-12 pt-8">{children}</main>
    </div>
  );
}
