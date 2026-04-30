import fs from "node:fs/promises";
import { sha256Buffer } from "@factum/proof-receipts";
import type { ConnectorResult } from "../../../../packages/connector-sdk/src/index";
import { DatasetService } from "./dataset.service";

export class DatasetBuilderService {
  constructor(private readonly datasets = new DatasetService()) {}

  async createFromConnectorResult(input: { name: string; connectorRunId: string; result: ConnectorResult }) {
    const datasetBuffer = await fs.readFile(input.result.datasetCandidate.path);
    const datasetHash = sha256Buffer(datasetBuffer);
    const rawPayloadPath = input.result.rawArtifacts[0]?.path;

    const dataset = await this.datasets.createFromLocalFile({
      name: input.name,
      localPath: input.result.datasetCandidate.path,
      originalFilename: input.result.datasetCandidate.originalFilename,
      sourceType: input.result.provider,
      sourceMeta: input.result.sourceMeta,
      connectorId: input.result.connectorId,
      connectorRunId: input.connectorRunId,
      rawPayloadPath
    });

    return { ...dataset, datasetHash };
  }
}
