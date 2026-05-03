const steps = [
  {
    number: "01",
    title: "Ask",
    body: "Type your question. The system frames what evidence is needed and at what depth."
  },
  {
    number: "02",
    title: "Run",
    body: "Connectors fetch datasets, ML models train and backtest, results are recorded with metrics."
  },
  {
    number: "03",
    title: "Verify",
    body: "A structured proof receipt is generated — sources, hashes, verification status, timestamps."
  }
] as const;

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-28 pt-24 sm:pt-32">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-2xl font-bold tracking-tight text-[var(--text)] sm:text-3xl">
          How it works
        </h2>
        <p className="mt-3 text-sm text-[var(--text-soft)]">
          Three steps from question to verified answer.
        </p>
      </div>
      <div className="mt-12 grid gap-5 sm:grid-cols-3">
        {steps.map((step) => (
          <div
            key={step.number}
            className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 transition hover:border-[var(--accent)] hover:shadow-[var(--shadow-soft)]"
          >
            <span className="text-sm font-semibold tracking-wider text-[var(--accent)]">
              {step.number}
            </span>
            <h3 className="mt-3 text-lg font-semibold text-[var(--text)]">{step.title}</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">{step.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
