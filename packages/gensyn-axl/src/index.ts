/**
 * HTTP client for the Gensyn AXL node's local bridge (default http://127.0.0.1:9002).
 *
 * Matches upstream handlers in https://github.com/gensyn-ai/axl/tree/main/api :
 * - POST /send — header `X-Destination-Peer-Id` (64-char hex peer id), body = raw bytes (we use UTF-8 JSON).
 * - GET /recv — 204 if empty; else raw body + `X-From-Peer-Id`.
 *
 * Application framing: UTF-8 JSON `{"topic":"...","data":{...}}` so workers can route by `topic`
 * and use `data` for correlationId / payload / result.
 *
 * Docs: https://docs.gensyn.ai/tech/agent-exchange-layer
 */
export type AxlMessageEnvelope<TData = unknown> = {
  id?: string;
  from?: string;
  to?: string;
  data: TData;
  topic?: string;
  timestamp?: string;
};

export type AxlTransportConfig = {
  apiBaseUrl?: string;
  fetchImpl?: typeof fetch;
};

export type SendAxlMessageInput<TPayload> = {
  to: string;
  payload: TPayload;
  topic?: string;
};

function wireBody(topic: string | undefined, payload: unknown): string {
  return JSON.stringify({ topic, data: payload });
}

function parseInboundMessage(raw: Uint8Array): { topic?: string; data: unknown } {
  const text = new TextDecoder("utf-8", { fatal: false }).decode(raw);
  const parsed = JSON.parse(text) as { topic?: string; data?: unknown };
  if (parsed && typeof parsed === "object" && "data" in parsed) {
    return { topic: parsed.topic, data: parsed.data };
  }
  throw new Error("AXL message JSON must include a `data` field");
}

export class AxlTransportClient {
  private readonly apiBaseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(config: AxlTransportConfig = {}) {
    this.apiBaseUrl = config.apiBaseUrl ?? "http://127.0.0.1:9002";
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  async send<TPayload>(input: SendAxlMessageInput<TPayload>): Promise<unknown> {
    const bodyText = wireBody(input.topic, input.payload);
    const response = await this.fetchImpl(`${this.apiBaseUrl}/send`, {
      method: "POST",
      headers: {
        "X-Destination-Peer-Id": input.to,
        "Content-Type": "application/json"
      },
      body: new Blob([bodyText], { type: "application/json" })
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`AXL send failed with status ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`);
    }

    if (response.headers.get("content-type")?.includes("application/json")) {
      return response.json();
    }
    return undefined;
  }

  /**
   * Poll one message from the node's queue (upstream pops a single FIFO entry per call).
   * Returns an empty array when the queue is empty (HTTP 204).
   */
  async recv<TPayload>(): Promise<Array<AxlMessageEnvelope<TPayload>>> {
    const response = await this.fetchImpl(`${this.apiBaseUrl}/recv`);
    if (response.status === 204) {
      return [];
    }
    if (!response.ok) {
      throw new Error(`AXL recv failed with status ${response.status}`);
    }

    const fromPeerId = response.headers.get("X-From-Peer-Id") ?? undefined;
    const buf = new Uint8Array(await response.arrayBuffer());
    if (buf.length === 0) {
      return [];
    }

    const { topic, data } = parseInboundMessage(buf);
    return [
      {
        from: fromPeerId,
        topic,
        data: data as TPayload
      }
    ];
  }

  /** Liveness: upstream exposes /topology, not /health. */
  async getHealth(): Promise<unknown> {
    const response = await this.fetchImpl(`${this.apiBaseUrl}/topology`);
    if (!response.ok) {
      throw new Error(`AXL topology check failed with status ${response.status}`);
    }
    return response.json();
  }
}
