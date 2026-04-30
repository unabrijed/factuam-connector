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
import { EvidenceClassifierService } from "../services/agents/evidence-classifier.service";

type RequestEnvelope = {
  correlationId?: string;
  agent?: string;
  payload?: {
    query: string;
    availableDataset?: unknown;
  };
  sentAt?: string;
};

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const client = new AxlTransportClient({
    apiBaseUrl: config.GENSYN_AXL_API_URL
  });
  const service = new EvidenceClassifierService();

  await markAxlWorkerStarted({
    worker: "evidence-classifier",
    apiBaseUrl: config.GENSYN_AXL_API_URL,
    pollIntervalMs: config.GENSYN_AXL_POLL_INTERVAL_MS
  });

  log("info", "axl_evidence_classifier_worker_started", {
    apiBaseUrl: config.GENSYN_AXL_API_URL,
    pollIntervalMs: config.GENSYN_AXL_POLL_INTERVAL_MS
  });

  while (true) {
    try {
      await markAxlWorkerIdle("evidence-classifier");
      const messages = await client.recv<RequestEnvelope>();

      for (const message of messages) {
        if (message.topic !== "factum.evidence_classifier") continue;
        await markAxlWorkerProcessing("evidence-classifier");
        if (!message.from || !message.data?.correlationId || !message.data.payload) continue;

        const result = await service.run(message.data.payload);

        await client.send({
          to: message.from,
          topic: "factum.evidence_classifier.result",
          payload: {
            correlationId: message.data.correlationId,
            result
          }
        });

        await markAxlWorkerProcessed("evidence-classifier");
      }
    } catch (error) {
      await markAxlWorkerError("evidence-classifier", error);
      logError("axl_evidence_classifier_worker_error", error);
      await sleep(Math.max(config.GENSYN_AXL_POLL_INTERVAL_MS, 500));
    }

    await sleep(config.GENSYN_AXL_POLL_INTERVAL_MS);
  }
}

main().catch((error) => {
  logError("axl_evidence_classifier_worker_fatal", error);
  process.exit(1);
});
