import { config } from "../config";

/** Proxies the Go AXL node's `/topology` so the web app avoids browser CORS to localhost:9002. */
export async function getAxlTopologyController(): Promise<Record<string, unknown>> {
  const base = config.GENSYN_AXL_API_URL.replace(/\/$/, "");
  const res = await fetch(`${base}/topology`);
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`upstream topology HTTP ${res.status}: ${text.slice(0, 240)}`);
  }
  return JSON.parse(text) as Record<string, unknown>;
}
