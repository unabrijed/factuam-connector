import { Card, SectionTitle } from "../ui";

const steps = [
  { title: "Prompt", body: "You ask; the system frames what counts as evidence." },
  { title: "Plan", body: "An evidence plan and the right depth of analysis." },
  { title: "Run", body: "Connector presets execute your question; metrics and baselines are recorded." },
  { title: "Verify", body: "Structured receipt: sources, hashes, status." }
] as const;

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-28 pt-24 sm:pt-28">
      <Card className="space-y-8">
        <SectionTitle title="How it works" />
        <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <li key={step.title} className="relative rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-faint)] text-sm font-bold text-[var(--text)]">
                {i + 1}
              </div>
              <h3 className="text-base font-semibold text-[var(--text)]">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-[var(--text-soft)]">{step.body}</p>
            </li>
          ))}
        </ol>
      </Card>
    </section>
  );
}
