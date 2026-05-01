import { z } from "zod";
import { KaggleConnectorParamsSchema, UrlCsvConnectorParamsSchema } from "@factum/shared-types";
import type { AgentToolDefinition } from "../tool-definition";

const KaggleImportInputSchema = z.object({
  provider: z.literal("kaggle"),
  params: KaggleConnectorParamsSchema
});

const UrlCsvImportInputSchema = z.object({
  provider: z.literal("url_csv"),
  params: UrlCsvConnectorParamsSchema
});

const DatasetImportInputSchema = z.discriminatedUnion("provider", [KaggleImportInputSchema, UrlCsvImportInputSchema]);

export const datasetSourceTools: AgentToolDefinition[] = [
  {
    id: "dataset.import_kaggle",
    kind: "data_source",
    title: "Import Kaggle dataset",
    description:
      "Download a tabular file from Kaggle via the connector workspace and produce a hashed dataset candidate for experiments.",
    binding: {
      type: "connector_registry",
      provider: "kaggle",
      route: "/api/connectors/run"
    },
    inputSchema: KaggleImportInputSchema
  },
  {
    id: "dataset.import_url_csv",
    kind: "data_source",
    title: "Import CSV from URL",
    description: "Fetch a CSV from an HTTPS URL and stage it as a normalized dataset candidate.",
    binding: {
      type: "connector_registry",
      provider: "url_csv",
      route: "/api/connectors/run"
    },
    inputSchema: UrlCsvImportInputSchema
  }
];

export { DatasetImportInputSchema };
