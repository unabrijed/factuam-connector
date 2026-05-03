import Link from "next/link";

export function MarketingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-32 border-t border-[var(--border)] pb-12 pt-14">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <img src="/logo.png" alt="Factum" className="h-7 w-auto" />
              <span className="text-sm font-semibold text-[var(--text)]">Factum</span>
            </div>
            <p className="max-w-xs text-sm leading-6 text-[var(--text-soft)]">
              Autonomous evidence engine: plans, runs ML experiments, and verifies results so you know what was tested.
            </p>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Product</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link href="/app" className="text-[var(--text-soft)] hover:text-[var(--accent)]">
                  Run an experiment
                </Link>
              </li>
              <li>
                <a href="#how-it-works" className="text-[var(--text-soft)] hover:text-[var(--accent)]">
                  How it works
                </a>
              </li>
              <li>
                <a href="#capabilities" className="text-[var(--text-soft)] hover:text-[var(--accent)]">
                  Capabilities
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Resources</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <a href="#faq" className="text-[var(--text-soft)] hover:text-[var(--accent)]">
                  FAQ
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/anomalyco/evidence-ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--text-soft)] hover:text-[var(--accent)]"
                >
                  GitHub
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Legal</h3>
            <p className="mt-4 text-sm text-[var(--text-soft)]">Not financial advice.</p>
          </div>
        </div>
        <p className="mt-12 text-center text-xs text-[var(--muted)]">
          &copy; {year} Factum. AI agents should prove what they tested.
        </p>
      </div>
    </footer>
  );
}
