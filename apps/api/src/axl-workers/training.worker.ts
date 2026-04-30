import type { ExperimentPlan } from "@factum/shared-types";
import type { AttemptSummary } from "@factum/agent-sdk";
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
import { MlWorkerService } from "../services/ml-worker.service";

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

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

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
    pollIntervalMs: config.GENSYN_AXL_POLL_INTERVAL_MS
  });

  while (true) {
    try {
      await markAxlWorkerIdle("training-agent");
      const messages = await client.recv<TrainingRequestEnvelope>();

      for (const message of messages) {
        if (message.topic !== "factum.training_agent") continue;
        await markAxlWorkerProcessing("training-agent");
        if (!message.from || !message.data?.correlationId || !message.data.payload) continue;

        const result = await service.runExperiment(message.data.payload);

        await client.send({
          to: message.from,
          topic: "factum.training_agent.result",
          payload: {
            correlationId: message.data.correlationId,
            result
          }
        });

        await markAxlWorkerProcessed("training-agent");
      }
    } catch (error) {
      await markAxlWorkerError("training-agent", error);
      logError("axl_training_worker_error", error);
      await sleep(Math.max(config.GENSYN_AXL_POLL_INTERVAL_MS, 500));
    }

    await sleep(config.GENSYN_AXL_POLL_INTERVAL_MS);
  }
}

main().catch((error) => {
  logError("axl_training_worker_fatal", error);
  process.exit(1);
});
