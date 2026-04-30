"use client";

import clsx from "clsx";

const stages = [
  { id: "download", label: "Download" },
  { id: "normalize", label: "Normalize" },
  { id: "upload_0g", label: "Upload to 0G" },
  { id: "enqueue", label: "Enqueue" },
  { id: "run", label: "Run" },
  { id: "completed", label: "Done" }
] as const;

export function ConnectorStageTimeline({
  stage,
  failed
}: {
  stage?: string;
  failed?: boolean;
}) {
  const currentIndex = stage ? stages.findIndex((item) => item.id === stage) : -1;

  return (
    <ol className="grid gap-2 sm:grid-cols-3">
      {stages.map((item, index) => {
        const active = !failed && currentIndex >= index;
        const current = item.id === stage;
        return (
          <li
            key={item.id}
            className={clsx(
              "rounded-2xl border px-3 py-2 text-xs transition",
              failed && current && "border-[color:rgba(255,141,161,0.36)] bg-[color:rgba(255,141,161,0.12)] text-[var(--danger)]",
              !failed && active && "border-[color:rgba(120,210,255,0.36)] bg-[var(--accent-faint)] text-[var(--text)]",
              !failed && !active && "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]"
            )}
          >
            <div className="text-[10px] uppercase tracking-[0.16em] opacity-70">Step {index + 1}</div>
            <div className="mt-1 font-medium">{item.label}</div>
          </li>
        );
      })}
    </ol>
  );
}
