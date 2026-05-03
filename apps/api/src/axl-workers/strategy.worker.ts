import { AxlTransportClient } from "@factuam/gensyn-axl";
import { config } from "../config";
import { log, logError } from "../lib/logger";
import {
  markAxlWorkerProcessed,
  markAxlWorkerProcessing,
  markAxlWorkerStarted
} from "../services/axl-worker-health.service";
import { StrategyAgentService } from "../services/agents/strategy-agent.service";
import { runAxlRecvLoop } from "./axl-recv-runner";

type StrategyRequestEnvelope = {
  correlationId?: string;
  agent?: string;
  payload?: Parameters<StrategyAgentService["run"]>[0];
  sentAt?: string;
};

async function main() {
  const client = new AxlTransportClient({ apiBaseUrl: config.GENSYN_AXL_API_URL });
  const service = new StrategyAgentService();

  await markAxlWorkerStarted({
    worker: "strategy-agent",
    apiBaseUrl: config.GENSYN_AXL_API_URL,
    pollIntervalMs: config.GENSYN_AXL_POLL_INTERVAL_MS
  });

  log("info", "axl_strategy_worker_started", {
    apiBaseUrl: config.GENSYN_AXL_API_URL,
    pollIntervalMs: config.GENSYN_AXL_POLL_INTERVAL_MS,
    idlePollMaxMs: config.GENSYN_AXL_IDLE_POLL_MAX_MS,
    recvFatalAfter: config.GENSYN_AXL_RECV_FATAL_AFTER
  });

  await runAxlRecvLoop({
    workerKey: "strategy-agent",
    client,
    pollIntervalMs: config.GENSYN_AXL_POLL_INTERVAL_MS,
    idlePollMaxMs: config.GENSYN_AXL_IDLE_POLL_MAX_MS,
    recvFatalAfter: config.GENSYN_AXL_RECV_FATAL_AFTER,
    logTag: "axl_strategy_worker",
    handleMessages: async (messages) => {
      for (const message of messages) {
        if (message.topic !== "factuam.strategy_agent") continue;
        const data = message.data as StrategyRequestEnvelope;
        await markAxlWorkerProcessing("strategy-agent");
        if (!message.from || !data.correlationId || !data.payload) continue;

        const result = await service.run(data.payload);

        await client.send({
          to: message.from,
          topic: "factuam.strategy_agent.result",
          payload: {
            correlationId: data.correlationId,
            result
          }
        });

        await markAxlWorkerProcessed("strategy-agent");
      }
    }
  });
}

main().catch((error) => {
  logError("axl_strategy_worker_fatal", error);
  process.exit(1);
});
