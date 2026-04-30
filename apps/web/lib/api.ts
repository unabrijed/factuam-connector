import { appConfig } from "./config";
import type { ConnectorProvider, ConnectorRequest } from "@factum/shared-types";

export type ConnectorPreset = {
  id: string;
  connectorProvider: ConnectorProvider;
  label: string;
  description: string;
  datasetName: string;
  query: string;
  connectorRequest: ConnectorRequest;
  expectedColumns?: string[];
};

export type KagglePreset = {
  id: string;
  label: string;
  description: string;
  dataset: string;
  file?: string;
  query: string;
  expectedColumns?: string[];
};

export type ConnectorManifest = {
  provider: string;
  connectorId: string;
  displayName: string;
  supportedModes: Array<"import">;
};

export type ConnectorRun = {
  id: string;
  provider: string;
  connectorId: string;
  status: string;
  sourceMeta?: Record<string, unknown>;
  rawHash?: string;
  normalizedHash?: string;
  errorMessage?: string;
};

async function getErrorMessage(response: Response, fallback: string) {
  try {
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const payload = (await response.json()) as { error?: string; message?: string; code?: string; requestId?: string };
      const message = payload.error ?? payload.message ?? fallback;
      return payload.code ? `${message} [${payload.code}${payload.requestId ? ` · ${payload.requestId}` : ""}]` : message;
    }

    const text = (await response.text()).trim();
    return text || fallback;
  } catch {
    return fallback;
  }
}

export async function uploadDataset(file: File, name: string) {
  const form = new FormData();
  form.set("file", file);
  form.set("name", name);

  const response = await fetch(`${appConfig.apiUrl}/api/datasets/upload`, {
    method: "POST",
    body: form
  });
  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to upload dataset"));
  }
  return response.json();
}

export async function getConnectors(): Promise<ConnectorManifest[]> {
  const response = await fetch(`${appConfig.apiUrl}/api/connectors`, {
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to load connectors"));
  }
  return response.json();
}

export async function getConnectorRun(runId: string): Promise<ConnectorRun> {
  const response = await fetch(`${appConfig.apiUrl}/api/connectors/runs/${runId}`, {
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to fetch connector run"));
  }
  return response.json();
}

export async function createExperiment(input: {
  query: string;
  datasetId?: string;
  mode?: "upload" | "connector";
  connectorRequest?: ConnectorRequest;
}) {
  const response = await fetch(`${appConfig.apiUrl}/api/experiments`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to create experiment"));
  }
  return response.json();
}

export async function getConnectorPresets(): Promise<ConnectorPreset[]> {
  const response = await fetch(`${appConfig.apiUrl}/api/connectors/presets`, {
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to load connector presets"));
  }
  return response.json();
}

export async function getKagglePresets(): Promise<KagglePreset[]> {
  const response = await fetch(`${appConfig.apiUrl}/api/connectors/kaggle/presets`, {
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to load Kaggle presets"));
  }
  return response.json();
}

export async function getExperiment(experimentId: string) {
  const response = await fetch(`${appConfig.apiUrl}/api/experiments/${experimentId}`, {
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to fetch experiment"));
  }
  return response.json();
}

export async function sendExperimentMessage(
  experimentId: string,
  input: { message: string; rerun?: boolean }
) {
  const response = await fetch(`${appConfig.apiUrl}/api/experiments/${experimentId}/messages`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to send experiment guidance"));
  }
  return response.json();
}

export async function getProof(receiptId: string) {
  const response = await fetch(`${appConfig.apiUrl}/api/proofs/${receiptId}`, {
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to fetch proof receipt"));
  }
  return response.json();
}
