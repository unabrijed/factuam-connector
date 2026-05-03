"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDurationMs } from "../lib/agent-stage-labels";
import { formatLabel, ThinkingIndicator } from "./ui";
import type { ProgressEntry } from "../lib/thinking-narrative";

const PIPELINE_STEPS = [
  { key: "classifying", label: "Classify", icon: "✦" },
  { key: "planning", label: "Plan", icon: "◈" },
  { key: "validating_data", label: "Validate", icon: "⏣" },
  { key: "training", label: "Train", icon: "⟐" },
  { key: "backtesting", label: "Backtest", icon: "◷" },
  { key: "verifying", label: "Verify", icon: "✓" },
  { key: "generating_receipt", label: "Receipt", icon: "⬡" },
  { key: "completed", label: "Done", icon: "★" }
] as const;

type AgentPipelinePanelProps = {
  progress: ProgressEntry[];
  experimentStatus?: string;
  terminal: boolean;
  attemptCount?: number;
  maxAttempts?: number;
};

function parseTs(ts: string | undefined): number | null {
  if (!ts) return null;
  const n = Date.parse(ts);
  return Number.isNaN(n) ? null : n;
}

function stepIndex(key: string): number {
  return PIPELINE_STEPS.findIndex((s) => s.key === key);
}

function stageCompleted(
  progress: ProgressEntry[],
  stageKey: string,
  currentStep: string | null,
  terminal: boolean
): boolean {
  if (terminal) return true;
  const curIdx = currentStep ? stepIndex(currentStep) : -1;
  const idx = stepIndex(stageKey);
  if (curIdx >= 0 && idx >= 0 && idx < curIdx) return true;
  const completedKey = `${stageKey}_complete`;
  return progress.some(
    (p) =>
      p.stage === completedKey ||
      (p.stage === "validation_complete" && stageKey === "validating_data") ||
      (p.stage === "training_complete" && stageKey === "training") ||
      (p.stage === "verification_complete" && stageKey === "verifying") ||
      (p.stage === "completed" && stageKey === "generating_receipt")
  );
}

function findTransport(progress: ProgressEntry[]): string | null {
  for (const p of progress) {
    const t = p.details?.transport;
    if (typeof t === "string" && t.trim()) {
      return t.trim() === "axl" ? "Remote (AXL)" : t.trim() === "local" ? "Local" : t;
    }
  }
  return null;
}

function findAttemptInfo(progress: ProgressEntry[]): { current: number; max: number } | null {
  for (const p of [...progress].reverse()) {
    const details = p.details as Record<string, unknown> | undefined;
    if (details?.attemptNumber && typeof details.attemptNumber === "number") {
      return {
        current: details.attemptNumber as number,
        max: (details.maxAttempts as number) ?? (details.attemptNumber as number)
      };
    }
  }
  return null;
}

