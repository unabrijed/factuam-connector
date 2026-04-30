import { AxlTransportClient, type AxlMessageEnvelope } from "@factum/gensyn-axl";

const replyQueue = new Map<string, Array<(msg: unknown) => void>>();
let pollerRunning = false;

function replyKey(experimentId: string, type: string) {
  return `${experimentId}:${type}`;
}

export function createTransport(apiBaseUrl?: string) {
  return new AxlTransportClient({ apiBaseUrl });
}

export async function waitForAxlNode(apiBaseUrl?: string, retries = 20, delayMs = 500) {
  const client = createTransport(apiBaseUrl);
  let lastError: unknown;
  for (let i = 0; i < retries; i += 1) {
    try {
      await client.getHealth();
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("AXL node did not become ready");
}

export async function getOwnPeerId(apiBaseUrl?: string) {
  const client = createTransport(apiBaseUrl);
  const topology = (await client.getHealth()) as { our_public_key?: string };
  return topology.our_public_key ?? "";
}

export async function sendToAgent<TPayload>(to: string, payload: TPayload, topic?: string, apiBaseUrl?: string) {
  const client = createTransport(apiBaseUrl);
  return client.send({ to, payload, topic });
}

export async function pollInbound<TPayload>(apiBaseUrl?: string) {
  const client = createTransport(apiBaseUrl);
  return client.recv<TPayload>();
}

export function startAxlPoller(apiBaseUrl?: string) {
  if (pollerRunning) return;
  pollerRunning = true;
  void (async () => {
    while (true) {
      try {
        const messages = await pollInbound<{ experiment_id?: string; type?: string }>(apiBaseUrl);
        for (const { data } of messages) {
          const experimentId = data?.experiment_id;
          const type = data?.type;
          if (!experimentId || !type) continue;
          const key = replyKey(experimentId, type);
          const waiters = replyQueue.get(key);
          if (!waiters?.length) continue;
          const resolve = waiters.shift();
          if (waiters.length === 0) replyQueue.delete(key);
          resolve?.(data);
        }
      } catch {
        // ignore and continue polling
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  })();
}

export function waitForReply<T>(experimentId: string, type: string, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const key = replyKey(experimentId, type);
    const onReply = (msg: unknown) => {
      clearTimeout(timer);
      resolve(msg as T);
    };
    const timer = setTimeout(() => {
      const waiters = replyQueue.get(key);
      if (waiters) {
        const idx = waiters.indexOf(onReply);
        if (idx >= 0) waiters.splice(idx, 1);
        if (waiters.length === 0) replyQueue.delete(key);
      }
      reject(new Error(`Timeout waiting for ${type} on experiment ${experimentId}`));
    }, timeoutMs);
    replyQueue.set(key, [...(replyQueue.get(key) ?? []), onReply]);
  });
}

export type InboundAxlMessage<TPayload> = AxlMessageEnvelope<TPayload>;
