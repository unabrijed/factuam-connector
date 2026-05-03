import type { ConnectorRequest } from "@factuam/shared-types";
import { ConnectorRunService } from "./connector-run.service";
import { ConnectorRegistryService } from "./connector-registry.service";
import { DatasetBuilderService } from "./dataset-builder.service";
import { AppError } from "../lib/errors";

export class ConnectorAcquisitionService {
  constructor(
    private readonly connectorRuns = new ConnectorRunService(),
    private readonly registry = new ConnectorRegistryService(),
    private readonly datasetBuilder = new DatasetBuilderService()
  ) {}

  listConnectors() {
    return this.registry.list();
  }

  async getRun(runId: string) {
    return this.connectorRuns.getById(runId);
  }

  async acquireDataset(input: { request: ConnectorRequest; datasetName: string }) {
    const connector = this.registry.get(input.request.provider);
    const runId = await this.connectorRuns.create({
      provider: input.request.provider,
      connectorId: connector.id,
      requestJson: input.request as unknown as Record<string, unknown>
    });

    try {
      await this.connectorRuns.setStage(runId, {
        status: "running",
        stage: "download",
        message: "Downloading source dataset"
      });
      const result = await this.registry.execute(input.request, runId);
      await this.connectorRuns.setStage(runId, {
        status: "running",
        stage: "normalize",
        message: "Normalizing dataset metadata"
      });
      result.sourceMeta = {
        ...result.sourceMeta,
        rawHash: result.rawArtifacts[0]?.sha256
      };
      await this.connectorRuns.setStage(runId, {
        status: "running",
        stage: "upload_0g",
        message: "Uploading dataset to 0G Storage"
      });
      const dataset = await this.datasetBuilder.createFromConnectorResult({
        name: input.datasetName,
        connectorRunId: runId,
        result
      });
      await this.connectorRuns.update(runId, {
        status: "completed",
        sourceMeta: result.sourceMeta,
        rawHash: result.rawArtifacts[0]?.sha256,
        normalizedHash: dataset.datasetHash
      });
      await this.connectorRuns.setStage(runId, {
        status: "completed",
        stage: "completed",
        message: dataset.ogStorageUri
          ? "Dataset ready for experiment run"
          : "Dataset ready locally for experiment run; 0G upload deferred",
        extra: {
          datasetId: dataset.datasetId,
          ogStorageUri: dataset.ogStorageUri,
          storageStatus: dataset.status,
          ...(dataset.warning ? { warning: dataset.warning } : {})
        }
      });
      return { runId, datasetId: dataset.datasetId };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown connector acquisition error";
      await this.connectorRuns.update(runId, {
        status: "failed",
        errorMessage: message,
        sourceMeta: {
          stage: "failed",
          stageMessage: message
        }
      });
      throw new AppError(message, 502, "kaggle_import_failed", { runId, provider: input.request.provider });
    }
  }
}
