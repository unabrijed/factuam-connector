import { z } from "zod";
import type { AgentToolDefinition } from "../tool-definition";

const KaggleSearchInputSchema = z.object({
  query: z.string().min(1),
  maxResults: z.number().int().positive().max(50).optional()
});

/**
 * Kaggle search is not yet exposed as a first-class API in Factum; this tool defines the
 * contract for a future connector or Kaggle API proxy so the agent can discover datasets
 * before calling `dataset.import_kaggle`.
 */
export const datasetDiscoveryTools: AgentToolDefinition[] = [
  {
    id: "discovery.kaggle_search",
    kind: "discovery",
    title: "Search Kaggle datasets (planned)",
    description:
      "Search for relevant public datasets by keyword; results should feed into `dataset.import_kaggle` with a chosen dataset slug.",
    binding: {
      type: "planned",
      id: "kaggle_api_search",
      summary: "Kaggle public API or CLI search wrapper with cached metadata"
    },
    inputSchema: KaggleSearchInputSchema
  }
];

export { KaggleSearchInputSchema };
