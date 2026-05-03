import { AxlTransportClient } from "@factum/gensyn-axl";
import type { AttemptSummary } from "@factum/agent-sdk";
import { config } from "../config";
import { log, logError } from "../lib/logger";
import {
  markAxlWorkerProcessed,
  markAxlWorkerProcessing,
  markAxlWorkerStarted
} from "../services/axl-worker-health.service";
import { ReflectionService } from "../services/reflection.service";
import { runAxlRecvLoop } from "./axl-recv-runner";

type ReflectionRequestEnvelope = {
  correlationId?: string;
  agent?: string;
  payload?: {
    attempt_id: string;
    attempt_summary: AttemptSummary;
    success: boolean;
  };
  sentAt?: string;
};

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
    pollIntervalMs: config.GENSYN_AXL_POLL_INTERVAL_MS,
    idlePollMaxMs: config.GENSYN_AXL_IDLE_POLL_MAX_MS,
    recvFatalAfter: config.GENSYN_AXL_RECV_FATAL_AFTER
  });

  await runAxlRecvLoop({
    workerKey: "reflection-agent",
    client,
    pollIntervalMs: config.GENSYN_AXL_POLL_INTERVAL_MS,
    idlePollMaxMs: config.GENSYN_AXL_IDLE_POLL_MAX_MS,
    recvFatalAfter: config.GENSYN_AXL_RECV_FATAL_AFTER,
    logTag: "axl_reflection_worker",
    handleMessages: async (messages) => {
      for (const message of messages) {
        if (message.topic !== "factum.reflection_agent") continue;
        const envelope = message.data as ReflectionRequestEnvelope;
        await markAxlWorkerProcessing("reflection-agent");
        if (!message.from || !envelope.correlationId || !envelope.payload) continue;

        const payload = envelope.payload;
        const summary = payload.attempt_summary;
        const result = payload.success
          ? service.reflectSuccess({
              attemptId: payload.attempt_id,
              attemptNumber: summary.attempt_number,
              bestModel: summary.model ?? "unknown",
              lift: summary.baseline_metric ?? 0,
              success: summary.significant ?? false
            })
          : service.reflectFailure({
              attemptId: payload.attempt_id,
              attemptNumber: summary.attempt_number,
              error: summary.error ?? "Unknown training error"
            });

        await client.send({
          to: message.from,
          topic: "factum.reflection_agent.result",
          payload: {
            correlationId: envelope.correlationId,
            result
          }
        });

        await markAxlWorkerProcessed("reflection-agent");
      }
    }
  });
}

main().catch((error) => {
  logError("axl_reflection_worker_fatal", error);
  process.exit(1);
});
