import type { ConnectorProvider, KaggleConnectorParams } from "@factum/shared-types";

export type RawArtifact = {
  type: "archive" | "source_file";
  path: string;
  sha256: string;
};

export type DatasetCandidate = {
  path: string;
  format: "csv";
  originalFilename: string;
};

export type ConnectorResult = {
  provider: ConnectorProvider;
  connectorId: string;
  rawArtifacts: RawArtifact[];
  datasetCandidate: DatasetCandidate;
  sourceMeta: Record<string, unknown>;
};

export type ConnectorManifest = {
  provider: ConnectorProvider;
  connectorId: string;
  displayName: string;
  supportedModes: Array<"import">;
};

export interface Connector<TParams = unknown> {
  id: string;
  provider: ConnectorProvider;
  manifest(): ConnectorManifest;
  execute(input: { params: TParams; runId: string }): Promise<ConnectorResult>;
}

export type KaggleConnector = Connector<KaggleConnectorParams>;
