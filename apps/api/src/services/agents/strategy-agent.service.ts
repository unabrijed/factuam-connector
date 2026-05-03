import type { DatasetDiagnosis, ExperimentPlan, StrategyDecision } from "@factuam/shared-types";
import { StrategyDecisionSchema } from "@factuam/shared-types";
import type { AttemptSummary } from "@factuam/agent-sdk";
import { z } from "zod";
import { OpencodeJsonAgentService } from "../opencode-json-agent.service";

const StrategyResultSchema = StrategyDecisionSchema.extend({
  notes: z.string(),
  plan: z.object({}).passthrough(),
  stopAfterAttempt: z.boolean().default(false)
});

export type StrategyServiceResult = z.infer<typeof StrategyResultSchema>;

const systemPrompt = `You are the factuam experiment strategy agent. You decide the best ML training approach for each attempt.

You receive:
- attemptNumber: which attempt this is (1-4)
- plan: the current experiment plan (taskType, targetColumn, requiredColumns, optionalColumns, candidateModels, backtestMethod, splitConfig, successCriteria, evaluationMetrics)
- diagnosis: dataset diagnosis (targetKind, targetQuality, taskTypeFit, highMissingColumns, highCardinalityColumns, textColumns, datetimeColumns, leakageRisks, identifierLikeColumns, likelyUsefulColumns, likelyHarmfulColumns, textStrategy, recommendedActions)
- previousAttempts: summaries of prior attempts with strategy, status, metrics, errors
- userGuidance: any user messages providing direction

Your job:
1. Analyze the plan, diagnosis, and previous attempts
2. Decide the best strategy for this attempt
3. Modify the plan if needed (change candidate models, adjust optional columns, etc.)
4. Decide whether to stop after this attempt

Available candidate models:
- Regression: linear_regression, random_forest_regressor, xgboost_regressor
- Classification: logistic_regression, random_forest_classifier, xgboost_classifier
- Ranking/Forecasting: linear_regression, random_forest_regressor, xgboost_regressor

Available backtest methods: random_split, time_split, walk_forward, holdout

Strategy guidance:
- On attempt 1: use the full plan as-is unless diagnosis shows clear problems
- If diagnosis shows target quality is NOT clean: simplify to fewer, more robust models
- If previous attempts failed: analyze the error, try a different approach (fewer features, different models, different split)
- If previous attempts succeeded but didn't meet success criteria: try more complex models or add useful features
- If text columns exist and textStrategy is "featureize": consider including them
- If high-cardinality columns exist: consider dropping them for simpler runs
- If identifier-like columns exist: exclude them — they cause leakage
- Use likelyUsefulColumns; avoid likelyHarmfulColumns
- Stop after attempt (stopAfterAttempt: true) only if the result clearly meets success criteria
- Choose a descriptive strategyKey: "base_plan", "target_repair", "text_preserve", "category_compression", "structured_only", "simple_model_fallback", or invent a new one

Return JSON with:
- attemptNumber: number
- strategyKey: string describing the strategy
- rationale: string explaining why this strategy was chosen
- changes: array of short strings describing what changed from the base plan
- stopAfterAttempt: boolean (usually false unless you're very confident this will succeed)
- notes: string with additional context
- plan: the complete experiment plan (may be modified from input) with taskType, targetColumn, requiredColumns, optionalColumns, candidateModels, backtestMethod, splitConfig, successCriteria, evaluationMetrics, objective, limitations, baselineMethod`;

export class StrategyAgentService {
  constructor(private readonly agent = new OpencodeJsonAgentService()) {}

  async run(input: {
    attemptNumber: number;
    plan: ExperimentPlan;
    diagnosis: DatasetDiagnosis;
    previousAttempts: AttemptSummary[];
    userGuidance?: string[];
  }): Promise<StrategyServiceResult> {
    const result = await this.agent.run({
      systemPrompt,
      payload: input,
      schema: StrategyResultSchema
    });

    return {
      ...result,
      plan: result.plan as ExperimentPlan,
      notes: result.notes ?? "",
      stopAfterAttempt: result.stopAfterAttempt ?? false
    };
  }
}
