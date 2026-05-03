import { AxlTransportClient } from "@factuam/gensyn-axl";
import { config } from "../config";
import { log, logError } from "../lib/logger";
import {
  markAxlWorkerProcessed,
  markAxlWorkerProcessing,
  markAxlWorkerStarted
} from "../services/axl-worker-health.service";
import { ValidationService } from "../services/validation.service";
import { runAxlRecvLoop } from "./axl-recv-runner";

type ValidationRequestEnvelope = {
  correlationId?: string;
  agent?: string;
  payload?: Parameters<ValidationService["validate"]>[0];
  sentAt?: string;
};

async function main() {
  const client = new AxlTransportClient({ apiBaseUrl: config.GENSYN_AXL_API_URL });
  const service = new ValidationService();

  await markAxlWorkerStarted({
    worker: "validation-agent",
    apiBaseUrl: config.GENSYN_AXL_API_URL,
    pollIntervalMs: config.GENSYN_AXL_POLL_INTERVAL_MS
  });

  log("info", "axl_validation_worker_started", {
    apiBaseUrl: config.GENSYN_AXL_API_URL,
    pollIntervalMs: config.GENSYN_AXL_POLL_INTERVAL_MS,
    idlePollMaxMs: config.GENSYN_AXL_IDLE_POLL_MAX_MS,
    recvFatalAfter: config.GENSYN_AXL_RECV_FATAL_AFTER
  });

  await runAxlRecvLoop({
    workerKey: "validation-agent",
    client,
    pollIntervalMs: config.GENSYN_AXL_POLL_INTERVAL_MS,
    idlePollMaxMs: config.GENSYN_AXL_IDLE_POLL_MAX_MS,
    recvFatalAfter: config.GENSYN_AXL_RECV_FATAL_AFTER,
    logTag: "axl_validation_worker",
    handleMessages: async (messages) => {
      for (const message of messages) {
        if (message.topic !== "factuam.validation_agent") continue;
        const data = message.data as ValidationRequestEnvelope;
        await markAxlWorkerProcessing("validation-agent");
        if (!message.from || !data.correlationId || !data.payload) continue;

        const result = await service.validate(data.payload);

        await client.send({
          to: message.from,
          topic: "factuam.validation_agent.result",
          payload: {
            correlationId: data.correlationId,
            result
          }
        });

        await markAxlWorkerProcessed("validation-agent");
      }
    }
  });
}

main().catch((error) => {
  logError("axl_validation_worker_fatal", error);
  process.exit(1);
});
