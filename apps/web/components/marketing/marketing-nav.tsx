import Link from "next/link";
import { ThemeToggle } from "../theme-toggle";

export function MarketingNav() {
  return (
    <header className="sticky top-6 z-20 flex flex-wrap items-center justify-between gap-4 rounded-[28px] border border-[var(--border)] bg-[var(--surface-elevated)]/90 px-5 py-4 shadow-[var(--shadow-soft)] backdrop-blur-xl">
      <Link href="/" className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] text-sm font-semibold text-slate-950 shadow-[0_10px_30px_rgba(87,181,255,0.28)]">
          FM
        </div>
        <div className="text-sm font-medium tracking-[0.22em] text-[var(--muted)] uppercase">Factum</div>
      </Link>
      <nav className="flex flex-wrap items-center gap-2 sm:gap-4" aria-label="Marketing">
        <a
          href="#how-it-works"
          className="rounded-full px-3 py-2 text-sm font-medium text-[var(--text-soft)] transition hover:bg-[var(--surface-strong)] hover:text-[var(--text)]"
        >
          How it works
        </a>
        <a
          href="#capabilities"
          className="rounded-full px-3 py-2 text-sm font-medium text-[var(--text-soft)] transition hover:bg-[var(--surface-strong)] hover:text-[var(--text)]"
        >
          Capabilities
        </a>
        <a
          href="#faq"
          className="rounded-full px-3 py-2 text-sm font-medium text-[var(--text-soft)] transition hover:bg-[var(--surface-strong)] hover:text-[var(--text)]"
        >
          FAQ
        </a>
        <Link
          href="/app"
          className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_12px_34px_rgba(87,181,255,0.24)] transition hover:scale-[1.01]"
        >
          Run an experiment
        </Link>
        <ThemeToggle />
      </nav>
    </header>
  );
}
