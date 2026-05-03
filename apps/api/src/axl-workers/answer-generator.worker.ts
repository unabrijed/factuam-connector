import { AxlTransportClient } from "@factuam/gensyn-axl";
import { config } from "../config";
import { log, logError } from "../lib/logger";
import {
  markAxlWorkerProcessed,
  markAxlWorkerProcessing,
  markAxlWorkerStarted
} from "../services/axl-worker-health.service";
import { AnswerGeneratorService } from "../services/agents/answer-generator.service";
import { runAxlRecvLoop } from "./axl-recv-runner";

type RequestEnvelope = {
  correlationId?: string;
  agent?: string;
  payload?: unknown;
  sentAt?: string;
};

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
    pollIntervalMs: config.GENSYN_AXL_POLL_INTERVAL_MS,
    idlePollMaxMs: config.GENSYN_AXL_IDLE_POLL_MAX_MS,
    recvFatalAfter: config.GENSYN_AXL_RECV_FATAL_AFTER
  });

  await runAxlRecvLoop({
    workerKey: "answer-generator",
    client,
    pollIntervalMs: config.GENSYN_AXL_POLL_INTERVAL_MS,
    idlePollMaxMs: config.GENSYN_AXL_IDLE_POLL_MAX_MS,
    recvFatalAfter: config.GENSYN_AXL_RECV_FATAL_AFTER,
    logTag: "axl_answer_generator_worker",
    handleMessages: async (messages) => {
      for (const message of messages) {
        if (message.topic !== "factuam.answer_generator") continue;
        const data = message.data as RequestEnvelope;
        await markAxlWorkerProcessing("answer-generator");
        if (!message.from || !data.correlationId) continue;

        const result = await service.run(data.payload);

        await client.send({
          to: message.from,
          topic: "factuam.answer_generator.result",
          payload: {
            correlationId: data.correlationId,
            result
          }
        });

        await markAxlWorkerProcessed("answer-generator");
      }
    }
  });
}

main().catch((error) => {
  logError("axl_answer_generator_worker_fatal", error);
  process.exit(1);
});
