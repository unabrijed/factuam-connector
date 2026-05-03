import type { ConnectorRequest } from "@factuam/shared-types";

export type ConnectorPreset = {
  id: string;
  connectorProvider: ConnectorRequest["provider"];
  label: string;
  description: string;
  datasetName: string;
  query: string;
  connectorRequest: ConnectorRequest;
  expectedColumns?: string[];
};

export const connectorPresets: ConnectorPreset[] = [
  {
    id: "wine-value-analysis",
    connectorProvider: "kaggle",
    label: "Wine value analysis",
    description: "Fixed Kaggle demo using wine reviews. Good for a stable one-click import + run flow.",
    datasetName: "zynicide/wine-reviews",
    query:
      "Using price, country, province, and variety, predict wine review points and identify which country-variety segments appear to offer the strongest value for money.",
    connectorRequest: {
      provider: "kaggle",
      params: {
        dataset: "zynicide/wine-reviews",
        file: "winemag-data-130k-v2.csv"
      }
    },
    expectedColumns: ["country", "variety", "price", "points", "province"]
  },
  {
    id: "owid-life-expectancy",
    connectorProvider: "url_csv",
    label: "Public CSV: life expectancy",
    description: "A ready-to-run public CSV preset for quick connector expansion beyond Kaggle.",
    datasetName: "owid-life-expectancy",
    query:
      "Which countries show the strongest long-run improvements in life expectancy, and what broad patterns stand out across the dataset?",
    connectorRequest: {
      provider: "url_csv",
      params: {
        url: "https://raw.githubusercontent.com/owid/owid-datasets/master/datasets/Long-run%20life%20expectancy%20-%20Clio-Infra%20%282015%29/Long-run%20life%20expectancy%20-%20Clio-Infra%20%282015%29.csv",
        fileName: "owid-life-expectancy.csv"
      }
    },
    expectedColumns: ["Entity", "Code", "Year", "Period life expectancy at birth - Sex: total - Age: 0"]
  }
];

export function getConnectorPresetById(id: string) {
  return connectorPresets.find((preset) => preset.id === id);
}
