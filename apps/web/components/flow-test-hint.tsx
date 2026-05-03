"use client";

import { workflowPresetsConfig } from "../lib/workflow-presets";
import { Badge, Card, SectionTitle } from "./ui";

/** Dev: sample CSV + presets. Shown in development or when NEXT_PUBLIC_SHOW_FLOW_TEST_PANEL=1 */
export function FlowTestHint() {
  const show =
    process.env.NEXT_PUBLIC_SHOW_FLOW_TEST_PANEL === "1" || process.env.NODE_ENV === "development";
  if (!show) return null;

  const { sampleDataset, presets } = workflowPresetsConfig;

  return (
    <Card className="border-[color:rgba(0,169,110,0.22)] bg-[var(--accent-faint)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionTitle title="Dev check" subtitle="demo-campaigns.csv → Data → Ask → Run" />
        <Badge tone="accent">dev</Badge>
      </div>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-[var(--text-soft)]">
        <li>
          <a
            className="font-medium text-[var(--accent)] underline underline-offset-4"
            href={sampleDataset.publicPath}
            download
          >
            demo-campaigns.csv
          </a>
        </li>
        <li>Upload in Data, pick a preset in Ask, Run.</li>
      </ol>
      <details className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-xs text-[var(--muted)]">
        <summary className="cursor-pointer text-[var(--text-soft)]">Preset ids</summary>
        <ul className="mt-2 grid gap-1 sm:grid-cols-2">
          {presets.map((p) => (
            <li key={p.id}>
              <code>{p.id}</code>
              {p.note ? ` — ${p.note}` : null}
            </li>
          ))}
        </ul>
      </details>
    </Card>
  );
}
