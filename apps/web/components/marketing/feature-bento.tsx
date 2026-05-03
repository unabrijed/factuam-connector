const features = [
  {
    icon: "◈",
    title: "Evidence planning",
    body: "Classifies your query, determines if ML is needed, and builds an experiment plan with target columns and candidate models."
  },
  {
    icon: "⟐",
    title: "Pipeline execution",
    body: "Runs classification, validation, diagnosis, training, backtesting, and verification — up to 4 training attempts with reflection."
  },
  {
    icon: "✓",
    title: "Proof receipts",
    body: "Generates cryptographic proof receipts with dataset hashes, model artifacts, metrics, and verification status on-chain."
  },
  {
    icon: "⬡",
    title: "Connector ecosystem",
    body: "Kaggle datasets, CSV uploads, URL imports. Auto-discovers datasets from prompts when none is provided."
  },
  {
    icon: "✦",
    title: "AXL / Gensyn ready",
    body: "Agents can run locally or remotely via AXL mesh transport. ML training delegates to Gensyn worker with live status."
  },
  {
    icon: "◷",
    title: "Structured output",
    body: "Every run returns a final answer with confidence score, lift over baseline, and a verifiable receipt — not just text."
  }
] as const;

export function FeatureBento() {
  return (
    <section id="capabilities" className="scroll-mt-28 pt-24 sm:pt-32">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-2xl font-bold tracking-tight text-[var(--text)] sm:text-3xl">
          Capabilities
        </h2>
        <p className="mt-3 text-sm text-[var(--text-soft)]">
          Everything you need to run evidence-backed experiments.
        </p>
      </div>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div
            key={f.title}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:border-[var(--accent)]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent-faint)] text-base text-[var(--accent)]">
              {f.icon}
            </span>
            <h3 className="mt-3 text-base font-semibold text-[var(--text)]">{f.title}</h3>
            <p className="mt-1.5 text-sm leading-6 text-[var(--text-soft)]">{f.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
