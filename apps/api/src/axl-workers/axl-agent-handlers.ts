import type { AttemptSummary } from "@factum/agent-sdk";
import { EvidenceClassifierService } from "../services/agents/evidence-classifier.service";
import { ExperimentPlannerService } from "../services/agents/experiment-planner.service";
import { AnswerGeneratorService } from "../services/agents/answer-generator.service";
import { VerifierService } from "../services/agents/verifier.service";
import { ValidationService } from "../services/validation.service";
import { DiagnosisService } from "../services/diagnosis.service";
import { StrategyService } from "../services/strategy.service";
import { ReflectionService } from "../services/reflection.service";
import { MlWorkerService } from "../services/ml-worker.service";

const evidenceClassifier = new EvidenceClassifierService();
const experimentPlanner = new ExperimentPlannerService();
const validation = new ValidationService();
const diagnosis = new DiagnosisService();
const strategy = new StrategyService();
const reflection = new ReflectionService();
const mlWorker = new MlWorkerService();
const verifier = new VerifierService();
const answerGenerator = new AnswerGeneratorService();

/**
 * Run specialist logic for a Factum AXL topic (matches `factum.${agent}` in the orchestrator).
 */
export async function runAgentByTopic(topic: string, data: { correlationId?: string; payload?: unknown }): Promise<unknown> {
  switch (topic) {
    case "factum.evidence_classifier": {
      const p = data.payload as { query: string; availableDataset?: unknown };
      return evidenceClassifier.run(p);
    }
    case "factum.experiment_planner": {
      const p = data.payload as { query: string; datasetSchema: unknown };
      return experimentPlanner.run(p);
    }
    case "factum.validation_agent": {
      const p = data.payload as Parameters<ValidationService["validate"]>[0];
      return validation.validate(p);
    }
    case "factum.diagnosis_agent": {
      const p = data.payload as {
        plan: Parameters<DiagnosisService["diagnose"]>[0]["plan"];
        validation: Parameters<DiagnosisService["diagnose"]>[0]["validation"];
      };
      return diagnosis.diagnose(p);
    }
    case "factum.strategy_agent": {
      const p = data.payload as Parameters<StrategyService["decide"]>[0];
      return strategy.decide(p);
    }
    case "factum.training_agent": {
      const p = data.payload as {
        experimentId: string;
        datasetId: string;
        datasetPath: string;
        plan: import("@factum/shared-types").ExperimentPlan;
        attemptNumber: number;
        previousAttempts?: AttemptSummary[];
      };
      return mlWorker.runExperiment(p);
    }
    case "factum.reflection_agent": {
      const p = data.payload as {
        attempt_id: string;
        attempt_summary: AttemptSummary;
        success: boolean;
      };
      const summary = p.attempt_summary;
      return p.success
        ? reflection.reflectSuccess({
            attemptId: p.attempt_id,
            attemptNumber: summary.attempt_number,
            bestModel: summary.model ?? "unknown",
            lift: summary.baseline_metric ?? 0,
            success: summary.significant ?? false
          })
        : reflection.reflectFailure({
            attemptId: p.attempt_id,
            attemptNumber: summary.attempt_number,
            error: summary.error ?? "Unknown training error"
          });
    }
    case "factum.verifier":
      return verifier.run(data.payload);
    case "factum.answer_generator":
      return answerGenerator.run(data.payload);
    default:
      throw new Error(`Unknown AXL topic for unified worker: ${topic}`);
  }
}
