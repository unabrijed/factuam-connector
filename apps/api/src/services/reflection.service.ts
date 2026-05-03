import type { AttemptReflection, FailureCategory } from "@factuam/shared-types";
import type { AttemptSummary } from "@factuam/agent-sdk";

export class ReflectionService {
  classifyFailure(message: string): FailureCategory {
    const text = message.toLowerCase();
    if (text.includes("missing required columns") || text.includes("target column")) return "schema_failure";
    if (text.includes("target") && (text.includes("invalid") || text.includes("empty") || text.includes("coerce"))) return "target_failure";
    if (text.includes("split") || text.includes("stratify")) return "split_failure";
    if (text.includes("preprocess") || text.includes("encoder") || text.includes("imputer")) return "preprocessing_failure";
    if (text.includes("xgboost") || text.includes("fit") || text.includes("training")) return "model_fit_failure";
    if (text.includes("verification")) return "verification_failure";
    if (text.includes("metric") || text.includes("lift")) return "metric_failure";
    return "infra_failure";
  }

  reflectSuccess(input: {
    attemptId: string;
    attemptNumber: number;
    bestModel: string;
    lift: number;
    success: boolean;
  }): AttemptReflection {
    return {
      attemptId: input.attemptId,
      verdict: input.success ? "success" : "weak_success",
      summary: input.success
        ? `Attempt ${input.attemptNumber} met current success criteria with ${input.bestModel}.`
        : `Attempt ${input.attemptNumber} produced a usable result but did not fully meet success criteria.`,
      failures: [],
      improvements: [
        `Best model: ${input.bestModel}`,
        `Lift over baseline: ${input.lift.toFixed(2)}%`
      ],
      nextActions: input.success
        ? ["Stop and verify the selected attempt."]
        : ["Consider an alternate feature strategy or model family before finalizing."]
    };
  }

  reflectFailure(input: { attemptId: string; attemptNumber: number; error: string }): AttemptReflection {
    return {
      attemptId: input.attemptId,
      verdict: "failed",
      failureCategory: this.classifyFailure(input.error),
      summary: `Attempt ${input.attemptNumber} failed before producing acceptable metrics.`,
      failures: [input.error],
      improvements: [],
      nextActions: ["Inspect the failure and choose a safer follow-up strategy."]
    };
  }

  summarizeAttempt(input: {
    attemptNumber: number;
    strategy: string;
    status: "success" | "failed";
    primaryMetric?: number;
    baselineMetric?: number;
    model?: string;
    overfitGap?: number;
    significant?: boolean;
    error?: string;
  }): AttemptSummary {
    return {
      attempt_number: input.attemptNumber,
      strategy: input.strategy,
      status: input.status,
      primary_metric: input.primaryMetric,
      baseline_metric: input.baselineMetric,
      model: input.model,
      overfit_gap: input.overfitGap,
      significant: input.significant,
      error: input.error
    };
  }
}
