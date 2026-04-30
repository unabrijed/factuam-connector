import { AgentOrchestratorService } from "../services/agent-orchestrator.service";

const orchestrator = new AgentOrchestratorService();

export async function runExperimentJobController(experimentId: string) {
  await orchestrator.runExperiment(experimentId);
  return { ok: true };
}
