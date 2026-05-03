import type {
  AgentTraceEntry,
  DataQualityReport,
  DatasetDiagnosis,
  ExperimentPlan,
  ExperimentStatus,
  VerifierResult
} from "@factuam/shared-types";
import type { AttemptSummary, ValidateResult } from "@factuam/agent-sdk";
import { DatasetService } from "./dataset.service";
import { ExperimentService } from "./experiment.service";
import { MlWorkerService } from "./ml-worker.service";
import { EvidenceClassifierService } from "./agents/evidence-classifier.service";
import { ExperimentPlannerService } from "./agents/experiment-planner.service";
import { VerifierService } from "./agents/verifier.service";
import { AnswerGeneratorService } from "./agents/answer-generator.service";
import { ProofService } from "./proof.service";
import { db } from "../db/client";
import { backtestReports, modelRuns } from "../db/schema";
import { v4 as uuidv4 } from "uuid";
import { log, logError } from "../lib/logger";
import { ConnectorRunService } from "./connector-run.service";
import { AxlAgentRouterService } from "./axl-agent-router.service";
import { DiagnosisService } from "./diagnosis.service";
import { StrategyAgentService } from "./agents/strategy-agent.service";
import { ReflectionAgentService } from "./agents/reflection-agent.service";
import { ValidationService } from "./validation.service";
import { KaggleSuggestService } from "./kaggle-suggest.service";
import { ConnectorAcquisitionService } from "./connector-acquisition.service";
import { getDatasetNameFromConnectorRequest } from "../lib/connectors";

function findMissingColumns(plan: ExperimentPlan, datasetSchema: unknown): string[] {
  const columns = Array.isArray((datasetSchema as { columns?: Array<{ name: string }> })?.columns)
    ? (datasetSchema as { columns: Array<{ name: string }> }).columns.map((entry) => entry.name)
    : [];
  const set = new Set(columns);
  return plan.requiredColumns.filter((column) => !set.has(column));
}

function terminalStatusFromValidation(
  report: DataQualityReport,
  failureReason: ValidateResult["failure_reason"] | undefined
) {
  if (report.leakageDetected) return "REJECTED_DATA_LEAKAGE" as const;
  if (failureReason === "nan_rate_exceeded") return "FAILED_DATA_VALIDATION" as const;
  return "REJECTED_INSUFFICIENT_DATA" as const;
}

function terminalStatusFromVerification(verification: VerifierResult) {
  if (verification.confidence === "low") return "REJECTED_LOW_CONFIDENCE" as const;
  return "REJECTED_MODEL_UNDERPERFORMED" as const;
}

/** Maps thrown errors to terminal statuses; receipt vs AXL vs stage keywords (order matters). */
function inferFailureStatusFromMessage(message: string): ExperimentStatus {
  const m = message.toLowerCase();

  const receiptLikely =
    m.includes("proof_receipt") ||
    m.includes("proof receipt") ||
    m.includes("registerreceipt") ||
    m.includes("artifact_manifest") ||
    m.includes("artifact manifest") ||
    m.includes("verification_report") ||
    m.includes("waitfortransactionreceipt") ||
    m.includes("transactionexecutionerror") ||
    m.includes("writecontract") ||
    (m.includes("upload") && (m.includes("storage") || m.includes("failed") || m.includes("error"))) ||
    (m.includes("chain") && (m.includes("anchor") || m.includes("registry") || m.includes("gensyn_chain")));

  if (receiptLikely) return "FAILED_RECEIPT_GENERATION";

  const axlLikely =
    m.includes("axl timed") ||
    m.includes("axl peer") ||
    (m.includes("axl") && m.includes("waiting")) ||
    m.includes("/recv") ||
    m.includes("/send") ||
    m.includes("factuam:axl:reply") ||
    m.includes("reply broker");

  if (axlLikely) return "FAILED_AXL_TRANSPORT";

  if (m.includes("classification")) return "FAILED_CLASSIFICATION";
  if (m.includes("planning")) return "FAILED_PLANNING";
  if (m.includes("validation")) return "FAILED_DATA_VALIDATION";
  if (m.includes("training")) return "FAILED_TRAINING";
  if (m.includes("backtest")) return "FAILED_BACKTESTING";
  if (m.includes("verification")) return "FAILED_VERIFICATION";

  return "FAILED_RECEIPT_GENERATION";
}