export function AgentPipelinePanel({
  progress,
  experimentStatus,
  terminal,
  attemptCount,
  maxAttempts
}: AgentPipelinePanelProps) {
  const [now, setNow] = useState(() => Date.now());
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (terminal) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [terminal]);

  useEffect(() => {
    if (!terminal) setExpanded(true);
  }, [terminal]);

  const transport = useMemo(() => findTransport(progress), [progress]);
  const attemptInfo = useMemo(() => findAttemptInfo(progress), [progress]);

  const currentStep = useMemo(() => {
    const status = experimentStatus?.toLowerCase() ?? "";
    for (const step of [...PIPELINE_STEPS].reverse()) {
      if (status.includes(step.key)) return step.key;
    }
    const lastProgress = progress[progress.length - 1];
    if (!lastProgress?.stage) return null;
    const stage = lastProgress.stage.toLowerCase();
    for (const step of PIPELINE_STEPS) {
      if (stage.includes(step.key)) return step.key;
    }
    return null;
  }, [experimentStatus, progress]);

  const elapsed = useMemo(() => {
    const first = progress[0];
    const last = progress[progress.length - 1];
    if (!first?.ts) return null;
    const t0 = parseTs(first.ts);
    if (!t0) return null;
    if (terminal && last?.ts) {
      const t1 = parseTs(last.ts);
      return t1 ? formatDurationMs(t1 - t0) : formatDurationMs(now - t0);
    }
    return formatDurationMs(now - t0);
  }, [progress, terminal, now]);

  if (!progress.length) return null;

  return (
    <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-strong)]/50">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-sm font-medium text-[var(--text)]">
            {terminal ? "Completed" : "Agent pipeline"}
          </span>
          {!terminal ? <ThinkingIndicator /> : null}
          {elapsed ? (
            <span className="text-[11px] tabular-nums text-[var(--muted)]">{elapsed}</span>
          ) : null}
          {transport ? (
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                transport.includes("Remote") || transport.includes("AXL")
                  ? "border-[color:rgba(217,139,0,0.22)] bg-[color:rgba(217,139,0,0.08)] text-[var(--warning)]"
                  : "border-[color:rgba(0,169,110,0.22)] bg-[var(--accent-faint)] text-[var(--success)]"
              }`}
            >
              {transport}
            </span>
          ) : null}
          {attemptInfo && attemptInfo.current > 0 ? (
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-[10px] text-[var(--text-soft)]">
              Attempt {attemptInfo.current}{attemptInfo.max && attemptInfo.max > 1 ? `/${attemptInfo.max}` : ""}
            </span>
          ) : attemptCount && attemptCount > 0 ? (
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-[10px] text-[var(--text-soft)]">
              Attempt {attemptCount}{maxAttempts && maxAttempts > 1 ? `/${maxAttempts}` : ""}
            </span>
          ) : null}
        </div>
        <span className="shrink-0 text-[11px] text-[var(--muted)]">
          {expanded ? "Hide" : "Show"}
        </span>
      </button>

      {expanded ? (
        <div className="border-t border-[var(--border)] px-4 py-3">
          <div className="flex flex-wrap gap-2">
            {PIPELINE_STEPS.map((step) => {
              const active = !terminal && currentStep === step.key;
              const completed = stageCompleted(progress, step.key, currentStep, terminal);
              const pending = !active && !completed;

              return (
                <div
                  key={step.key}
                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-all ${
                    active
                      ? "border-[color:rgba(0,169,110,0.4)] bg-[var(--accent-faint)] text-[var(--accent)]"
                      : completed
                        ? "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]"
                        : "border-[var(--border)] bg-transparent text-[var(--muted)]/50"
                  }`}
                >
                  <span className={active ? "opacity-70" : pending ? "opacity-30" : "opacity-50"}>
                    {step.icon}
                  </span>
                  <span>{step.label}</span>
                  {active ? (
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-thinking-pulse" />
                  ) : completed ? (
                    <span className="text-[var(--success)]">✓</span>
                  ) : null}
                </div>
              );
            })}
          </div>

          {progress.length > 1 ? (
            <div className="mt-3 max-h-48 overflow-y-auto space-y-1.5">
              {progress.map((p, i) => {
                const t0 = parseTs(p.ts);
                const next = progress[i + 1];
                const t1 = parseTs(next?.ts);
                const duration =
                  t0 && t1
                    ? formatDurationMs(t1 - t0)
                    : t0 && !terminal
                      ? `${formatDurationMs(now - t0)} …`
                      : null;
                const agent = p.details?.agent as string | undefined;
                const transport = p.details?.transport as string | undefined;

                return (
                  <div key={`${p.ts ?? "t"}-${i}`} className="flex items-start gap-2 rounded-lg px-2 py-1 text-xs">
                    <span className="mt-0.5 shrink-0 text-[var(--muted)]">
                      {i === progress.length - 1 && !terminal ? (
                        <span className="inline-block h-2 w-2 rounded-full bg-[var(--accent)] animate-thinking-pulse" />
                      ) : (
                        <span className="inline-block h-2 w-2 rounded-full bg-[var(--muted)]/40" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="text-[var(--text-soft)]">{p.message ?? p.stage}</span>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-[var(--muted)]">
                        {duration ? <span className="tabular-nums">{duration}</span> : null}
                        {agent ? <span>{formatLabel(String(agent))}</span> : null}
                        {transport ? (
                          <span className={transport === "axl" ? "text-[var(--warning)]" : "text-[var(--success)]"}>
                            {transport === "axl" ? "AXL" : transport}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
