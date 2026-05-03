import IORedis from "ioredis";
import { config } from "../config";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const KEY_PREFIX = "factuam:axl:reply:";

/**
 * Correlates AXL agent replies when using single-node mode: the unified worker publishes here;
 * the API must not poll /recv on the same FIFO as the worker.
 */
export class AxlReplyBrokerService {
  private readonly redis: IORedis;

  constructor() {
    this.redis = new IORedis(config.REDIS_URL, { maxRetriesPerRequest: null });
  }

  key(correlationId: string) {
    return `${KEY_PREFIX}${correlationId}`;
  }

  async publishReply(correlationId: string, result: unknown): Promise<void> {
    const ttlSec = Math.min(Math.ceil(config.REPLY_TIMEOUT_MS / 1000) + 120, 86400);
    const payload = JSON.stringify({ correlationId, result });
    await this.redis.set(this.key(correlationId), payload, "EX", ttlSec);
  }

  /**
   * Poll Redis until the unified worker stores the result or timeout (same order as long-running ML).
   */
  async waitForReply(correlationId: string, timeoutMs: number): Promise<unknown | undefined> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const raw = await this.redis.get(this.key(correlationId));
      if (raw) {
        await this.redis.del(this.key(correlationId));
        const parsed = JSON.parse(raw) as { correlationId?: string; result?: unknown };
        return parsed.result;
      }
      await sleep(50);
    }
    return undefined;
  }
}

export const axlReplyBroker = new AxlReplyBrokerService();
