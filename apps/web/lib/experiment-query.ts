export const EXPERIMENT_TERMINAL_STATUSES = new Set([
  "COMPLETED",
  "FAILED_CLASSIFICATION",
  "FAILED_PLANNING",
  "FAILED_DATA_VALIDATION",
  "FAILED_TRAINING",
  "FAILED_BACKTESTING",
  "FAILED_VERIFICATION",
  "FAILED_AXL_TRANSPORT",
  "FAILED_RECEIPT_GENERATION",
  "REJECTED_NO_EVIDENCE_NEEDED",
  "REJECTED_INSUFFICIENT_DATA",
  "REJECTED_DATA_LEAKAGE",
  "REJECTED_MODEL_UNDERPERFORMED",
  "REJECTED_LOW_CONFIDENCE"
]);

export function isExperimentTerminal(status: string | undefined) {
  return Boolean(status && EXPERIMENT_TERMINAL_STATUSES.has(status));
}

export function experimentPollIntervalMs(data: { status?: string } | undefined) {
  return isExperimentTerminal(data?.status) ? false : 3000;
}
