import type { ExperimentPlan } from "@factuam/shared-types";
import type { AttemptSummary } from "@factuam/agent-sdk";
import { AxlTransportClient } from "@factuam/gensyn-axl";
import { config } from "../config";
import { log, logError } from "../lib/logger";
import {
  markAxlWorkerProcessed,
  markAxlWorkerProcessing,
  markAxlWorkerStarted
} from "../services/axl-worker-health.service";
import { MlWorkerService } from "../services/ml-worker.service";
import { runAxlRecvLoop } from "./axl-recv-runner";

type TrainingRequestEnvelope = {
  correlationId?: string;
  agent?: string;
  payload?: {
    experimentId: string;
    datasetId: string;
    datasetPath: string;
    plan: ExperimentPlan;
    attemptNumber: number;
    previousAttempts?: AttemptSummary[];
  };
  sentAt?: string;
};

async function main() {
  const client = new AxlTransportClient({ apiBaseUrl: config.GENSYN_AXL_API_URL });
  const service = new MlWorkerService();

  await markAxlWorkerStarted({
    worker: "training-agent",
    apiBaseUrl: config.GENSYN_AXL_API_URL,
    pollIntervalMs: config.GENSYN_AXL_POLL_INTERVAL_MS
  });

  log("info", "axl_training_worker_started", {
    apiBaseUrl: config.GENSYN_AXL_API_URL,
    pollIntervalMs: config.GENSYN_AXL_POLL_INTERVAL_MS,
    idlePollMaxMs: config.GENSYN_AXL_IDLE_POLL_MAX_MS,
    recvFatalAfter: config.GENSYN_AXL_RECV_FATAL_AFTER
  });

  await runAxlRecvLoop({
    workerKey: "training-agent",
    client,
    pollIntervalMs: config.GENSYN_AXL_POLL_INTERVAL_MS,
    idlePollMaxMs: config.GENSYN_AXL_IDLE_POLL_MAX_MS,
    recvFatalAfter: config.GENSYN_AXL_RECV_FATAL_AFTER,
    logTag: "axl_training_worker",
    handleMessages: async (messages) => {
      for (const message of messages) {
        if (message.topic !== "factuam.training_agent") continue;
        const data = message.data as TrainingRequestEnvelope;
        await markAxlWorkerProcessing("training-agent");
        if (!message.from || !data.correlationId || !data.payload) continue;

        const result = await service.runExperiment(data.payload);

        await client.send({
          to: message.from,
          topic: "factuam.training_agent.result",
          payload: {
            correlationId: data.correlationId,
            result
          }
        });

        await markAxlWorkerProcessed("training-agent");
      }
    }
  });
}

main().catch((error) => {
  logError("axl_training_worker_fatal", error);
  process.exit(1);
});
