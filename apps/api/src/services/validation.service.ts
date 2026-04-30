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

/** Target + planned feature columns that exist in the loaded frame (used for NaN gate only). */
function planColumnsPresentInDataset(report: DataQualityReport, expectedColumns: string[]): string[] {
  const present = new Set(report.inferredSchema.map((column) => column.name));
  return expectedColumns.filter((column) => present.has(column));
}

/**
 * Share of cells missing among plan columns only (not the whole table), so sparse optional
 * metadata columns do not dominate the gate.
 */
function computePlanColumnNanRate(report: DataQualityReport, planColumns: string[]): number {
  if (planColumns.length === 0 || report.rowCount < 1) return 0;
  const totalMissing = planColumns.reduce(
    (sum, column) => sum + (Number(report.missingValues[column]) || 0),
    0
  );
  return totalMissing / Math.max(report.rowCount * planColumns.length, 1);
}

function deriveFailureReason(input: {
  report: DataQualityReport;
  expectedColumns: string[];
  maxNanRate: number;
  minRows: number;
}): ValidateResult["failure_reason"] | undefined {
  const { report, expectedColumns, maxNanRate, minRows } = input;
  const present = new Set(report.inferredSchema.map((column) => column.name));
  const missing = expectedColumns.filter((column) => !present.has(column));
  if (missing.length) return "missing_columns";
  if (report.rowCount < 1) return "insufficient_rows";
  if (report.rowCount < minRows) return "insufficient_rows";
  const planColumns = planColumnsPresentInDataset(report, expectedColumns);
  const nanRate = computePlanColumnNanRate(report, planColumns);
  if (nanRate > maxNanRate) return "nan_rate_exceeded";
  if (!report.valid) return "schema_mismatch";
  return undefined;
}

function buildValidationErrorMessage(input: {
  report: DataQualityReport;
  expectedColumns: string[];
  maxNanRate: number;
  minRows: number;
  failureReason: NonNullable<ValidateResult["failure_reason"]>;
}): string {
  const { report, expectedColumns, maxNanRate, minRows, failureReason } = input;
  const present = new Set(report.inferredSchema.map((column) => column.name));
  const missing = expectedColumns.filter((column) => !present.has(column));
  const planColumns = planColumnsPresentInDataset(report, expectedColumns);
  const nanRate = computePlanColumnNanRate(report, planColumns);
  const warnings = report.warnings;
  const warningSuffix = warnings.length ? ` Also noted: ${warnings.join("; ")}` : "";

  switch (failureReason) {
    case "missing_columns":
      return `Required columns are missing from the dataset: ${missing.join(", ")}.${warningSuffix}`;
    case "insufficient_rows":
      if (report.rowCount < 1) {
        return `The dataset has no rows.${warningSuffix}`;
      }
      return `The dataset has ${report.rowCount} rows, below the minimum ${minRows} required.${warningSuffix}`;
    case "nan_rate_exceeded": {
      const cols = planColumns.length ? planColumns.join(", ") : "experiment columns";
      return `Missing data rate across ${cols} is ${(nanRate * 100).toFixed(2)}%, above the maximum ${(maxNanRate * 100).toFixed(0)}% (computed from target and planned feature columns only).${warningSuffix}`;
    }
    case "schema_mismatch":
      return `Dataset did not pass quality checks (for example target completeness or row/column constraints).${warningSuffix}`;
    case "fetch_failed":
      return report.warnings.join("; ") || "Validation failed";
    default:
      return `Validation failed.${warningSuffix}`;
  }
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
    const planColumns = planColumnsPresentInDataset(report, expectedColumns);
    const nanRate = computePlanColumnNanRate(report, planColumns);
    const leakageRisk: ValidateResult["leakage_risk"] = report.leakageDetected
      ? "high"
      : report.warnings.some((warning) => warning.toLowerCase().includes("leak"))
        ? "low"
        : "none";
    const maxNanRate = input.expectedSchema.maxNanRate ?? 0.05;
    const minRows = input.expectedSchema.minRows;
    const failureReason = deriveFailureReason({ report, expectedColumns, maxNanRate, minRows });
    const passed = failureReason === undefined;
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
        failure_reason: passed ? undefined : failureReason,
        error: passed
          ? undefined
          : failureReason
            ? buildValidationErrorMessage({
                report,
                expectedColumns,
                maxNanRate,
                minRows,
                failureReason
              })
            : "Validation failed",
        report
      },
      dataQualityReport: report
    };
  }
}