function summarizeAgentOutput(agent: string, output: unknown) {
  if (!output || typeof output !== "object") return {};
  const source = output as Record<string, unknown>;

  if (agent === "evidence_classifier") {
    return {
      requiresEvidenceMode: source.requiresEvidenceMode,
      evidenceType: source.evidenceType,
      riskLevel: source.riskLevel,
      reason: source.reason
    };
  }

  if (agent === "experiment_planner") {
    return {
      taskType: source.taskType,
      targetColumn: source.targetColumn,
      requiredColumns: source.requiredColumns,
      optionalColumns: source.optionalColumns,
      candidateModels: source.candidateModels,
      backtestMethod: source.backtestMethod
    };
  }

  if (agent === "validation_agent") {
    return {
      passed: source.passed,
      rows: source.rows,
      nanRate: source.nan_rate,
      leakageRisk: source.leakage_risk,
      failureReason: source.failure_reason,
      warnings: Array.isArray(source.warnings) ? source.warnings.slice(0, 6) : []
    };
  }

  if (agent === "diagnosis_agent") {
    return {
      targetKind: source.targetKind,
      targetQuality: source.targetQuality,
      taskTypeFit: source.taskTypeFit,
      textStrategy: source.textStrategy,
      highMissingColumns: Array.isArray(source.highMissingColumns) ? source.highMissingColumns.slice(0, 6) : []
    };
  }

  if (agent === "strategy_agent") {
    return {
      strategyKey: source.strategyKey,
      rationale: source.rationale,
      changes: source.changes
    };
  }

  if (agent === "reflection_agent") {
    return {
      verdict: source.verdict,
      failureCategory: source.failureCategory,
      nextActions: source.nextActions
    };
  }

  if (agent === "verifier") {
    const verification =
      source.verification && typeof source.verification === "object"
        ? (source.verification as Record<string, unknown>)
        : source;
    return {
      verificationStatus: verification.verificationStatus,
      confidence: verification.confidence,
      warnings: verification.warnings,
      reason: verification.reason
    };
  }

  if (agent === "answer_generator") {
    return {
      resultSummaryKeys:
        source.resultSummary && typeof source.resultSummary === "object"
          ? Object.keys(source.resultSummary as Record<string, unknown>).slice(0, 12)
          : [],
      finalAnswerPreview: typeof source.finalAnswer === "string" ? source.finalAnswer.slice(0, 220) : undefined
    };
  }

  return {};
}

function pickPrimaryMetric(plan: ExperimentPlan, metrics: Record<string, unknown>) {
  for (const metric of plan.evaluationMetrics) {
    if (metric in metrics) return Number(metrics[metric]);
    if (metric === "r2" && "r2_score" in metrics) return Number(metrics.r2_score);
  }
  if ("r2_score" in metrics) return Number(metrics.r2_score);
  if ("f1" in metrics) return Number(metrics.f1);
  if ("precision_at_k" in metrics) return Number(metrics.precision_at_k);
  if ("mae" in metrics) return -Number(metrics.mae);
  return Number.NEGATIVE_INFINITY;
}

function meetsSuccessCriteria(
  plan: ExperimentPlan,
  mlResult: { bestModel: { metrics: Record<string, number> }; backtest: { liftOverBaseline: number }; dataQuality: { rowCount: number } }
) {
  const rowRequirementMet = mlResult.dataQuality.rowCount >= plan.successCriteria.minimumRows;
  const liftRequirementMet = mlResult.backtest.liftOverBaseline >= plan.successCriteria.minimumLiftOverBaseline;
  const metricTarget = plan.successCriteria.minimumMetricValue;
  if (metricTarget === undefined) {
    return rowRequirementMet && liftRequirementMet;
  }

  const primaryMetric = pickPrimaryMetric(plan, mlResult.bestModel.metrics);
  return rowRequirementMet && liftRequirementMet && primaryMetric >= metricTarget;
}

export class AgentOrchestratorService {
  constructor(
    private readonly datasets = new DatasetService(),
    private readonly experiments = new ExperimentService(),
    private readonly classifier = new EvidenceClassifierService(),
    private readonly planner = new ExperimentPlannerService(),
    private readonly validation = new ValidationService(),
    private readonly diagnosis = new DiagnosisService(),
    private readonly strategy = new StrategyAgentService(),
    private readonly reflection = new ReflectionAgentService(),
    private readonly mlWorker = new MlWorkerService(),
    private readonly verifier = new VerifierService(),
    private readonly answerGenerator = new AnswerGeneratorService(),
    private readonly proofService = new ProofService(),
    private readonly connectorRuns = new ConnectorRunService(),
    private readonly axlRouter = new AxlAgentRouterService(),
    private readonly kaggleSuggest = new KaggleSuggestService(),
    private readonly connectorAcquisition = new ConnectorAcquisitionService()
  ) {}

