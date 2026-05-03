import { AxlTransportClient } from "@factum/gensyn-axl";
import { config } from "../config";
import { log, logError } from "../lib/logger";
import {
  markAxlWorkerProcessed,
  markAxlWorkerProcessing,
  markAxlWorkerStarted
} from "../services/axl-worker-health.service";
import { EvidenceClassifierService } from "../services/agents/evidence-classifier.service";
import { runAxlRecvLoop } from "./axl-recv-runner";

type RequestEnvelope = {
  correlationId?: string;
  agent?: string;
  payload?: {
    query: string;
    availableDataset?: unknown;
  };
  sentAt?: string;
};

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
    pollIntervalMs: config.GENSYN_AXL_POLL_INTERVAL_MS,
    idlePollMaxMs: config.GENSYN_AXL_IDLE_POLL_MAX_MS,
    recvFatalAfter: config.GENSYN_AXL_RECV_FATAL_AFTER
  });

  await runAxlRecvLoop({
    workerKey: "evidence-classifier",
    client,
    pollIntervalMs: config.GENSYN_AXL_POLL_INTERVAL_MS,
    idlePollMaxMs: config.GENSYN_AXL_IDLE_POLL_MAX_MS,
    recvFatalAfter: config.GENSYN_AXL_RECV_FATAL_AFTER,
    logTag: "axl_evidence_classifier_worker",
    handleMessages: async (messages) => {
      for (const message of messages) {
        if (message.topic !== "factum.evidence_classifier") continue;
        const data = message.data as RequestEnvelope;
        await markAxlWorkerProcessing("evidence-classifier");
        if (!message.from || !data.correlationId || !data.payload) continue;

        const result = await service.run(data.payload);

        await client.send({
          to: message.from,
          topic: "factum.evidence_classifier.result",
          payload: {
            correlationId: data.correlationId,
            result
          }
        });

        await markAxlWorkerProcessed("evidence-classifier");
      }
    }
  });
}

main().catch((error) => {
  logError("axl_evidence_classifier_worker_fatal", error);
  process.exit(1);
});
