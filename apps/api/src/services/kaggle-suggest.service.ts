import type { ConnectorRequest } from "@factuam/shared-types";
import {
  listDatasetFiles,
  listDatasets,
  parseDatasetRef,
  pickCsvFileName
} from "./kaggle-rest.service";

export type KaggleSuggestCandidate = {
  ref: string;
  title: string;
  subtitle?: string;
  selectedFile: string;
  connectorRequest: ConnectorRequest;
};

/**
 * Search public Kaggle datasets via HTTP API, resolve CSV file names, build connector requests.
 */
export class KaggleSuggestService {
  async suggestCandidates(query: string, limit = 8): Promise<KaggleSuggestCandidate[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const summaries = await listDatasets(trimmed, Math.min(25, Math.max(limit * 3, 15)));
    const candidates: KaggleSuggestCandidate[] = [];

    for (const s of summaries) {
      if (candidates.length >= limit) break;
      if (!s.ref) continue;
      try {
        const { ownerSlug, datasetSlug } = parseDatasetRef(s.ref);
        const files = await listDatasetFiles(ownerSlug, datasetSlug);
        const selectedFile = pickCsvFileName(files);
        if (!selectedFile) continue;

        const connectorRequest: ConnectorRequest = {
          provider: "kaggle",
          params: {
            dataset: s.ref,
            file: selectedFile
          }
        };

        candidates.push({
          ref: s.ref,
          title: s.title || s.ref,
          subtitle: s.subtitle,
          selectedFile,
          connectorRequest
        });
      } catch {
        continue;
      }
    }

    return candidates;
  }

  /** Pick first dataset that has a CSV file (API order ≈ relevance/hottest). */
  async pickBestForQuery(query: string): Promise<KaggleSuggestCandidate | null> {
    const candidates = await this.suggestCandidates(query, 5);
    return candidates[0] ?? null;
  }
}
