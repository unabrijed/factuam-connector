import type { DataQualityReport, ExperimentPlan, MLRunResult } from "@factuam/shared-types";
import { DataQualityReportSchema, MLRunResultSchema } from "@factuam/shared-types";
import { config } from "../config";
import { AppError } from "../lib/errors";
import { log, logError } from "../lib/logger";

async function getResponseMessage(response: Response, fallback: string) {
  try {
    const payload = await response.json();
    return payload.detail ?? payload.error ?? fallback;
  } catch {
    return fallback;
  }
}

export class MlWorkerService {
  async validateDataset(input: { datasetPath: string; targetColumn: string; timeColumn?: string }) {
    const startedAt = Date.now();
    log("info", "ml_worker_validate_request", {
      datasetPath: input.datasetPath,
      targetColumn: input.targetColumn,
      timeColumn: input.timeColumn ?? null
    });
    const response = await fetch(`${config.ML_WORKER_URL}/ml/validate-dataset`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input)
    });

    if (!response.ok) {
      log("warn", "ml_worker_validate_failed", {
        status: response.status,
        durationMs: Date.now() - startedAt
      });
      throw new AppError(
        await getResponseMessage(response, `ML worker validation failed with status ${response.status}`),
        502,
        "worker_validation_failed"
      );
    }

    const parsed = DataQualityReportSchema.parse(await response.json()) satisfies DataQualityReport;
    log("info", "ml_worker_validate_response", {
      valid: parsed.valid,
      warnings: parsed.warnings,
      rowCount: parsed.rowCount,
      durationMs: Date.now() - startedAt
    });
    return parsed;
  }

  async runExperiment(input: { experimentId: string; datasetId: string; datasetPath: string; plan: ExperimentPlan; attemptNumber?: number }) {
    const startedAt = Date.now();
    log("info", "ml_worker_run_request", {
      experimentId: input.experimentId,
      datasetId: input.datasetId,
      attemptNumber: input.attemptNumber ?? 1,
      datasetPath: input.datasetPath,
      taskType: input.plan.taskType,
      targetColumn: input.plan.targetColumn,
      candidateModels: input.plan.candidateModels,
      requiredColumns: input.plan.requiredColumns,
      optionalColumns: input.plan.optionalColumns
    });
    const response = await fetch(`${config.ML_WORKER_URL}/ml/run-experiment`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input)
    });

    if (!response.ok) {
      log("warn", "ml_worker_run_failed", {
        experimentId: input.experimentId,
        status: response.status,
        durationMs: Date.now() - startedAt
      });
      throw new AppError(
        await getResponseMessage(response, `ML worker run failed with status ${response.status}`),
        502,
        "worker_run_failed"
      );
    }

    try {
      const parsed = MLRunResultSchema.parse(await response.json()) satisfies MLRunResult;
      log("info", "ml_worker_run_response", {
        experimentId: input.experimentId,
        bestModel: parsed.bestModel.modelName,
        confidence: parsed.confidence,
        durationMs: Date.now() - startedAt
      });
      return parsed;
    } catch (error) {
      logError("ml_worker_run_response_parse_failed", error, {
        experimentId: input.experimentId,
        durationMs: Date.now() - startedAt
      });
      throw error;
    }
  }
}
