import type { CreateExperimentInput } from "@factum/shared-types";
import { ExperimentService } from "../services/experiment.service";
import { enqueueExperiment } from "../jobs/queue";
import { ConnectorAcquisitionService } from "../services/connector-acquisition.service";
import { ConnectorRunService } from "../services/connector-run.service";
import { getDatasetNameFromConnectorRequest } from "../lib/connectors";
import { isExperimentTerminal } from "../lib/experiment-status";

const experimentService = new ExperimentService();
const connectorAcquisition = new ConnectorAcquisitionService();
const connectorRuns = new ConnectorRunService();

export async function createExperimentController(input: CreateExperimentInput) {
  let connectorRunId: string | undefined;
  if (input.mode === "connector") {
    if (!input.connectorRequest) {
      throw new Error("connectorRequest is required in connector mode");
    }
    const acquisition = await connectorAcquisition.acquireDataset({
      request: input.connectorRequest,
      datasetName: getDatasetNameFromConnectorRequest(input.connectorRequest)
    });
    connectorRunId = acquisition.runId;
    input = { ...input, datasetId: acquisition.datasetId };
  }

  const result = await experimentService.createExperiment(input);
  await enqueueExperiment({ experimentId: result.experimentId, datasetId: input.datasetId });
  await experimentService.appendProgress(result.experimentId, {
    stage: "enqueue",
    message: "Experiment created and queued for execution",
    details: { datasetId: input.datasetId ?? null, mode: input.mode }
  });
  if (connectorRunId) {
    await connectorRuns.setStage(connectorRunId, {
      status: "running",
      stage: "enqueue",
      message: "Experiment enqueued"
    });
  }
  return { ...result, connectorRunId };
}

export async function getExperimentController(experimentId: string) {
  return experimentService.getDetail(experimentId);
}

export async function addExperimentMessageController(
  experimentId: string,
  input: { message: string; rerun?: boolean }
) {
  const experiment = await experimentService.getById(experimentId);
  if (!experiment) {
    throw new Error("Experiment not found");
  }

  await experimentService.addMessage({
    experimentId,
    role: "user",
    message: input.message
  });
  await experimentService.appendProgress(experimentId, {
    stage: "user_guidance",
    message: "User provided additional guidance",
    details: { message: input.message.slice(0, 300) }
  });

  const shouldRerun = input.rerun ?? isExperimentTerminal(experiment.status);
  if (shouldRerun) {
    await experimentService.updateStatus(experimentId, "CREATED", {
      errorMessage: null,
      finalAnswer: null,
      confidence: null
    });
    await enqueueExperiment({ experimentId, datasetId: experiment.datasetId ?? undefined });
    const ack = "Guidance received. Re-queued the experiment with your new directions.";
    await experimentService.addMessage({
      experimentId,
      role: "agent",
      message: ack
    });
    await experimentService.appendProgress(experimentId, {
      stage: "rerun_enqueued",
      message: ack
    });
  } else {
    const ack = "Guidance received. I will use it on the next retry or rerun.";
    await experimentService.addMessage({
      experimentId,
      role: "agent",
      message: ack
    });
  }

  return experimentService.getDetail(experimentId);
}
