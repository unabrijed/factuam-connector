import { AxlTransportClient } from "@factuam/gensyn-axl";
import { config } from "../config";
import { log, logError } from "../lib/logger";
import {
  markAxlWorkerProcessed,
  markAxlWorkerProcessing,
  markAxlWorkerStarted
} from "../services/axl-worker-health.service";
import { ReflectionAgentService } from "../services/agents/reflection-agent.service";
import { runAxlRecvLoop } from "./axl-recv-runner";

type ReflectionRequestEnvelope = {
  correlationId?: string;
  agent?: string;
  payload?: Parameters<ReflectionAgentService["run"]>[0];
  sentAt?: string;
};

async function main() {
  const client = new AxlTransportClient({ apiBaseUrl: config.GENSYN_AXL_API_URL });
  const service = new ReflectionAgentService();

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
        if (message.topic !== "factuam.reflection_agent") continue;
        const envelope = message.data as ReflectionRequestEnvelope;
        await markAxlWorkerProcessing("reflection-agent");
        if (!message.from || !envelope.correlationId || !envelope.payload) continue;

        const result = await service.run(envelope.payload);

        await client.send({
          to: message.from,
          topic: "factuam.reflection_agent.result",
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
