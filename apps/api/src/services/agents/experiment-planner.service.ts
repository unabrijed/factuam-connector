import { ExperimentPlanSchema, type ExperimentPlan } from "@factum/shared-types";
import { OpenAiJsonAgentService } from "../openai-json-agent.service";

function extractSchemaColumns(datasetSchema: unknown): string[] {
  const columns = Array.isArray((datasetSchema as { columns?: Array<{ name?: string }> })?.columns)
    ? (datasetSchema as { columns: Array<{ name?: string }> }).columns
        .map((column) => column.name)
        .filter((name): name is string => typeof name === "string" && name.length > 0)
    : [];
  return columns;
}

function buildWineValuePlan(input: { query: string; datasetSchema: unknown }): ExperimentPlan | null {
  const columns = new Set(extractSchemaColumns(input.datasetSchema).map((column) => column.toLowerCase()));
  const hasWineShape =
    columns.has("points") &&
    columns.has("price") &&
    columns.has("country") &&
    columns.has("variety");

  const query = input.query.toLowerCase();
  const looksLikeValueQuery =
    query.includes("value") ||
    query.includes("price") ||
    query.includes("points") ||
    query.includes("country-variety") ||
    query.includes("country and variety");

  if (!hasWineShape || !looksLikeValueQuery) {
    return null;
  }

  return {
    objective:
      "Predict wine review points from price and product/location attributes, then use the fitted signal to identify country-variety segments with strong quality relative to price.",
    taskType: "regression",
    targetColumn: "points",
    requiredColumns: ["price", "country", "variety"],
    optionalColumns: ["province", "region_1", "winery", "designation", "taster_name"].filter((column) => columns.has(column)),
    candidateModels: ["linear_regression", "random_forest_regressor", "xgboost_regressor"],
    baselineMethod: "mean_target_baseline",
    evaluationMetrics: ["rmse", "mae", "r2"],
    backtestMethod: "random_split",
    splitConfig: {
      trainSize: 0.8,
      testSize: 0.2
    },
    successCriteria: {
      minimumRows: 1000,
      minimumLiftOverBaseline: 5,
      minimumMetricValue: 0.1
    },
    limitations: [
      "This dataset is observational review data and does not prove causal drivers of value.",
      "Price coverage and review behavior may vary across countries and varieties.",
      "Missing text or sparse categories may reduce segment stability."
    ]
  };
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
    taskType:
      source.taskType ??
      (typeof source.targetColumn === "string" && source.targetColumn.toLowerCase().includes("point")
        ? "regression"
        : "regression"),
    targetColumn: source.targetColumn,
    requiredColumns: Array.isArray(source.requiredColumns) ? source.requiredColumns : [],
    optionalColumns: Array.isArray(source.optionalColumns) ? source.optionalColumns : [],
    candidateModels: source.candidateModels,
    baselineMethod: source.baselineMethod,
    evaluationMetrics: source.evaluationMetrics,
    backtestMethod: source.backtestMethod ?? source.dataSplittingMethod,
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

const systemPrompt = `You are the Factum experiment planner.
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
Choose targetColumn only from available columns.
Choose candidateModels from linear_regression, random_forest_regressor, xgboost_regressor, logistic_regression, random_forest_classifier, xgboost_classifier.
Choose baselineMethod and evaluationMetrics appropriate to taskType.
Use time_split if a valid date column exists for forecasting or time-oriented queries.
Success criteria must be conservative and honest.`;

export class ExperimentPlannerService {
  constructor(private readonly agent = new OpenAiJsonAgentService()) {}

  async run(input: { query: string; datasetSchema: unknown }): Promise<ExperimentPlan> {
    const winePlan = buildWineValuePlan(input);
    if (winePlan) {
      return winePlan;
    }

    const raw = await this.agent.run({
      systemPrompt,
      payload: input,
      schema: ExperimentPlanSchema.or(ExperimentPlanSchema.passthrough().transform((value) => value))
    });

    return ExperimentPlanSchema.parse(normalizeExperimentPlanShape(raw));
  }
}
