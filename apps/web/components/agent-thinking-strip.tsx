"use client";

import { useEffect, useMemo, useState } from "react";
import { friendlyStageLabel, formatDurationMs, stepsRemainingHint } from "../lib/agent-stage-labels";

export type ProgressEntry = {
  stage?: string;
  message?: string;
  ts?: string;
  details?: Record<string, unknown>;
};

type AgentThinkingStripProps = {
  progress: ProgressEntry[];
  latestStage?: string;
  experimentStatus?: string;
  /** When false, last row shows live elapsed */
  terminal: boolean;
};

function parseTs(ts: string | undefined): number | null {
  if (!ts) return null;
  const n = Date.parse(ts);
  return Number.isNaN(n) ? null : n;
}

export function AgentThinkingStrip({ progress, latestStage, experimentStatus, terminal }: AgentThinkingStripProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (terminal) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [terminal]);

  const rows = useMemo(() => {
    const list = [...progress];
    const out: Array<{
      key: string;
      label: string;
      message: string;
      at: string;
      durationLabel: string;
    }> = [];

    for (let i = 0; i < list.length; i += 1) {
      const cur = list[i];
      if (!cur) continue;
      const next = list[i + 1];
      const t0 = parseTs(cur.ts);
      const t1 = parseTs(next?.ts);
      let durationLabel = "—";
      if (t0 != null && t1 != null) {
        durationLabel = formatDurationMs(t1 - t0);
      } else if (t0 != null && !terminal) {
        durationLabel = `${formatDurationMs(now - t0)} …`;
      } else if (t0 != null && terminal) {
        durationLabel = "—";
      }
      out.push({
        key: `${cur.ts ?? "t"}-${i}-${cur.stage ?? ""}`,
        label: friendlyStageLabel(cur.stage),
        message: cur.message ?? "",
        at: cur.ts ? new Date(cur.ts).toLocaleTimeString() : "—",
        durationLabel
      });
    }
    return out;
  }, [progress, terminal, now]);

  const collapsedSummary = useMemo(() => {
    const stage = latestStage ?? progress[progress.length - 1]?.stage;
    const verb = friendlyStageLabel(stage);
    return terminal ? `Run finished · ${verb}` : `Working · ${verb}`;
  }, [latestStage, progress, terminal]);

  const eta = stepsRemainingHint(experimentStatus);

  if (!progress.length && terminal) {
    return null;
  }

  return (
    <details className="group rounded-[20px] border border-[var(--border)] bg-[var(--surface-strong)]/60 text-sm">
      <summary className="cursor-pointer list-none px-4 py-3 [&::-webkit-details-marker]:hidden">
        <div className="flex items-center justify-between gap-3">
          <span className="font-medium text-[var(--text)]">{collapsedSummary}</span>
          <span className="text-[11px] text-[var(--muted)]">Show steps</span>
        </div>
        {eta ? <p className="mt-1 text-xs text-[var(--muted)]">{eta}</p> : null}
      </summary>
      <div className="max-h-64 overflow-y-auto border-t border-[var(--border)] px-3 py-2">
        {!rows.length ? (
          <p className="px-2 py-3 text-xs text-[var(--muted)]">Detailed steps will appear as the run progresses.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => (
              <li
                key={row.key}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text-soft)]"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium text-[var(--text)]">{row.label}</span>
                  <span className="tabular-nums text-[var(--muted)]">{row.durationLabel}</span>
                </div>
                {row.message ? <p className="mt-1 leading-5">{row.message}</p> : null}
                <p className="mt-1 text-[11px] text-[var(--muted)]">{row.at}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}
