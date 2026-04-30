import Link from "next/link";
import { Badge } from "../ui";

export function HeroSection() {
  return (
    <section className="relative pt-10 sm:pt-14 lg:pt-20">
      <div className="mx-auto max-w-4xl text-center">
        <Badge tone="accent" className="mb-6">
          AI agents should prove what they tested
        </Badge>
        <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-[var(--text)] sm:text-5xl md:text-6xl lg:text-7xl">
          Ask a question.
          <br />
          Get a tested answer.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-7 text-[var(--text-soft)] sm:text-lg">
          Factum plans evidence, runs connector-backed experiments, and returns structured proof receipts—not generic chat replies.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/app"
            className="inline-flex w-full items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] px-6 py-3.5 text-sm font-semibold text-slate-950 shadow-[0_12px_34px_rgba(87,181,255,0.28)] transition hover:scale-[1.02] sm:w-auto"
          >
            Run an experiment
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex w-full items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-strong)] px-6 py-3.5 text-sm font-medium text-[var(--text)] transition hover:border-[var(--accent)] sm:w-auto"
          >
            How it works
          </a>
        </div>
      </div>
    </section>
  );
}
