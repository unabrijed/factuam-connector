import Link from "next/link";

export function HeroSection() {
  return (
    <section className="relative pt-14 sm:pt-20 lg:pt-28">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-balance text-4xl font-bold leading-[1.08] tracking-tight text-[var(--text)] sm:text-5xl md:text-6xl lg:text-7xl">
          Ask a question.
          <br />
          Get a tested answer.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-pretty text-base leading-7 text-[var(--text-soft)] sm:text-lg">
          factuam plans evidence, runs experiments, and returns verified proof receipts — not generic chat replies.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/app"
            className="inline-flex items-center justify-center rounded-xl bg-[var(--accent)] px-7 py-3.5 text-base font-semibold text-white shadow-[0_4px_16px_rgba(0,169,110,0.2)] transition hover:bg-[var(--accent-strong)] hover:shadow-[0_4px_20px_rgba(0,169,110,0.3)]"
          >
            Run an experiment
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center justify-center rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-7 py-3.5 text-base font-medium text-[var(--text)] transition hover:border-[var(--accent)] hover:bg-[var(--accent-faint)]"
          >
            How it works
          </a>
        </div>
      </div>
    </section>
  );
}
