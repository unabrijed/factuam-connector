import { AxlTransportClient } from "@factum/gensyn-axl";
import { config } from "../config";
import { log, logError } from "../lib/logger";
import {
  markAxlWorkerError,
  markAxlWorkerIdle,
  markAxlWorkerProcessed,
  markAxlWorkerProcessing,
  markAxlWorkerStarted
} from "../services/axl-worker-health.service";
import { ReflectionService } from "../services/reflection.service";

type ReflectionRequestEnvelope = {
  correlationId?: string;
  agent?: string;
  payload?: {
    attempt_id: string;
    attempt_summary: Parameters<ReflectionService["summarizeAttempt"]>[0] extends never ? never : import("@factum/agent-sdk").AttemptSummary;
    success: boolean;
  };
  sentAt?: string;
};

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const client = new AxlTransportClient({ apiBaseUrl: config.GENSYN_AXL_API_URL });
  const service = new ReflectionService();

  await markAxlWorkerStarted({
    worker: "reflection-agent",
    apiBaseUrl: config.GENSYN_AXL_API_URL,
    pollIntervalMs: config.GENSYN_AXL_POLL_INTERVAL_MS
  });

  log("info", "axl_reflection_worker_started", {
    apiBaseUrl: config.GENSYN_AXL_API_URL,
    pollIntervalMs: config.GENSYN_AXL_POLL_INTERVAL_MS
  });

  while (true) {
    try {
      await markAxlWorkerIdle("reflection-agent");
      const messages = await client.recv<ReflectionRequestEnvelope>();

      for (const message of messages) {
        if (message.topic !== "factum.reflection_agent") continue;
        await markAxlWorkerProcessing("reflection-agent");
        if (!message.from || !message.data?.correlationId || !message.data.payload) continue;

        const summary = message.data.payload.attempt_summary;
        const result = message.data.payload.success
          ? service.reflectSuccess({
              attemptId: message.data.payload.attempt_id,
              attemptNumber: summary.attempt_number,
              bestModel: summary.model ?? "unknown",
              lift: summary.baseline_metric ?? 0,
              success: summary.significant ?? false
            })
          : service.reflectFailure({
              attemptId: message.data.payload.attempt_id,
              attemptNumber: summary.attempt_number,
              error: summary.error ?? "Unknown training error"
            });

        await client.send({
          to: message.from,
          topic: "factum.reflection_agent.result",
          payload: {
            correlationId: message.data.correlationId,
            result
          }
        });

        await markAxlWorkerProcessed("reflection-agent");
      }
    } catch (error) {
      await markAxlWorkerError("reflection-agent", error);
      logError("axl_reflection_worker_error", error);
      await sleep(Math.max(config.GENSYN_AXL_POLL_INTERVAL_MS, 500));
    }

    await sleep(config.GENSYN_AXL_POLL_INTERVAL_MS);
  }
}

main().catch((error) => {
  logError("axl_reflection_worker_fatal", error);
  process.exit(1);
});
