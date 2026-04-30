import fs from "node:fs/promises";
import path from "node:path";
import { sha256Buffer } from "@factum/proof-receipts";
import { UrlCsvConnectorParamsSchema, type UrlCsvConnectorParams } from "@factum/shared-types";
import type { Connector, ConnectorResult } from "../../connector-sdk/src/index";

export type UrlCsvConnectorOptions = {
  workspaceRoot: string;
};

function sanitizeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-");
}

export class UrlCsvConnector implements Connector<UrlCsvConnectorParams> {
  readonly id = "public_csv_url_v1" as const;
  readonly provider = "url_csv" as const;

  constructor(private readonly options: UrlCsvConnectorOptions) {}

  manifest() {
    return {
      provider: this.provider,
      connectorId: this.id,
      displayName: "Public CSV URL",
      supportedModes: ["import"] as Array<"import">
    };
  }

  async execute(input: { params: UrlCsvConnectorParams; runId: string }): Promise<ConnectorResult> {
    const params = UrlCsvConnectorParamsSchema.parse(input.params);
    const runDir = path.join(this.options.workspaceRoot, input.runId);
    await fs.mkdir(runDir, { recursive: true });

    const response = await fetch(params.url);
    if (!response.ok) {
      throw new Error(`CSV download failed with status ${response.status}`);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("csv") && !params.url.toLowerCase().endsWith(".csv")) {
      throw new Error("Only public CSV URLs are supported");
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const derivedName = path.basename(new URL(params.url).pathname) || "dataset.csv";
    const fileName = sanitizeFilename(params.fileName ?? derivedName);
    const selectedPath = path.join(runDir, fileName.endsWith(".csv") ? fileName : `${fileName}.csv`);
    await fs.writeFile(selectedPath, buffer);

    return {
      provider: this.provider,
      connectorId: this.id,
      rawArtifacts: [{ type: "source_file", path: selectedPath, sha256: sha256Buffer(buffer) }],
      datasetCandidate: {
        path: selectedPath,
        format: "csv",
        originalFilename: path.basename(selectedPath)
      },
      sourceMeta: {
        provider: this.provider,
        url: params.url,
        selectedFile: path.basename(selectedPath),
        connectorVersion: "v1"
      }
    };
  }
}
