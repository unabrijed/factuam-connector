import Link from "next/link";
import { ThemeToggle } from "../theme-toggle";

export function MarketingNav() {
  return (
    <header className="sticky top-6 z-20 flex flex-wrap items-center justify-between gap-4 rounded-[28px] border border-[var(--border)] bg-[var(--surface-elevated)]/90 px-5 py-4 shadow-[var(--shadow-soft)] backdrop-blur-xl">
      <Link href="/" className="flex items-center gap-3">
        <img src="/logo.png" alt="Factum" className="h-8 w-auto shrink-0" />
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
          className="inline-flex items-center justify-center rounded-2xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(0,169,110,0.22)] transition hover:scale-[1.01] hover:bg-[var(--accent-strong)]"
        >
          Run an experiment
        </Link>
        <ThemeToggle />
      </nav>
    </header>
  );
}
