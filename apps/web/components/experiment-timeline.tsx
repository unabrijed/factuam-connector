import { experimentStatuses } from "@factum/shared-types";
import clsx from "clsx";
import { formatLabel } from "./ui";

const ordered = [
  "CREATED",
  "CLASSIFYING",
  "PLANNING",
  "VALIDATING_DATA",
  "TRAINING",
  "BACKTESTING",
  "VERIFYING",
  "GENERATING_RECEIPT",
  "COMPLETED"
];

export function ExperimentTimeline({ status }: { status?: string }) {
  const currentIndex = ordered.indexOf(status ?? "CREATED");
  const failed = Boolean(status && !ordered.includes(status));

  return (
    <ol className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
      {ordered.map((step, index) => {
        const active = !failed && (index <= currentIndex || status === step);
        const terminalFailure = failed && step === ordered[ordered.length - 1];
        return (
          <li
            key={step}
            className={clsx(
              "rounded-[22px] border px-4 py-3 text-sm transition",
              active && "border-[color:rgba(120,210,255,0.36)] bg-[var(--accent-faint)] text-[var(--text)]",
              !active && !terminalFailure && "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]",
              terminalFailure && "border-[color:rgba(255,141,161,0.36)] bg-[color:rgba(255,141,161,0.12)] text-[var(--danger)]"
            )}
          >
            <div className="text-xs uppercase tracking-[0.22em] opacity-70">Step {index + 1}</div>
            <div className="mt-1 font-medium">{formatLabel(step)}</div>
            {terminalFailure && status ? <div className="mt-1 text-xs">{formatLabel(status)}</div> : null}
          </li>
        );
      })}
    </ol>
  );
}
