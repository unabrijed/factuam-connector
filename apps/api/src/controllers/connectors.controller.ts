import { z } from "zod";
import { buildAgentConnectorManifest } from "@factum/agent-connectors";
import { ConnectorRequestSchema, CreateExperimentInputSchema, type ConnectorRequest } from "@factum/shared-types";
import { ConnectorAcquisitionService } from "../services/connector-acquisition.service";
import { ExperimentService } from "../services/experiment.service";
import { enqueueExperiment } from "../jobs/queue";
import { connectorPresets } from "../data/connector-presets";
import { getDatasetNameFromConnectorRequest } from "../lib/connectors";

const connectors = new ConnectorAcquisitionService();
const experiments = new ExperimentService();

const ConnectorImportInputSchema = z.object({
  query: z.string().min(5).optional(),
  createExperiment: z.boolean().default(false),
  datasetName: z.string().min(1).optional(),
  connectorRequest: ConnectorRequestSchema
});

const RunConnectorBodySchema = z
  .object({ datasetName: z.string().min(1).optional() })
  .and(ConnectorRequestSchema);

export function listConnectorsController() {
  return connectors.listConnectors();
}

export function listAgentConnectorManifestController() {
  return buildAgentConnectorManifest();
}

export async function runConnectorController(input: unknown) {
  const parsed = RunConnectorBodySchema.parse(input);
  const { datasetName, ...rest } = parsed;
  const request = rest as ConnectorRequest;
  const name = datasetName ?? getDatasetNameFromConnectorRequest(request);
  const acquisition = await connectors.acquireDataset({
    request,
    datasetName: name
  });
  return {
    connectorRunId: acquisition.runId,
    datasetId: acquisition.datasetId,
    status: "imported" as const
  };
}

export function listKagglePresetsController() {
  return connectorPresets.filter((preset) => preset.connectorProvider === "kaggle").map((preset) => ({
    id: preset.id,
    label: preset.label,
    description: preset.description,
    dataset: preset.connectorRequest.provider === "kaggle" ? preset.connectorRequest.params.dataset : preset.datasetName,
    file: preset.connectorRequest.provider === "kaggle" ? preset.connectorRequest.params.file : undefined,
    query: preset.query,
    expectedColumns: preset.expectedColumns
  }));
}

export function listConnectorPresetsController() {
  return connectorPresets;
}

export async function getConnectorRunController(runId: string) {
  return connectors.getRun(runId);
}

export async function importKaggleDatasetController(input: unknown) {
  const parsed = ConnectorImportInputSchema.parse(input);
  if (parsed.connectorRequest.provider !== "kaggle") {
    throw new Error("Kaggle import endpoint only supports the kaggle provider");
  }

  const datasetName = parsed.datasetName ?? getDatasetNameFromConnectorRequest(parsed.connectorRequest);
  const acquisition = await connectors.acquireDataset({
    request: parsed.connectorRequest,
    datasetName
  });

  if (!parsed.createExperiment) {
    return {
      connectorRunId: acquisition.runId,
      datasetId: acquisition.datasetId,
      status: "imported" as const
    };
  }

  if (!parsed.query) {
    throw new Error("query is required when createExperiment is true");
  }

  const experimentInput = CreateExperimentInputSchema.parse({
    query: parsed.query,
    mode: "connector",
    datasetId: acquisition.datasetId,
    connectorRequest: parsed.connectorRequest
  });
  const result = await experiments.createExperiment(experimentInput);
  await enqueueExperiment({ experimentId: result.experimentId, datasetId: acquisition.datasetId });

  return {
    connectorRunId: acquisition.runId,
    datasetId: acquisition.datasetId,
    experimentId: result.experimentId,
    status: result.status
  };
}
