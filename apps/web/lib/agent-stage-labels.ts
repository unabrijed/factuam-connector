/** Maps orchestrator `appendProgress` stage keys to short, non-ML UX labels. */
const STAGE_LABELS: Record<string, string> = {
  start: "Starting",
  enqueue: "Queued",
  classifying: "Classifying",
  classification_complete: "Classified",
  planning: "Planning",
  plan_ready: "Plan ready",
  validating_data: "Validating data",
  validation_complete: "Validation done",
  diagnosing: "Reviewing data",
  diagnosis_complete: "Review complete",
  training: "Running experiments",
  strategy_selected: "Choosing approach",
  attempt_started: "Trying a run",
  attempt_completed: "Run finished",
  attempt_failed: "Run retry",
  training_complete: "Training wrapped up",
  backtesting: "Checking results",
  verifying: "Verifying",
  verification_complete: "Verified",
  answer_ready: "Drafting answer",
  generating_receipt: "Saving proof",
  completed: "Done",
  failed: "Stopped"
};

export function friendlyStageLabel(stage: string | undefined): string {
  if (!stage) return "Working";
  const key = stage.trim().toLowerCase();
  return STAGE_LABELS[key] ?? stage.replace(/_/g, " ");
}

const PIPELINE_ORDER = [
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

/** Rough “steps left” hint from experiment machine status (not wall-clock ETA). */
export function stepsRemainingHint(status: string | undefined): string | null {
  if (!status) return null;
  const idx = PIPELINE_ORDER.indexOf(status);
  if (idx === -1) {
    if (status === "COMPLETED") return null;
    return "Finishing up or recovering from an issue…";
  }
  const remaining = PIPELINE_ORDER.length - 1 - idx;
  if (remaining <= 0) return null;
  if (remaining === 1) return "About one major step left (heuristic).";
  return `About ${remaining} major steps left (heuristic).`;
}

export function formatDurationMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.round((ms % 60_000) / 1000);
  return `${m}m ${s}s`;
}