  async runExperiment(experimentId: string) {
    log("info", "experiment_orchestration_started", { experimentId });
    await this.experiments.appendProgress(experimentId, {
      stage: "start",
      message: "Experiment worker picked up the job"
    });
    const experiment = await this.experiments.getById(experimentId);
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }
    if (!experiment.datasetId) {
      await this.experiments.appendProgress(experimentId, {
        stage: "auto_discovering",
        message: "No dataset provided — searching Kaggle for a matching dataset using your query"
      });

      let best: Awaited<ReturnType<(typeof this.kaggleSuggest)["pickBestForQuery"]>> = null;
      try {
        best = await this.kaggleSuggest.pickBestForQuery(experiment.query);
      } catch (err) {
        logError("kaggle_auto_discover_search_failed", err, { experimentId, query: experiment.query });
      }

      if (!best) {
        await this.experiments.fail(
          experimentId,
          "REJECTED_INSUFFICIENT_DATA",
          "Couldn't find a matching Kaggle dataset. Try a shorter query (e.g. \"wine quality\") or upload a CSV."
        );
        return;
      }

      await this.experiments.addMessage({
        experimentId,
        role: "agent",
        message: `I'm fetching the Kaggle dataset **"${best.title}"** (${best.ref}), using file: \`${best.selectedFile}\`, to run your analysis on.`,
        metadata: { autoDiscoveredKaggle: true, datasetRef: best.ref, selectedFile: best.selectedFile, title: best.title }
      });
      await this.experiments.appendProgress(experimentId, {
        stage: "auto_discovered",
        message: `Auto-discovered Kaggle dataset: ${best.title} (${best.ref})`,
        details: { datasetRef: best.ref, selectedFile: best.selectedFile, title: best.title }
      });

      try {
        const acquisition = await this.connectorAcquisition.acquireDataset({
          request: best.connectorRequest,
          datasetName: getDatasetNameFromConnectorRequest(best.connectorRequest)
        });
        await this.experiments.attachDataset(experimentId, acquisition.datasetId);
        experiment.datasetId = acquisition.datasetId;
        await this.experiments.appendProgress(experimentId, {
          stage: "auto_discover_acquired",
          message: `Dataset downloaded and attached: ${best.title}`,
          details: { datasetId: acquisition.datasetId, runId: acquisition.runId }
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to acquire Kaggle dataset";
        logError("kaggle_auto_discover_acquire_failed", err, { experimentId, ref: best.ref });
        await this.experiments.fail(experimentId, "REJECTED_INSUFFICIENT_DATA", message);
        return;
      }
    }

    const dataset = await this.datasets.getById(experiment.datasetId);
    if (!dataset) {
      await this.experiments.fail(experimentId, "REJECTED_INSUFFICIENT_DATA", "Dataset file is missing");
      return;
    }
    if (dataset.connectorRunId) {
      await this.connectorRuns.setStage(dataset.connectorRunId, {
        status: "running",
        stage: "run",
        message: "Experiment worker is processing the dataset",
        extra: { experimentId }
      });
    }
    const datasetPath = await this.datasets.materializeToLocal(dataset);
    log("info", "experiment_dataset_materialized", {
      experimentId,
      datasetId: dataset.id,
      datasetPath,
      rowCount: dataset.rowCount,
      columnCount: dataset.columnCount
    });

    try {
      const agentTrace: AgentTraceEntry[] = [];

      await this.experiments.updateStatus(experimentId, "CLASSIFYING");
      await this.experiments.appendProgress(experimentId, {
        stage: "classifying",
        message: "Waiting on the evidence classifier to decide workflow, risk, and whether proof-style evidence is required"
      });
      const classificationPayload = {
        query: experiment.query,
        availableDataset: dataset.schemaJson
      };
      const classificationResult = await this.axlRouter.invoke({
        agent: "evidence_classifier",
        payload: classificationPayload,
        localHandler: () => this.classifier.run(classificationPayload)
      });
      const classification = classificationResult.result;
      agentTrace.push({ ...classificationResult.trace, step: agentTrace.length + 1 });
      await this.experiments.appendProgress(experimentId, {
        stage: "classification_complete",
        message: "Evidence classification completed",
        details: {
          agent: "evidence_classifier",
          transport: classificationResult.trace.transport ?? "local",
          ...summarizeAgentOutput("evidence_classifier", classification)
        }
      });
      await this.experiments.updateClassification(experimentId, {
        evidenceRequired: classification.requiresEvidenceMode,
        evidenceType: classification.evidenceType,
        riskLevel: classification.riskLevel
      });

      if (!classification.requiresEvidenceMode) {
        await this.experiments.updateStatus(experimentId, "REJECTED_NO_EVIDENCE_NEEDED", {
          resultSummary: { reason: classification.reason }
        });
        return;
      }

      await this.experiments.updateStatus(experimentId, "PLANNING");
      await this.experiments.appendProgress(experimentId, {
        stage: "planning",
        message: "Building experiment plan from query and dataset schema"
      });
      const latestGuidance = (await this.experiments.getRecentMessages(experimentId, 6))
        .filter((message) => message.role === "user")
        .map((message) => message.message);
      const planningPayload = {
        query: experiment.query,
        datasetSchema: dataset.schemaJson,
        userGuidance: latestGuidance
      };
      const planResult = await this.axlRouter.invoke({
        agent: "experiment_planner",
        payload: planningPayload,
        localHandler: () => this.planner.run(planningPayload)
      });
      let plan = planResult.result;
      log("info", "experiment_plan_created", {
        experimentId,
        taskType: plan.taskType,
        targetColumn: plan.targetColumn,
        candidateModels: plan.candidateModels,
        requiredColumns: plan.requiredColumns,
        optionalColumns: plan.optionalColumns
      });
      agentTrace.push({ ...planResult.trace, step: agentTrace.length + 1 });
      await this.experiments.updatePlan(experimentId, plan);
      await this.experiments.appendProgress(experimentId, {
        stage: "plan_ready",
        message: "Experiment plan created",
        details: {
          agent: "experiment_planner",
          transport: planResult.trace.transport ?? "local",
          ...summarizeAgentOutput("experiment_planner", plan)
        }
      });

      const missingColumns = findMissingColumns(plan, dataset.schemaJson);
      if (missingColumns.length) {
        log("warn", "experiment_missing_columns_recovery", { experimentId, missingColumns });
        const recoveryPayload = {
          query: experiment.query,
          datasetSchema: dataset.schemaJson,
          currentPlan: plan,
          missingColumns,
          issue: "missing_required_columns" as const
        };
        const recoveredPlanResult = await this.axlRouter.invoke({
          agent: "experiment_planner",
          payload: recoveryPayload,
          localHandler: () => this.planner.run({
            query: `Re-plan for dataset that is missing these required columns: ${missingColumns.join(", ")}. Original query: ${experiment.query}. Available columns: ${JSON.stringify((dataset.schemaJson as { columns?: Array<{ name: string }> })?.columns?.map(c => c.name) ?? [])}`,
            datasetSchema: dataset.schemaJson
          })
        });
        const recoveredPlan = recoveredPlanResult.result;
        const stillMissing = findMissingColumns(recoveredPlan, dataset.schemaJson);
        if (stillMissing.length) {
          await this.experiments.fail(
            experimentId,
            "REJECTED_INSUFFICIENT_DATA",
            `Agent couldn't resolve missing columns: ${stillMissing.join(", ")}. Original missing: ${missingColumns.join(", ")}`
          );
          return;
        }
        log("info", "experiment_missing_columns_recovered", { experimentId, recoveredColumns: recoveredPlan.requiredColumns });
        await this.experiments.updatePlan(experimentId, recoveredPlan);
        await this.experiments.appendProgress(experimentId, {
          stage: "plan_recovered",
          message: `Agent recovered from missing columns: adjusted plan to use available columns`,
          details: { originalMissing: missingColumns, newRequired: recoveredPlan.requiredColumns }
        });
        plan = recoveredPlan;
      }

      await this.experiments.updateStatus(experimentId, "VALIDATING_DATA");
      await this.experiments.appendProgress(experimentId, {
        stage: "validating_data",
        message: "Validating dataset compatibility with the plan"
      });
      const validationPayload = {
        experimentId,
        connectorId: dataset.connectorId ?? undefined,
        dataset: {
          source: (dataset.sourceType === "upload" ? "upload" : dataset.connectorId ? "connector" : "local_path") as "upload" | "connector" | "local_path",
          path: datasetPath,
          ref: dataset.ogStorageUri ?? undefined,
          params: dataset.sourceMeta ?? undefined
        },
        expectedSchema: {
          columns: [...new Set([...plan.requiredColumns, ...plan.optionalColumns])],
          minRows: plan.successCriteria.minimumRows,
          maxNanRate: 0.1
        },
        plan
      };
      const validationInvokeResult = await this.axlRouter.invoke({
        agent: "validation_agent",
        payload: validationPayload,
        localHandler: () => this.validation.validate(validationPayload)
      });
      const validationEnvelope = validationInvokeResult.result as { validateResult: ValidateResult; dataQualityReport: DataQualityReport };
      const validationResult = validationEnvelope.validateResult;
      const validation = validationEnvelope.dataQualityReport;
      agentTrace.push({ ...validationInvokeResult.trace, step: agentTrace.length + 1 });
      log("info", "experiment_validation_completed", {
        experimentId,
        valid: validationResult.passed,
        warnings: validationResult.warnings,
        rowCount: validation.rowCount,
        columnCount: validation.columnCount,
        dataHash: validationResult.data_hash
      });
      await this.datasets.updateDataQuality(dataset.id, validation);
      await this.experiments.appendProgress(experimentId, {
        stage: "validation_complete",
        message: validationResult.passed ? "Dataset validation succeeded" : "Dataset validation failed",
        details: {
          agent: "validation_agent",
          transport: validationInvokeResult.trace.transport ?? "local",
          ...summarizeAgentOutput("validation_agent", validationResult),
          rowCount: validation.rowCount,
          columnCount: validation.columnCount,
          dataHash: validationResult.data_hash?.slice(0, 16)
        }
      });

      if (!validationResult.passed) {
        if (dataset.connectorRunId) {
          await this.connectorRuns.setStage(dataset.connectorRunId, {
            status: "failed",
            stage: "failed",
            message: validationResult.error ?? (validationResult.warnings?.join("; ") || "Dataset validation failed"),
            extra: { experimentId }
          });
        }
        await this.experiments.fail(
          experimentId,
          terminalStatusFromValidation(validation, validationResult.failure_reason),
          validationResult.error ?? (validationResult.warnings?.join("; ") || "Dataset validation failed")
        );
        return;
      }

      await this.experiments.appendProgress(experimentId, {
        stage: "diagnosing",
        message: "Diagnosing dataset risks and feature strategy"
      });
      const diagnosisPayload = {
        plan,
        validation,
        datasetSummary: {
          rowCount: dataset.rowCount,
          columnCount: dataset.columnCount,
          schema: dataset.schemaJson
        }
      };
      const diagnosisResult = await this.axlRouter.invoke({
        agent: "diagnosis_agent",
        payload: diagnosisPayload,
        localHandler: () => Promise.resolve(this.diagnosis.diagnose({ plan, validation }))
      });
      const diagnosis = diagnosisResult.result as DatasetDiagnosis;
      agentTrace.push({ ...diagnosisResult.trace, step: agentTrace.length + 1 });
      await this.experiments.addDiagnosis(experimentId, diagnosis);
      await this.experiments.appendProgress(experimentId, {
        stage: "diagnosis_complete",
        message: "Dataset diagnosis completed",
        details: {
          agent: "diagnosis_agent",
          transport: diagnosisResult.trace.transport ?? "local",
          ...summarizeAgentOutput("diagnosis_agent", diagnosis)
        }
      });

      await this.experiments.updateStatus(experimentId, "TRAINING");
      const guidanceMessages = (await this.experiments.getRecentMessages(experimentId, 8))
        .filter((message) => message.role === "user")
        .map((message) => message.message);
      await this.experiments.appendProgress(experimentId, {
        stage: "training",
        message: "Starting orchestrated attempt loop",
        details: {
          maxAttempts: 4,
          guidanceCount: guidanceMessages.length,
          recommendedActions: diagnosis.recommendedActions.slice(0, 6)
        }
      });

      let mlResult: Awaited<ReturnType<MlWorkerService["runExperiment"]>> | null = null;
      let selectedAttemptId: string | null = null;
      let selectedAttemptNumber = 0;
      let selectedPlan: ExperimentPlan = plan;
      let bestAttemptScore = Number.NEGATIVE_INFINITY;
      const attemptSummaries: AttemptSummary[] = [];

      for (let attemptNumber = 1; attemptNumber <= 4; attemptNumber += 1) {
        const strategyPayload = {
          attemptNumber,
          plan,
          diagnosis,
          previousAttempts: attemptSummaries,
          userGuidance: guidanceMessages
        };
        const strategyResult = await this.axlRouter.invoke({
          agent: "strategy_agent",
          payload: strategyPayload,
          localHandler: () => this.strategy.run(strategyPayload)
        });
        const strategyDecision = strategyResult.result;
        const attemptPlan = strategyDecision.plan as ExperimentPlan;
        agentTrace.push({ ...strategyResult.trace, step: agentTrace.length + 1 });

        await this.experiments.addStrategyDecision({
          experimentId,
          attemptNumber,
          decision: strategyDecision as unknown as Record<string, unknown>
        });
        await this.experiments.appendProgress(experimentId, {
          stage: "strategy_selected",
          message: `Attempt ${attemptNumber} strategy selected: ${strategyDecision.strategyKey}`,
          details: {
            agent: "strategy_agent",
            transport: strategyResult.trace.transport ?? "local",
            ...summarizeAgentOutput("strategy_agent", strategyDecision)
          }
        });

        const attemptId = await this.experiments.createAttempt({
          experimentId,
          attemptNumber,
          strategy: strategyDecision.strategyKey,
          notes: strategyDecision.notes,
          planJson: attemptPlan as unknown as Record<string, unknown>
        });
        await this.experiments.appendProgress(experimentId, {
          stage: "attempt_started",
          message: `Attempt ${attemptNumber} (${strategyDecision.strategyKey}): waiting on the ML training worker to fit and evaluate models; this step may take a while`,
          details: {
            attemptNumber,
            strategy: strategyDecision.strategyKey,
            notes: strategyDecision.notes,
            candidateModels: attemptPlan.candidateModels,
            optionalColumns: attemptPlan.optionalColumns
          }
        });

        try {
          const trainingPayload = {
            experimentId,
            datasetId: dataset.id,
            datasetPath,
            plan: attemptPlan,
            attemptNumber,
            strategy: strategyDecision,
            validation: validationResult,
            previousAttempts: attemptSummaries
          };
          const trainingResult = await this.axlRouter.invoke({
            agent: "training_agent",
            payload: trainingPayload,
            localHandler: () => this.mlWorker.runExperiment(trainingPayload)
          });
          const attemptResult = trainingResult.result;
          agentTrace.push({ ...trainingResult.trace, step: agentTrace.length + 1 });

          await db.insert(modelRuns).values(
            attemptResult.models.map((model) => ({
              id: model.modelId,
              experimentId,
              attemptId,
              modelName: model.modelName,
              modelType: model.modelType,
              targetColumn: model.targetColumn,
              featureColumns: model.featureColumns,
              metrics: model.metrics,
              artifactHash: model.artifactHash,
              status: model.status
            }))
          );

          await db.insert(backtestReports).values({
            id: uuidv4(),
            experimentId,
            attemptId,
            backtestType: attemptResult.backtest.backtestType,
            baselineName: attemptResult.backtest.baselineName,
            baselineMetrics: attemptResult.backtest.baselineMetrics,
            bestModelId: attemptResult.bestModel.modelId,
            modelMetrics: attemptResult.backtest.modelMetrics,
            liftOverBaseline: String(attemptResult.backtest.liftOverBaseline),
            reportJson: attemptResult.backtest.report,
            reportHash: attemptResult.backtest.reportHash
          });

          await this.experiments.completeAttempt(attemptId, {
            status: "completed",
            summaryJson: {
              bestModel: attemptResult.bestModel.modelName,
              metrics: attemptResult.bestModel.metrics,
              liftOverBaseline: attemptResult.backtest.liftOverBaseline,
              confidence: attemptResult.confidence
            }
          });

          const success = meetsSuccessCriteria(attemptPlan, attemptResult);
          const attemptScore = pickPrimaryMetric(attemptPlan, attemptResult.bestModel.metrics) + attemptResult.backtest.liftOverBaseline / 1000;
          const attemptSummary: AttemptSummary = {
            attempt_number: attemptNumber,
            strategy: strategyDecision.strategyKey,
            status: "success",
            primary_metric: pickPrimaryMetric(attemptPlan, attemptResult.bestModel.metrics),
            baseline_metric: attemptResult.backtest.liftOverBaseline,
            model: attemptResult.bestModel.modelName,
            significant: success
          };
          const reflectionPayload = {
            plan: attemptPlan,
            attemptId,
            attemptSummary,
            success
          };
          const reflectionResult = await this.axlRouter.invoke({
            agent: "reflection_agent",
            payload: reflectionPayload,
            localHandler: () => this.reflection.run(reflectionPayload)
          });
          agentTrace.push({ ...reflectionResult.trace, step: agentTrace.length + 1 });
          await this.experiments.addReflection({
            experimentId,
            attemptId,
            reflection: reflectionResult.result as unknown as Record<string, unknown>
          });
          await this.experiments.appendProgress(experimentId, {
            stage: "attempt_completed",
            message: `Attempt ${attemptNumber} completed`,
            details: {
              attemptNumber,
              strategy: strategyDecision.strategyKey,
              success,
              bestModel: attemptResult.bestModel.modelName,
              metrics: attemptResult.bestModel.metrics,
              liftOverBaseline: attemptResult.backtest.liftOverBaseline,
              reflection: summarizeAgentOutput("reflection_agent", reflectionResult.result)
            }
          });

          attemptSummaries.push(attemptSummary);
          if (attemptScore > bestAttemptScore) {
            mlResult = attemptResult;
            selectedAttemptId = attemptId;
            selectedAttemptNumber = attemptNumber;
            selectedPlan = attemptPlan;
            bestAttemptScore = attemptScore;
          }

          if (success || strategyDecision.stopAfterAttempt) {
            break;
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown training error";
          const attemptSummary: AttemptSummary = {
            attempt_number: attemptNumber,
            strategy: strategyDecision.strategyKey,
            status: "failed",
            error: message
          };
          attemptSummaries.push(attemptSummary);
          const reflectionPayload = {
            plan: attemptPlan,
            attemptId,
            attemptSummary,
            success: false
          };
          const reflectionResult = await this.axlRouter.invoke({
            agent: "reflection_agent",
            payload: reflectionPayload,
            localHandler: () => this.reflection.run(reflectionPayload)
          });
          agentTrace.push({ ...reflectionResult.trace, step: agentTrace.length + 1 });
          await this.experiments.addReflection({
            experimentId,
            attemptId,
            reflection: reflectionResult.result as unknown as Record<string, unknown>
          });
          await this.experiments.completeAttempt(attemptId, {
            status: "failed",
            summaryJson: { error: message },
            notes: message
          });
          await this.experiments.appendProgress(experimentId, {
            stage: "attempt_failed",
            message: `Attempt ${attemptNumber} failed`,
            details: {
              attemptNumber,
              strategy: strategyDecision.strategyKey,
              error: message,
              reflection: summarizeAgentOutput("reflection_agent", reflectionResult.result)
            }
          });
        }
      }

      if (!mlResult || !selectedAttemptId) {
        throw new Error("training: all orchestrated attempts failed");
      }

      log("info", "experiment_training_completed", {
        experimentId,
        bestModel: mlResult.bestModel.modelName,
        modelStatuses: mlResult.models.map((model) => ({ modelName: model.modelName, status: model.status })),
        backtestLift: mlResult.backtest.liftOverBaseline,
        selectedAttemptNumber
      });
      await this.experiments.appendProgress(experimentId, {
        stage: "training_complete",
        message: `Selected attempt ${selectedAttemptNumber} as current best`,
        details: {
          selectedAttemptNumber,
          bestModel: mlResult.bestModel.modelName,
          modelStatuses: mlResult.models.map((model) => ({ modelName: model.modelName, status: model.status })),
          backtestLift: mlResult.backtest.liftOverBaseline
        }
      });

      await this.experiments.updateStatus(experimentId, "BACKTESTING");
      await this.experiments.appendProgress(experimentId, {
        stage: "backtesting",
        message: "Recorded backtest results for the selected attempt",
        details: { selectedAttemptNumber }
      });

      await this.experiments.updateStatus(experimentId, "VERIFYING");
      await this.experiments.appendProgress(experimentId, {
        stage: "verifying",
        message: "Waiting on the ML verifier to check model outputs, metrics, and claims against the plan"
      });
      const verifierPayload = {
        query: experiment.query,
        plan: selectedPlan,
        mlResult,
        datasetSummary: {
          rowCount: dataset.rowCount,
          columnCount: dataset.columnCount,
          dataQuality: validation,
          validation: validationResult,
          diagnosis
        }
      };
      const verifierInvokeResult = await this.axlRouter.invoke({
        agent: "verifier",
        payload: verifierPayload,
        localHandler: () => this.verifier.run(verifierPayload)
      });
      const { verification, reeVerification } = verifierInvokeResult.result;
      agentTrace.push({
        ...verifierInvokeResult.trace,
        step: agentTrace.length + 1,
        ...(reeVerification ? { reeVerification } : {})
      });
      await this.experiments.appendProgress(experimentId, {
        stage: "verification_complete",
        message: "Verification completed",
        details: {
          agent: "verifier",
          transport: verifierInvokeResult.trace.transport ?? "local",
          ...summarizeAgentOutput("verifier", verifierInvokeResult.result),
          ...(reeVerification ? { reeVerified: reeVerification.verified, reeModel: reeVerification.model } : {})
        }
      });

      if (verification.verificationStatus === "rejected") {
        if (dataset.connectorRunId) {
          await this.connectorRuns.setStage(dataset.connectorRunId, {
            status: "failed",
            stage: "failed",
            message: verification.reason ?? "Verification rejected the result",
            extra: { experimentId }
          });
        }
        await this.experiments.completeAttempt(selectedAttemptId, {
          status: "rejected",
          summaryJson: {
            verificationStatus: verification.verificationStatus,
            confidence: verification.confidence,
            reason: verification.reason
          }
        });
        await this.experiments.fail(experimentId, terminalStatusFromVerification(verification), verification.reason ?? "Verification rejected the result");
        return;
      }

      const answerPayload = {
        query: experiment.query,
        experimentPlan: selectedPlan,
        mlResults: mlResult,
        verification,
        proofReceipt: null
      };
      const answerResult = await this.axlRouter.invoke({
        agent: "answer_generator",
        payload: answerPayload,
        localHandler: () => this.answerGenerator.run(answerPayload)
      });
      const answer = answerResult.result;
      agentTrace.push({ ...answerResult.trace, step: agentTrace.length + 1 });
      await this.experiments.appendProgress(experimentId, {
        stage: "answer_ready",
        message: "Final answer draft prepared",
        details: {
          agent: "answer_generator",
          transport: answerResult.trace.transport ?? "local",
          ...summarizeAgentOutput("answer_generator", answer)
        }
      });

      await this.experiments.updateStatus(experimentId, "GENERATING_RECEIPT");
      await this.experiments.appendProgress(experimentId, {
        stage: "generating_receipt",
        message: "Creating proof receipt and final answer"
      });
      const receipt = await this.proofService.createReceipt({
        experimentId,
        query: experiment.query,
        dataset: {
          id: dataset.id,
          name: dataset.name,
          sourceType: dataset.sourceType,
          localPath: datasetPath ?? undefined,
          datasetHash: dataset.datasetHash ?? undefined,
          ogStorageUri: dataset.ogStorageUri ?? undefined,
          rowCount: dataset.rowCount ?? undefined,
          columnCount: dataset.columnCount ?? undefined,
          originalFilename: dataset.originalFilename ?? undefined,
          sourceMeta: dataset.sourceMeta ?? undefined,
          connectorId: dataset.connectorId ?? undefined
        },
        mode: experiment.mode === "connector" ? "connector" : "upload",
        plan: selectedPlan,
        mlResult,
        verification,
        reeVerification,
        agentTrace,
        finalAnswer: answer.finalAnswer
      });

      await this.datasets.updateStorageUri(dataset.id, receipt.receipt.artifacts.datasetUri ?? "");
      await this.experiments.completeAttempt(selectedAttemptId, {
        status: "selected",
        summaryJson: {
          selected: true,
          receiptId: receipt.id,
          verificationStatus: verification.verificationStatus,
          confidence: verification.confidence
        }
      });
      await this.experiments.addMessage({
        experimentId,
        role: "agent",
        message: `Finished the experiment. Selected ${mlResult.bestModel.modelName} on attempt ${selectedAttemptNumber} with ${verification.confidence} confidence.`,
        metadata: {
          selectedAttemptNumber,
          bestModel: mlResult.bestModel.modelName,
          confidence: verification.confidence
        }
      });
      if (dataset.connectorRunId) {
        await this.connectorRuns.setStage(dataset.connectorRunId, {
          status: "completed",
          stage: "completed",
          message: "Experiment completed successfully",
          extra: { experimentId, receiptId: receipt.id }
        });
      }
      await this.experiments.complete(experimentId, {
        finalAnswer: answer.finalAnswer,
        confidence: verification.confidence,
        resultSummary: {
          ...answer.resultSummary,
          receiptId: receipt.id,
          receiptHash: receipt.receiptHash,
          verificationStatus: receipt.receipt.verificationStatus,
          txHash: receipt.txHash,
          proofStorageUri: receipt.receiptStorageUri
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown orchestration error";
      const status = inferFailureStatusFromMessage(message);
      if (dataset.connectorRunId) {
        await this.connectorRuns.setStage(dataset.connectorRunId, {
          status: "failed",
          stage: "failed",
          message,
          extra: { experimentId, status }
        });
      }
      await this.experiments.appendProgress(experimentId, {
        stage: "failed",
        message,
        details: { status }
      });
      await this.experiments.addMessage({
        experimentId,
        role: "agent",
        message: `The experiment failed at status ${status}: ${message}`,
        metadata: { status }
      });
      await this.experiments.fail(experimentId, status, message);
      logError("experiment_orchestration_failed", error, {
        experimentId,
        status
      });
      return;
    }
  }
}
