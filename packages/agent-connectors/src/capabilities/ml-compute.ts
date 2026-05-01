import { z } from "zod";
import { ExperimentPlanSchema } from "@factum/shared-types";
import type { AgentToolDefinition } from "../tool-definition";

const ValidateDatasetInputSchema = z.object({
  datasetPath: z.string().min(1),
  targetColumn: z.string().min(1),
  timeColumn: z.string().min(1).optional()
});

const RunExperimentInputSchema = z.object({
  experimentId: z.string().min(1),
  datasetId: z.string().min(1),
  datasetPath: z.string().min(1),
  plan: ExperimentPlanSchema,
  attemptNumber: z.number().int().positive().optional()
});

export const mlComputeTools: AgentToolDefinition[] = [
  {
    id: "ml.validate_dataset",
    kind: "compute",
    title: "Validate dataset (quality + schema)",
    description:
      "Run ML worker validation: row counts, inferred schema, leakage warnings, and suitability before training or backtest.",
    binding: {
      type: "ml_worker_http",
      path: "/ml/validate-dataset",
      baseUrlEnv: "ML_WORKER_URL"
    },
    inputSchema: ValidateDatasetInputSchema
  },
  {
    id: "ml.run_experiment",
    kind: "compute",
    title: "Train and evaluate models",
    description:
      "Execute the experiment plan against the dataset path (train/backtest per plan.splitConfig and plan.backtestMethod). Returns metrics and best-model summary.",
    binding: {
      type: "ml_worker_http",
      path: "/ml/run-experiment",
      baseUrlEnv: "ML_WORKER_URL"
    },
    inputSchema: RunExperimentInputSchema
  }
];

export { ValidateDatasetInputSchema, RunExperimentInputSchema };
