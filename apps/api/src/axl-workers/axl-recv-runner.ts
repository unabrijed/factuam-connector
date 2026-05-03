import type { AxlMessageEnvelope } from "@factum/gensyn-axl";
import type { AxlTransportClient } from "@factum/gensyn-axl";
import { log, logError } from "../lib/logger";
import { markAxlWorkerError, markAxlWorkerIdle } from "../services/axl-worker-health.service";
import type { AxlWorkerName } from "../services/axl-worker-health.service";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Next sleep after a recv iteration: short when work arrived, exponential when queue empty. */
export function computeAxlIdleSleepMs(input: {
  emptyStreak: number;
  hadMessages: boolean;
  pollIntervalMs: number;
  idlePollMaxMs: number;
}): number {
  if (input.hadMessages) {
    return input.pollIntervalMs;
  }
  const streak = Math.max(0, input.emptyStreak);
  const mult = 2 ** Math.min(streak, 12);
  return Math.min(input.idlePollMaxMs, input.pollIntervalMs * mult);
}

export type RunAxlRecvLoopParams = {
  workerKey: AxlWorkerName;
  client: AxlTransportClient;
  pollIntervalMs: number;
  idlePollMaxMs: number;
  recvFatalAfter: number;
  /** Log tag without `_error` suffix, e.g. `axl_validation_worker` → events `…_recv_error` / `…_error`. */
  logTag: string;
  handleMessages: (messages: Array<AxlMessageEnvelope<unknown>>) => Promise<void>;
};

/**
 * Owns GET /recv pacing: adaptive idle backoff and optional fatal exit on repeated recv failures.
 */
export async function runAxlRecvLoop(params: RunAxlRecvLoopParams): Promise<never> {
  let emptyStreak = 0;
  let consecutiveRecvFailures = 0;

  while (true) {
    let messages: Array<AxlMessageEnvelope<unknown>> = [];

    await markAxlWorkerIdle(params.workerKey);

    try {
      messages = await params.client.recv<unknown>();
      consecutiveRecvFailures = 0;
    } catch (error) {
      consecutiveRecvFailures += 1;
      await markAxlWorkerError(params.workerKey, error);
      logError(`${params.logTag}_recv_error`, error, {
        worker: params.workerKey,
        consecutiveRecvFailures
      });

      if (params.recvFatalAfter > 0 && consecutiveRecvFailures >= params.recvFatalAfter) {
        log("error", "axl_recv_fatal_exit", {
          worker: params.workerKey,
          consecutiveRecvFailures,
          threshold: params.recvFatalAfter
        });
        process.exit(1);
      }

      await sleep(Math.max(params.pollIntervalMs, 500));
      continue;
    }

    const hadMessages = messages.length > 0;
    if (hadMessages) {
      emptyStreak = 0;
    } else {
      emptyStreak += 1;
    }

    try {
      await params.handleMessages(messages);
    } catch (error) {
      await markAxlWorkerError(params.workerKey, error);
      logError(`${params.logTag}_error`, error, { worker: params.workerKey });
      await sleep(Math.max(params.pollIntervalMs, 500));
    }

    const sleepMs = computeAxlIdleSleepMs({
      emptyStreak,
      hadMessages,
      pollIntervalMs: params.pollIntervalMs,
      idlePollMaxMs: params.idlePollMaxMs
    });
    await sleep(sleepMs);
  }
}
