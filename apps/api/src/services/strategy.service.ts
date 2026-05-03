import type { DatasetDiagnosis, ExperimentPlan, StrategyDecision } from "@factuam/shared-types";
import type { AttemptSummary } from "@factuam/agent-sdk";

export type StrategyServiceResult = StrategyDecision & {
  notes: string;
  plan: ExperimentPlan;
};

export class StrategyService {
  decide(input: {
    attemptNumber: number;
    plan: ExperimentPlan;
    diagnosis: DatasetDiagnosis;
    previousAttempts: AttemptSummary[];
    userGuidance?: string[];
  }): StrategyServiceResult {
    const { attemptNumber, plan, diagnosis, previousAttempts, userGuidance = [] } = input;
    const guidanceText = userGuidance.join(" ").toLowerCase();
    const triedStrategies = new Set(previousAttempts.map((attempt) => attempt.strategy));
    const preserveText = guidanceText.includes("don't drop text") || guidanceText.includes("preserve text");

    let strategyKey = "base_plan";
    let notes = "Use the planner-selected feature set and candidate models.";
    let nextPlan = plan;

    if (attemptNumber === 1) {
      strategyKey = preserveText ? "text_preserve" : "base_plan";
      notes = preserveText
        ? "User requested preserving text-like columns, so keep them in optional features for the first attempt."
        : notes;
    } else if (diagnosis.targetQuality !== "clean" && !triedStrategies.has("target_repair")) {
      strategyKey = "target_repair";
      notes = "Target quality is not clean, so prioritize target repair and simpler candidate models.";
      nextPlan = {
        ...plan,
        candidateModels:
          plan.taskType === "regression"
            ? ["linear_regression", "random_forest_regressor"]
            : plan.taskType === "classification"
              ? ["logistic_regression", "random_forest_classifier"]
              : plan.candidateModels
      };
    } else if (diagnosis.textStrategy === "featureize" && preserveText && !triedStrategies.has("text_preserve")) {
      strategyKey = "text_preserve";
      notes = "Diagnosis suggests text may help, and user guidance supports keeping text features.";
    } else if (diagnosis.highCardinalityColumns.length > 0 && !triedStrategies.has("category_compression")) {
      strategyKey = "category_compression";
      notes = "High-cardinality columns may be hurting generalization, so simplify optional features.";
      nextPlan = {
        ...plan,
        optionalColumns: plan.optionalColumns.filter((column) => !diagnosis.highCardinalityColumns.includes(column))
      };
    } else if ((diagnosis.identifierLikeColumns.length > 0 || diagnosis.textColumns.length > 0) && !triedStrategies.has("structured_only")) {
      strategyKey = "structured_only";
      notes = "Identifier/text-heavy columns may be noisy, so try a structured-only fallback.";
      nextPlan = {
        ...plan,
        optionalColumns: plan.optionalColumns.filter((column) => !diagnosis.identifierLikeColumns.includes(column) && !diagnosis.textColumns.includes(column))
      };
    } else {
      strategyKey = "simple_model_fallback";
      notes = "Fallback to simpler models and the smallest stable feature set.";
      nextPlan = {
        ...plan,
        optionalColumns: plan.optionalColumns.filter((column) => !diagnosis.identifierLikeColumns.includes(column)),
        candidateModels:
          plan.taskType === "regression"
            ? ["random_forest_regressor", "linear_regression"]
            : plan.taskType === "classification"
              ? ["random_forest_classifier", "logistic_regression"]
              : plan.candidateModels
      };
    }

    return {
      attemptNumber,
      strategyKey,
      rationale: notes,
      changes: [
        `Candidate models: ${nextPlan.candidateModels.join(", ")}`,
        `Optional columns: ${nextPlan.optionalColumns.join(", ") || "none"}`
      ],
      stopAfterAttempt: false,
      notes,
      plan: nextPlan
    };
  }
}
