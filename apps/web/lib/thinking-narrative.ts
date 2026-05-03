export type ProgressEntry = {
  stage?: string;
  message?: string;
  ts?: string;
  details?: Record<string, unknown>;
};

type NarrativeEntry = {
  stage: string;
  message: string;
  details?: Record<string, unknown>;
  ts?: string;
};

const LABELS: Record<string, string> = {
  start: "Starting experiment",
  enqueue: "Experiment queued",
  auto_discovering: "Searching Kaggle for a matching dataset",
  auto_discovered: "Dataset found",
  auto_discover_acquired: "Dataset ready",
  classifying: "Analyzing your question",
  classification_complete: "Question analyzed",
  planning: "Building experiment plan",
  plan_ready: "Experiment plan ready",
  validating_data: "Validating dataset",
  validation_complete: "Dataset validation complete",
  diagnosing: "Reviewing dataset quality",
  diagnosis_complete: "Dataset review complete",
  training: "Running ML experiments",
  strategy_selected: "Choosing training approach",
  attempt_started: "Training models",
  attempt_completed: "Training run finished",
  attempt_failed: "Training run failed — retrying",
  training_complete: "Training complete",
  backtesting: "Checking results",
  verifying: "Verifying model outputs",
  verification_complete: "Verification complete",
  answer_ready: "Drafting final answer",
  generating_receipt: "Saving proof receipt",
  completed: "Run complete",
  user_guidance: "Processing your guidance",
  rerun_enqueued: "Re-running with your guidance"
};

function labelFor(stage: string | undefined): string {
  if (!stage) return "Thinking";
  return LABELS[stage.trim()] ?? stage.replace(/_/g, " ");
}

function pickNarrative(details: Record<string, unknown> | undefined, stage: string): string | null {
  if (!details) return null;

  const agent = details.agent as string | undefined;

  if (agent === "evidence_classifier") {
    const parts: string[] = [];
    const rt = details.evidenceType;
    const rl = details.riskLevel;
    const rr = details.reason;
    if (rl) parts.push(`**${rl} risk**`);
    if (rt && String(rt) !== "none") parts.push(`**${formatLabelCap(String(rt))}** task`);
    if (typeof rr === "string" && rr.length < 180) parts.push(rr);
    return parts.length ? parts.join(" · ") : "Determining if your question needs ML evidence.";
  }

  if (agent === "experiment_planner") {
    const parts: string[] = [];
    const tt = details.taskType;
    const tc = details.targetColumn;
    const cm = details.candidateModels;
    if (typeof tt === "string") parts.push(`Task: **${tt}**`);
    if (typeof tc === "string") parts.push(`target = \`${tc}\``);
    if (Array.isArray(cm) && cm.length <= 4) parts.push(`models: ${cm.map((m: unknown) => `\`${m}\``).join(", ")}`);
    return parts.length ? parts.join(", ") : "Planning the best ML approach for your data.";
  }

  if (agent === "strategy_agent") {
    const strategy = details.strategyKey ?? details.strategy;
    const rationale = details.rationale;
    if (typeof strategy === "string" && typeof rationale === "string" && rationale.length < 200) {
      return `**${String(strategy)}**: ${rationale}`;
    }
    if (typeof strategy === "string") return `Approach: **${String(strategy)}**`;
    return "Deciding on the best training strategy.";
  }

  if (agent === "training_agent") return "Training models on your dataset — this may take a moment.";

  if (agent === "reflection_agent") {
    const verdict = details.verdict;
    const summary = details.summary;
    if (typeof verdict === "string" && typeof summary === "string") {
      return `**${formatLabelCap(verdict)}**: ${summary.slice(0, 200)}`;
    }
    return null;
  }

  if (agent === "verifier") {
    const vs = details.verificationStatus ?? details.verification;
    const conf = details.confidence;
    const reason = details.reason;
    const parts: string[] = [];
    if (typeof vs === "string") parts.push(formatLabelCap(String(vs)));
    if (typeof conf === "string") parts.push(`${conf} confidence`);
    if (typeof reason === "string" && reason.length < 180) parts.push(reason);
    return parts.length ? parts.join(" · ") : "Checking model outputs against the plan.";
  }

  if (agent === "answer_generator") return "Writing the final answer with results and uncertainty.";

  if (agent === "validation_agent") {
    const passed = details.passed;
    const rowCount = details.rowCount;
    const colCount = details.columnCount;
    if (passed === false) return "Dataset validation failed — check data quality.";
    if (typeof rowCount === "number" && typeof colCount === "number") {
      return `Dataset looks good — ${rowCount} rows, ${colCount} columns.`;
    }
    return "Validating dataset structure and quality.";
  }

  if (agent === "diagnosis_agent") {
    const summary = details.summary;
    if (typeof summary === "string") return summary.slice(0, 280);
    return "Analyzing dataset features and recommending preprocessing.";
  }

  return null;
}

export function composeThinkingNarrative(entry: ProgressEntry): { title: string; text: string | null } {
  const stage = entry.stage ?? "";
  const title = labelFor(stage);
  const details = entry.details && typeof entry.details === "object"
    ? (entry.details as Record<string, unknown>)
    : undefined;
  const narrative = pickNarrative(details, stage);
  return { title, text: narrative };
}

export function formatLabelCap(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function composeThinkingSummary(
  progress: ProgressEntry[],
  latestStage: string | undefined,
  terminal: boolean
): string {
  const stage = latestStage ?? progress[progress.length - 1]?.stage;
  const verb = labelFor(stage);
  return terminal ? `${verb}` : `${verb}`;
}

export function composeFinalAnswerMeta(
  details: Record<string, unknown> | undefined
): { confidence?: string; lift?: string; datasetName?: string; rowCount?: number; columnCount?: number } {
  return {
    confidence: typeof details?.confidence === "string" ? String(details.confidence) : undefined,
    lift: typeof details?.lift === "string" ? String(details.lift) : undefined,
    datasetName: typeof details?.datasetName === "string" ? String(details.datasetName) : undefined,
    rowCount: typeof details?.rowCount === "number" ? (details.rowCount as number) : undefined,
    columnCount: typeof details?.columnCount === "number" ? (details.columnCount as number) : undefined
  };
}
