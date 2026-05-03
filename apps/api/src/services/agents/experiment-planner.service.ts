import { ExperimentPlanSchema, type ExperimentPlan } from "@factuam/shared-types";
import { OpencodeJsonAgentService } from "../opencode-json-agent.service";

function extractSchemaColumns(datasetSchema: unknown): string[] {
  const columns = Array.isArray((datasetSchema as { columns?: Array<{ name?: string }> })?.columns)
    ? (datasetSchema as { columns: Array<{ name?: string }> }).columns
        .map((column) => column.name)
        .filter((name): name is string => typeof name === "string" && name.length > 0)
    : [];
  return columns;
}

function normalizeExperimentPlanShape(input: unknown): unknown {
  if (!input || typeof input !== "object") return input;

  const root = input as Record<string, unknown>;
  const source =
    root.experimentPlan && typeof root.experimentPlan === "object"
      ? (root.experimentPlan as Record<string, unknown>)
      : root;

  const successCriteria =
    source.successCriteria && typeof source.successCriteria === "object"
      ? (source.successCriteria as Record<string, unknown>)
      : {};

  const parseNumber = (value: unknown, fallback?: number) => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const match = value.match(/-?\d+(?:\.\d+)?/);
      if (match) return Number(match[0]);
    }
    return fallback;
  };

  return {
    objective: source.objective ?? source.notes ?? "Build a realistic tabular ML plan for the query using the available dataset schema.",
    taskType: source.taskType ?? "regression",
    targetColumn: source.targetColumn,
    requiredColumns: Array.isArray(source.requiredColumns) ? source.requiredColumns : [],
    optionalColumns: Array.isArray(source.optionalColumns) ? source.optionalColumns : [],
    candidateModels: source.candidateModels,
    baselineMethod: source.baselineMethod,
    evaluationMetrics: source.evaluationMetrics,
    backtestMethod: source.backtestMethod ?? source.dataSplittingMethod ?? "random_split",
    splitConfig:
      source.splitConfig && typeof source.splitConfig === "object"
        ? source.splitConfig
        : {},
    successCriteria: {
      minimumRows: parseNumber(successCriteria.minimumRows, 100),
      minimumLiftOverBaseline: parseNumber(successCriteria.minimumLiftOverBaseline, 0),
      minimumMetricValue: parseNumber(successCriteria.minimumMetricValue ?? successCriteria.r2)
    },
    limitations: Array.isArray(source.limitations)
      ? source.limitations
      : [typeof source.notes === "string" ? source.notes : "Plan was normalized from a partially structured model response."]
  };
}

const systemPrompt = `You are the factuam experiment planner.
Return JSON only.
Return a single top-level object with exactly these keys:
- objective: string
- taskType: one of classification, regression, ranking, forecasting
- targetColumn: string
- requiredColumns: string[]
- optionalColumns: string[]
- candidateModels: string[]
- baselineMethod: string
- evaluationMetrics: string[]
- backtestMethod: one of random_split, time_split, walk_forward, holdout
- splitConfig: object with optional trainSize, testSize, timeColumn, numberOfFolds
- successCriteria: object with minimumRows, minimumLiftOverBaseline, optional minimumMetricValue
- limitations: string[]
Do not wrap the result in an "experimentPlan" key.
Build a realistic tabular ML/backtesting plan from the query and dataset schema.
Prefer simple deterministic plans for MVP.
Choose targetColumn only from available columns listed in the dataset schema.
Choose candidateModels from linear_regression, random_forest_regressor, xgboost_regressor, logistic_regression, random_forest_classifier, xgboost_classifier.
Choose baselineMethod and evaluationMetrics appropriate to taskType.
Use time_split if a valid date column exists for forecasting or time-oriented queries.
Success criteria must be conservative and honest.`;

export class ExperimentPlannerService {
  constructor(private readonly agent = new OpencodeJsonAgentService()) {}

  async run(input: { query: string; datasetSchema: unknown }): Promise<ExperimentPlan> {
    const raw = await this.agent.run({
      systemPrompt,
      payload: {
        ...input,
        availableColumns: extractSchemaColumns(input.datasetSchema)
      },
      schema: ExperimentPlanSchema.or(ExperimentPlanSchema.passthrough().transform((value) => value))
    });

    return ExperimentPlanSchema.parse(normalizeExperimentPlanShape(raw));
  }
}
