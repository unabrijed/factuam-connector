import { Card, SectionTitle } from "../ui";

const items = [
  {
    q: "How do I run an experiment?",
    a: "Open Run, pick a connector preset, edit the question if you want, and start the run. When it finishes, open the proof receipt from the run view."
  },
  { q: 'What does "verified" mean?', a: "System-assigned status from checks on the run — not legal proof." },
  { q: "Financial advice?", a: "No. You own decisions and compliance." },
  { q: "Different from chat?", a: "Built for one question, metrics, and a receipt." }
] as const;

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-28 pt-16 sm:pt-20">
      <Card className="space-y-6">
        <SectionTitle title="FAQ" />
        <div className="divide-y divide-[var(--border)] rounded-[24px] border border-[var(--border)] bg-[var(--surface)]">
          {items.map((item) => (
            <details key={item.q} className="group px-4 py-4 sm:px-5">
              <summary className="cursor-pointer list-none text-left text-sm font-medium text-[var(--text)] marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-3">
                  {item.q}
                  <span className="shrink-0 text-[var(--muted)] transition group-open:rotate-180">▾</span>
                </span>
              </summary>
              <p className="mt-3 text-sm leading-6 text-[var(--text-soft)]">{item.a}</p>
            </details>
          ))}
        </div>
      </Card>
    </section>
  );
}
