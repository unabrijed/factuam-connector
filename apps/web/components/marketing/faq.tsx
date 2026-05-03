const items = [
  {
    q: "How do I run an experiment?",
    a: "Open the Run page, pick a connector preset or type a query to auto-discover a dataset, then start the run. When it finishes, open the proof receipt from the run view."
  },
  {
    q: 'What does "verified" mean?',
    a: "System-assigned status from checks on the run — models were trained, metrics computed, and results matched the plan. Not legal or financial proof."
  },
  {
    q: "Is this financial advice?",
    a: "No. factuam runs ML experiments and reports results. You own all decisions and compliance responsibilities."
  },
  {
    q: "How is this different from ChatGPT?",
    a: "factuam runs real ML experiments on datasets with training, backtesting, and verification. It returns metrics, lift scores, and proof receipts — not just text."
  },
  {
    q: "What datasets can I use?",
    a: "Upload CSVs, use Kaggle public datasets (auto-discovered or via search), or import from URLs. More connectors coming soon."
  }
] as const;

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-28 pt-24 sm:pt-32">
      <div className="mx-auto max-w-2xl">
        <h2 className="text-center text-2xl font-bold tracking-tight text-[var(--text)] sm:text-3xl">
          FAQ
        </h2>
        <div className="mt-12 divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
          {items.map((item) => (
            <details key={item.q} className="group">
              <summary className="cursor-pointer list-none px-5 py-4 text-left text-sm font-medium text-[var(--text)] marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-3">
                  {item.q}
                  <span className="shrink-0 text-sm text-[var(--muted)] transition group-open:rotate-180">▾</span>
                </span>
              </summary>
              <p className="px-5 pb-4 text-sm leading-6 text-[var(--text-soft)]">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
