import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import type { DataQualityReport, ExperimentPlan } from "@factum/shared-types";
import type { ValidateResult } from "@factum/agent-sdk";
import { MlWorkerService } from "./ml-worker.service";

export type ValidationServiceInput = {
  experimentId: string;
  connectorId?: string;
  dataset: {
    source: "local_path" | "upload" | "kaggle" | "binance" | "yahoo" | "connector";
    path?: string;
    ref?: string;
    params?: Record<string, unknown>;
  };
  expectedSchema: {
    columns: string[];
    minRows: number;
    maxNanRate?: number;
  };
  plan: ExperimentPlan;
};

export type ValidationServiceOutput = {
  validateResult: ValidateResult;
  dataQualityReport: DataQualityReport;
};

async function sha256File(filePath: string) {
  const content = await fs.readFile(filePath);
  return createHash("sha256").update(content).digest("hex");
}

function deriveFailureReason(input: {
  report: DataQualityReport;
  expectedColumns: string[];
  maxNanRate: number;
}): ValidateResult["failure_reason"] | undefined {
  const { report, expectedColumns, maxNanRate } = input;
  const present = new Set(report.inferredSchema.map((column) => column.name));
  const missing = expectedColumns.filter((column) => !present.has(column));
  if (missing.length) return "missing_columns";
  if (report.rowCount < 1) return "insufficient_rows";
  const totalMissing = Object.values(report.missingValues).reduce((sum, count) => sum + count, 0);
  const denominator = Math.max(report.rowCount * Math.max(report.columnCount, 1), 1);
  const nanRate = totalMissing / denominator;
  if (nanRate > maxNanRate) return "nan_rate_exceeded";
  if (!report.valid) return "schema_mismatch";
  return undefined;
}

export class ValidationService {
  constructor(private readonly mlWorker = new MlWorkerService()) {}

  async validate(input: ValidationServiceInput): Promise<ValidationServiceOutput> {
    const datasetPath = input.dataset.path;
    if (!datasetPath) {
      return {
        validateResult: {
          type: "validate_result",
          experiment_id: input.experimentId,
          sent_at: new Date().toISOString(),
          sender_peer: "local-validation",
          reply_to_peer: "local-validation",
          passed: false,
          validation_peer: "local-validation",
          validated_at: new Date().toISOString(),
          failure_reason: "fetch_failed",
          error: "Validation dataset path is missing",
          warnings: ["Validation dataset path is missing"]
        },
        dataQualityReport: {
          valid: false,
          rowCount: 0,
          columnCount: 0,
          missingValues: {},
          duplicateRows: 0,
          warnings: ["Validation dataset path is missing"],
          leakageDetected: false,
          inferredSchema: []
        }
      };
    }

    const report = await this.mlWorker.validateDataset({
      datasetPath,
      targetColumn: input.plan.targetColumn,
      timeColumn: input.plan.splitConfig.timeColumn
    });

    const expectedColumns = [...new Set([input.plan.targetColumn, ...input.expectedSchema.columns])];
    const present = new Set(report.inferredSchema.map((column) => column.name));
    const columnsPresent = expectedColumns.every((column) => present.has(column));
    const totalMissing = Object.values(report.missingValues).reduce((sum, count) => sum + count, 0);
    const denominator = Math.max(report.rowCount * Math.max(report.columnCount, 1), 1);
    const nanRate = totalMissing / denominator;
    const leakageRisk: ValidateResult["leakage_risk"] = report.leakageDetected
      ? "high"
      : report.warnings.some((warning) => warning.toLowerCase().includes("leak"))
        ? "low"
        : "none";
    const maxNanRate = input.expectedSchema.maxNanRate ?? 0.05;
    const passed = report.valid && columnsPresent && report.rowCount >= input.expectedSchema.minRows && nanRate <= maxNanRate;
    const validatedAt = new Date().toISOString();
    const dataHash = await sha256File(datasetPath).catch(() => undefined);

    return {
      validateResult: {
        type: "validate_result",
        experiment_id: input.experimentId,
        sent_at: validatedAt,
        sender_peer: "local-validation",
        reply_to_peer: "local-validation",
        passed,
        validation_peer: "local-validation",
        validated_at: validatedAt,
        data_hash: dataHash,
        rows: report.rowCount,
        columns_present: columnsPresent,
        nan_rate: nanRate,
        temporal_continuity: input.plan.backtestMethod !== "random_split" || Boolean(input.plan.splitConfig.timeColumn),
        leakage_risk: leakageRisk,
        warnings: report.warnings,
        failure_reason: passed ? undefined : deriveFailureReason({ report, expectedColumns, maxNanRate }),
        error: passed ? undefined : report.warnings.join("; ") || "Validation failed",
        report
      },
      dataQualityReport: report
    };
  }
}
