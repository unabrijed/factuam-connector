import type { ConnectorProvider, ConnectorRequest } from "@factum/shared-types";
import { KaggleDatasetConnector } from "../../../../packages/kaggle-connector/src/index";
import { UrlCsvConnector } from "../../../../packages/url-connector/src/index";
import type { Connector, ConnectorResult } from "../../../../packages/connector-sdk/src/index";
import { config, paths } from "../config";
import { ensureDir } from "../lib/fs";

export class ConnectorRegistryService {
  private readonly connectors = new Map<ConnectorProvider, Connector>();

  constructor() {
    this.connectors.set(
      "kaggle",
      new KaggleDatasetConnector({
        workspaceRoot: paths.connectors,
        pythonBin: config.KAGGLE_PYTHON_BIN,
        apiToken: config.KAGGLE_API_TOKEN
      })
    );
    this.connectors.set(
      "url_csv",
      new UrlCsvConnector({
        workspaceRoot: paths.connectors
      })
    );
  }

  list() {
    return [...this.connectors.values()].map((connector) => connector.manifest());
  }

  get(provider: ConnectorProvider) {
    const connector = this.connectors.get(provider);
    if (!connector) {
      throw new Error(`Unsupported connector provider: ${provider}`);
    }
    return connector;
  }

  async execute(request: ConnectorRequest, runId: string): Promise<ConnectorResult> {
    await ensureDir(paths.connectors);
    const connector = this.get(request.provider);
    return connector.execute({ params: request.params, runId });
  }
}
