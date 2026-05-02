"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { friendlyStageLabel, formatDurationMs, stepsRemainingHint } from "../lib/agent-stage-labels";
import {
  friendlyProgressAgentLabel,
  progressDetailLines,
  transportLabel
} from "../lib/progress-details";
import { Badge } from "./ui";

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
  /** While the run is active, keep the step list expanded until the user collapses it */
  defaultOpenWhileRunning?: boolean;
};

function parseTs(ts: string | undefined): number | null {
  if (!ts) return null;
  const n = Date.parse(ts);
  return Number.isNaN(n) ? null : n;
}

function ProgressDetailsBlock({ details }: { details?: Record<string, unknown> }) {
  if (!details || typeof details !== "object") return null;
  const agent = friendlyProgressAgentLabel(details.agent);
  const transport = transportLabel(details.transport);
  const lines = progressDetailLines(details);
  if (!agent && !transport && lines.length === 0) return null;
  return (
    <div className="mt-2 space-y-2 border-t border-[var(--border)]/80 pt-2">
      <div className="flex flex-wrap gap-1.5">
        {agent ? (
          <Badge tone="accent" className="text-[10px] font-normal">
            {agent}
          </Badge>
        ) : null}
        {transport ? (
          <Badge className="text-[10px] font-normal">
            {transport}
          </Badge>
        ) : null}
      </div>
      {lines.length ? (
        <dl className="space-y-1 text-[11px] leading-relaxed text-[var(--muted)]">
          {lines.map(({ key, value }) => (
            <div key={key} className="grid gap-x-2 [grid-template-columns:auto_1fr]">
              <dt className="shrink-0 capitalize text-[var(--text-soft)]">{key}</dt>
              <dd className="min-w-0 break-words font-mono">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}

export function AgentThinkingStrip({
  progress,
  latestStage,
  experimentStatus,
  terminal,
  defaultOpenWhileRunning = true
}: AgentThinkingStripProps) {
  const [now, setNow] = useState(() => Date.now());
  const [open, setOpen] = useState(() => defaultOpenWhileRunning && !terminal);
  const prevTerminal = useRef(terminal);

  useEffect(() => {
    if (terminal) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [terminal]);

  useEffect(() => {
    if (prevTerminal.current && !terminal) {
      setOpen(defaultOpenWhileRunning);
    }
    if (!prevTerminal.current && terminal) {
      setOpen(false);
    }
    prevTerminal.current = terminal;
  }, [terminal, defaultOpenWhileRunning]);

  const rows = useMemo(() => {
    const list = [...progress];
    const out: Array<{
      key: string;
      label: string;
      message: string;
      at: string;
      durationLabel: string;
      details?: Record<string, unknown>;
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
        durationLabel,
        details: cur.details && typeof cur.details === "object" ? cur.details : undefined
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
    <details
      className="group rounded-[20px] border border-[var(--border)] bg-[var(--surface-strong)]/60 text-sm"
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary className="cursor-pointer list-none px-4 py-3 [&::-webkit-details-marker]:hidden">
        <div className="flex items-center justify-between gap-3">
          <span className="font-medium text-[var(--text)]">{collapsedSummary}</span>
          <span className="text-[11px] text-[var(--muted)]">{open ? "Hide steps" : "Show steps"}</span>
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
                <ProgressDetailsBlock details={row.details} />
                <p className="mt-1 text-[11px] text-[var(--muted)]">{row.at}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}
