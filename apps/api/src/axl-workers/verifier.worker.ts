import { AxlTransportClient } from "@factum/gensyn-axl";
import { config } from "../config";
import { log, logError } from "../lib/logger";
import {
  markAxlWorkerProcessed,
  markAxlWorkerProcessing,
  markAxlWorkerStarted
} from "../services/axl-worker-health.service";
import { VerifierService } from "../services/agents/verifier.service";
import { runAxlRecvLoop } from "./axl-recv-runner";

type VerifierRequestEnvelope = {
  correlationId?: string;
  agent?: string;
  payload?: unknown;
  sentAt?: string;
};

async function main() {
  const client = new AxlTransportClient({
    apiBaseUrl: config.GENSYN_AXL_API_URL
  });
  const verifier = new VerifierService();

  await markAxlWorkerStarted({
    worker: "verifier",
    apiBaseUrl: config.GENSYN_AXL_API_URL,
    pollIntervalMs: config.GENSYN_AXL_POLL_INTERVAL_MS
  });

  log("info", "axl_verifier_worker_started", {
    apiBaseUrl: config.GENSYN_AXL_API_URL,
    pollIntervalMs: config.GENSYN_AXL_POLL_INTERVAL_MS,
    idlePollMaxMs: config.GENSYN_AXL_IDLE_POLL_MAX_MS,
    recvFatalAfter: config.GENSYN_AXL_RECV_FATAL_AFTER
  });

  await runAxlRecvLoop({
    workerKey: "verifier",
    client,
    pollIntervalMs: config.GENSYN_AXL_POLL_INTERVAL_MS,
    idlePollMaxMs: config.GENSYN_AXL_IDLE_POLL_MAX_MS,
    recvFatalAfter: config.GENSYN_AXL_RECV_FATAL_AFTER,
    logTag: "axl_verifier_worker",
    handleMessages: async (messages) => {
      for (const message of messages) {
        if (message.topic !== "factum.verifier") continue;
        const data = message.data as VerifierRequestEnvelope;
        await markAxlWorkerProcessing("verifier");
        if (!message.from) continue;
        if (!data.correlationId) continue;

        const result = await verifier.run(data.payload);

        await client.send({
          to: message.from,
          topic: "factum.verifier.result",
          payload: {
            correlationId: data.correlationId,
            result
          }
        });

        await markAxlWorkerProcessed("verifier");

        log("info", "axl_verifier_request_processed", {
          correlationId: data.correlationId,
          from: message.from
        });
      }
    }
  });
}

main().catch((error) => {
  logError("axl_verifier_worker_fatal", error);
  process.exit(1);
});
