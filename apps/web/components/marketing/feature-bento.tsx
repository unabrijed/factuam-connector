import { Badge, Card, SectionTitle } from "../ui";

const modes = [
  { title: "Ask mode", description: "Prompt-first workflow; the system frames evidence and depth.", status: "Vision" as const },
  { title: "Connector mode", description: "Ready presets in Run today; more APIs and webhooks on the roadmap.", status: "Live" as const },
  { title: "Upload mode", description: "CSV and private datasets as an additional path.", status: "Next" as const }
];

const ladder = ["Reasoning", "Retrieval", "Stats", "ML", "Trees", "Backtest"];

function statusTone(s: (typeof modes)[number]["status"]) {
  if (s === "Live") return "success" as const;
  if (s === "Next") return "accent" as const;
  return "default" as const;
}

export function FeatureBento() {
  return (
    <section id="capabilities" className="scroll-mt-28 pt-16 sm:pt-20">
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="space-y-5 xl:col-span-2">
          <SectionTitle title="Capabilities" />
          <div className="grid gap-4 sm:grid-cols-3">
            {modes.map((mode) => (
              <div key={mode.title} className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-strong)] p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-base font-semibold text-[var(--text)]">{mode.title}</h3>
                  <Badge tone={statusTone(mode.status)}>{mode.status}</Badge>
                </div>
                <p className="text-sm text-[var(--text-soft)]">{mode.description}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card className="space-y-4">
          <SectionTitle title="Depth" />
          <ul className="space-y-2">
            {ladder.map((step, index) => (
              <li
                key={step}
                className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-soft)]"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent-faint)] text-xs font-semibold text-[var(--text)]">
                  {index}
                </span>
                {step}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </section>
  );
}
