import type { AttemptSummary } from "@factuam/agent-sdk";
import { EvidenceClassifierService } from "../services/agents/evidence-classifier.service";
import { ExperimentPlannerService } from "../services/agents/experiment-planner.service";
import { AnswerGeneratorService } from "../services/agents/answer-generator.service";
import { VerifierService } from "../services/agents/verifier.service";
import { StrategyAgentService } from "../services/agents/strategy-agent.service";
import { ReflectionAgentService } from "../services/agents/reflection-agent.service";
import { ValidationService } from "../services/validation.service";
import { DiagnosisService } from "../services/diagnosis.service";
import { MlWorkerService } from "../services/ml-worker.service";

const evidenceClassifier = new EvidenceClassifierService();
const experimentPlanner = new ExperimentPlannerService();
const validation = new ValidationService();
const diagnosis = new DiagnosisService();
const strategy = new StrategyAgentService();
const reflection = new ReflectionAgentService();
const mlWorker = new MlWorkerService();
const verifier = new VerifierService();
const answerGenerator = new AnswerGeneratorService();

/**
 * Run specialist logic for a factuam AXL topic (matches `factuam.${agent}` in the orchestrator).
 */
export async function runAgentByTopic(topic: string, data: { correlationId?: string; payload?: unknown }): Promise<unknown> {
  switch (topic) {
    case "factuam.evidence_classifier": {
      const p = data.payload as { query: string; availableDataset?: unknown };
      return evidenceClassifier.run(p);
    }
    case "factuam.experiment_planner": {
      const p = data.payload as { query: string; datasetSchema: unknown };
      return experimentPlanner.run(p);
    }
    case "factuam.validation_agent": {
      const p = data.payload as Parameters<ValidationService["validate"]>[0];
      return validation.validate(p);
    }
    case "factuam.diagnosis_agent": {
      const p = data.payload as {
        plan: Parameters<DiagnosisService["diagnose"]>[0]["plan"];
        validation: Parameters<DiagnosisService["diagnose"]>[0]["validation"];
      };
      return diagnosis.diagnose(p);
    }
    case "factuam.strategy_agent": {
      const p = data.payload as Parameters<StrategyAgentService["run"]>[0];
      return strategy.run(p);
    }
    case "factuam.training_agent": {
      const p = data.payload as {
        experimentId: string;
        datasetId: string;
        datasetPath: string;
        plan: import("@factuam/shared-types").ExperimentPlan;
        attemptNumber: number;
        previousAttempts?: AttemptSummary[];
      };
      return mlWorker.runExperiment(p);
    }
    case "factuam.reflection_agent": {
      const p = data.payload as Parameters<ReflectionAgentService["run"]>[0];
      return reflection.run(p);
    }
    case "factuam.verifier":
      return verifier.run(data.payload);
    case "factuam.answer_generator":
      return answerGenerator.run(data.payload);
    default:
      throw new Error(`Unknown AXL topic for unified worker: ${topic}`);
  }
}
