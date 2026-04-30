import Link from "next/link";

export function MarketingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 border-t border-[var(--border)] pb-10 pt-12">
      <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-strong)] bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] text-xs font-semibold text-slate-950">
              FM
            </div>
            <span className="text-sm font-semibold text-[var(--text)]">Factum</span>
          </div>
          <p className="max-w-xs text-sm leading-6 text-[var(--text-soft)]">
            Autonomous evidence engine: plans, runs, and verifies so agents can show what they tested.
          </p>
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Product</h3>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link href="/app" className="text-[var(--text-soft)] hover:text-[var(--accent)]">
                Run app
              </Link>
            </li>
            <li>
              <a href="#how-it-works" className="text-[var(--text-soft)] hover:text-[var(--accent)]">
                How it works
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Resources</h3>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <a href="#faq" className="text-[var(--text-soft)] hover:text-[var(--accent)]">
                FAQ
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Legal</h3>
          <p className="mt-4 text-sm text-[var(--text-soft)]">Not financial advice.</p>
        </div>
      </div>
      <p className="mt-10 text-center text-xs text-[var(--muted)]">© {year} Factum</p>
    </footer>
  );
}
