/**
 * Kaggle public HTTP API (same paths as kagglesdk): POST JSON to api.kaggle.com.
 * No CLI — suitable for in-app / server-side use.
 *
 * @see https://api.kaggle.com — ListDatasets works without auth for public catalog (rate limits may apply).
 */

const KAGGLE_API_BASE = "https://api.kaggle.com";

export type KaggleDatasetSummary = {
  ref: string;
  title: string;
  subtitle?: string;
  ownerRef?: string;
  voteCount?: number;
  downloadCount?: number;
};

export type KaggleDatasetFileRow = {
  name: string;
  totalBytes?: number;
};

function authHeaders(): HeadersInit {
  const token = process.env.KAGGLE_API_TOKEN?.trim();
  if (!token) return { "Content-Type": "application/json" };
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };
}

async function postJson<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${KAGGLE_API_BASE}${path}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Kaggle API ${res.status}: ${text.slice(0, 500)}`);
  }
  return res.json() as Promise<T>;
}

export function parseDatasetRef(ref: string): { ownerSlug: string; datasetSlug: string } {
  const trimmed = ref.trim();
  const slash = trimmed.indexOf("/");
  if (slash <= 0 || slash === trimmed.length - 1) {
    throw new Error(`Invalid Kaggle dataset ref (expected owner/slug): ${ref}`);
  }
  let ownerSlug = trimmed.slice(0, slash);
  const datasetSlug = trimmed.slice(slash + 1);
  if (ownerSlug.startsWith("organizations/")) {
    ownerSlug = ownerSlug.slice("organizations/".length);
  }
  return { ownerSlug, datasetSlug };
}

/** Prefer main CSV files; avoid tiny samples when multiple exist. */
export function pickCsvFileName(files: KaggleDatasetFileRow[]): string | undefined {
  const csvs = files.filter((f) => f.name.toLowerCase().endsWith(".csv"));
  if (!csvs.length) return undefined;
  if (csvs.length === 1) {
    const only = csvs[0];
    return only?.name;
  }
  const sorted = [...csvs].sort((a, b) => (b.totalBytes ?? 0) - (a.totalBytes ?? 0));
  const nonSample = sorted.find((f) => !/sample|mini|tiny/i.test(f.name));
  const pick = nonSample ?? sorted[0];
  return pick?.name;
}

export async function listDatasets(search: string, pageSize = 15): Promise<KaggleDatasetSummary[]> {
  const body = {
    search: search.slice(0, 500),
    pageSize,
    page: 1
  };
  const json = await postJson<{ datasets?: Array<Record<string, unknown>> }>(
    "/v1/datasets.DatasetApiService/ListDatasets",
    body
  );
  const rows = json.datasets ?? [];
  return rows.map((d) => ({
    ref: String(d.ref ?? ""),
    title: String(d.title ?? ""),
    subtitle: d.subtitle != null ? String(d.subtitle) : undefined,
    ownerRef: d.ownerRef != null ? String(d.ownerRef) : undefined,
    voteCount: typeof d.voteCount === "number" ? d.voteCount : undefined,
    downloadCount: typeof d.downloadCount === "number" ? d.downloadCount : undefined
  })).filter((d) => d.ref.includes("/"));
}

export async function listDatasetFiles(ownerSlug: string, datasetSlug: string, pageSize = 50): Promise<KaggleDatasetFileRow[]> {
  const json = await postJson<{ datasetFiles?: KaggleDatasetFileRow[] }>(
    "/v1/datasets.DatasetApiService/ListDatasetFiles",
    {
      ownerSlug,
      datasetSlug,
      pageSize
    }
  );
  return json.datasetFiles ?? [];
}
