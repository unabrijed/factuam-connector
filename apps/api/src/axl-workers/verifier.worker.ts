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
import { VerifierService } from "../services/agents/verifier.service";

type VerifierRequestEnvelope = {
  correlationId?: string;
  agent?: string;
  payload?: unknown;
  sentAt?: string;
};

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

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
    pollIntervalMs: config.GENSYN_AXL_POLL_INTERVAL_MS
  });

  while (true) {
    try {
      await markAxlWorkerIdle("verifier");
      const messages = await client.recv<VerifierRequestEnvelope>();

      for (const message of messages) {
        if (message.topic !== "factum.verifier") continue;
        await markAxlWorkerProcessing("verifier");
        if (!message.from) continue;
        if (!message.data?.correlationId) continue;

        const result = await verifier.run(message.data.payload);

        await client.send({
          to: message.from,
          topic: "factum.verifier.result",
          payload: {
            correlationId: message.data.correlationId,
            result
          }
        });

        await markAxlWorkerProcessed("verifier");

        log("info", "axl_verifier_request_processed", {
          correlationId: message.data.correlationId,
          from: message.from
        });
      }
    } catch (error) {
      await markAxlWorkerError("verifier", error);
      logError("axl_verifier_worker_error", error);
      await sleep(Math.max(config.GENSYN_AXL_POLL_INTERVAL_MS, 500));
    }

    await sleep(config.GENSYN_AXL_POLL_INTERVAL_MS);
  }
}

main().catch((error) => {
  logError("axl_verifier_worker_fatal", error);
  process.exit(1);
});
