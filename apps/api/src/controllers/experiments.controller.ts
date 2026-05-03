import type { CreateExperimentInput } from "@factuam/shared-types";
import { ExperimentService } from "../services/experiment.service";
import { enqueueExperiment } from "../jobs/queue";
import { ConnectorAcquisitionService } from "../services/connector-acquisition.service";
import { ConnectorRunService } from "../services/connector-run.service";
import { getDatasetNameFromConnectorRequest } from "../lib/connectors";
import { isExperimentTerminal } from "../lib/experiment-status";
import { KaggleSuggestService } from "../services/kaggle-suggest.service";
import { AppError } from "../lib/errors";

const experimentService = new ExperimentService();
const connectorAcquisition = new ConnectorAcquisitionService();
const connectorRuns = new ConnectorRunService();
const kaggleSuggest = new KaggleSuggestService();

export async function createExperimentController(parsed: CreateExperimentInput) {
  let effective: CreateExperimentInput = parsed;

  if (parsed.mode === "connector" && parsed.discoverKaggle && !parsed.connectorRequest) {
    const best = await kaggleSuggest.pickBestForQuery(parsed.query);
    if (!best) {
      throw new AppError(
        "No Kaggle dataset with a CSV file matched your prompt. Try a shorter search (e.g. “wine quality”) or choose a preset.",
        400,
        "kaggle_discover_empty"
      );
    }
    effective = {
      query: parsed.query,
      mode: "connector",
      connectorRequest: best.connectorRequest
    };
  }

  let connectorRunId: string | undefined;
  if (effective.mode === "connector") {
    if (!effective.connectorRequest) {
      throw new Error("connectorRequest is required in connector mode");
    }
    const acquisition = await connectorAcquisition.acquireDataset({
      request: effective.connectorRequest,
      datasetName: getDatasetNameFromConnectorRequest(effective.connectorRequest)
    });
    connectorRunId = acquisition.runId;
    effective = { ...effective, datasetId: acquisition.datasetId };
  }

  const result = await experimentService.createExperiment(effective);
  await enqueueExperiment({ experimentId: result.experimentId, datasetId: effective.datasetId });
  await experimentService.appendProgress(result.experimentId, {
    stage: "enqueue",
    message: "Experiment created and queued for execution",
    details: { datasetId: effective.datasetId ?? null, mode: effective.mode }
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
