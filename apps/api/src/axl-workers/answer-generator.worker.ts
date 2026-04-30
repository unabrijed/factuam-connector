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
import { AnswerGeneratorService } from "../services/agents/answer-generator.service";

type RequestEnvelope = {
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
  const service = new AnswerGeneratorService();

  await markAxlWorkerStarted({
    worker: "answer-generator",
    apiBaseUrl: config.GENSYN_AXL_API_URL,
    pollIntervalMs: config.GENSYN_AXL_POLL_INTERVAL_MS
  });

  log("info", "axl_answer_generator_worker_started", {
    apiBaseUrl: config.GENSYN_AXL_API_URL,
    pollIntervalMs: config.GENSYN_AXL_POLL_INTERVAL_MS
  });

  while (true) {
    try {
      await markAxlWorkerIdle("answer-generator");
      const messages = await client.recv<RequestEnvelope>();

      for (const message of messages) {
        if (message.topic !== "factum.answer_generator") continue;
        await markAxlWorkerProcessing("answer-generator");
        if (!message.from || !message.data?.correlationId) continue;

        const result = await service.run(message.data.payload);

        await client.send({
          to: message.from,
          topic: "factum.answer_generator.result",
          payload: {
            correlationId: message.data.correlationId,
            result
          }
        });

        await markAxlWorkerProcessed("answer-generator");
      }
    } catch (error) {
      await markAxlWorkerError("answer-generator", error);
      logError("axl_answer_generator_worker_error", error);
      await sleep(Math.max(config.GENSYN_AXL_POLL_INTERVAL_MS, 500));
    }

    await sleep(config.GENSYN_AXL_POLL_INTERVAL_MS);
  }
}

main().catch((error) => {
  logError("axl_answer_generator_worker_fatal", error);
  process.exit(1);
});
