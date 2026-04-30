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
import { ValidationService } from "../services/validation.service";

type ValidationRequestEnvelope = {
  correlationId?: string;
  agent?: string;
  payload?: Parameters<ValidationService["validate"]>[0];
  sentAt?: string;
};

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

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
    pollIntervalMs: config.GENSYN_AXL_POLL_INTERVAL_MS
  });

  while (true) {
    try {
      await markAxlWorkerIdle("validation-agent");
      const messages = await client.recv<ValidationRequestEnvelope>();

      for (const message of messages) {
        if (message.topic !== "factum.validation_agent") continue;
        await markAxlWorkerProcessing("validation-agent");
        if (!message.from || !message.data?.correlationId || !message.data.payload) continue;

        const result = await service.validate(message.data.payload);

        await client.send({
          to: message.from,
          topic: "factum.validation_agent.result",
          payload: {
            correlationId: message.data.correlationId,
            result
          }
        });

        await markAxlWorkerProcessed("validation-agent");
      }
    } catch (error) {
      await markAxlWorkerError("validation-agent", error);
      logError("axl_validation_worker_error", error);
      await sleep(Math.max(config.GENSYN_AXL_POLL_INTERVAL_MS, 500));
    }

    await sleep(config.GENSYN_AXL_POLL_INTERVAL_MS);
  }
}

main().catch((error) => {
  logError("axl_validation_worker_fatal", error);
  process.exit(1);
});
