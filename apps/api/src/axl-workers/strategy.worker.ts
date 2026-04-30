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
import { StrategyService } from "../services/strategy.service";

type StrategyRequestEnvelope = {
  correlationId?: string;
  agent?: string;
  payload?: Parameters<StrategyService["decide"]>[0];
  sentAt?: string;
};

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const client = new AxlTransportClient({ apiBaseUrl: config.GENSYN_AXL_API_URL });
  const service = new StrategyService();

  await markAxlWorkerStarted({
    worker: "strategy-agent",
    apiBaseUrl: config.GENSYN_AXL_API_URL,
    pollIntervalMs: config.GENSYN_AXL_POLL_INTERVAL_MS
  });

  log("info", "axl_strategy_worker_started", {
    apiBaseUrl: config.GENSYN_AXL_API_URL,
    pollIntervalMs: config.GENSYN_AXL_POLL_INTERVAL_MS
  });

  while (true) {
    try {
      await markAxlWorkerIdle("strategy-agent");
      const messages = await client.recv<StrategyRequestEnvelope>();

      for (const message of messages) {
        if (message.topic !== "factum.strategy_agent") continue;
        await markAxlWorkerProcessing("strategy-agent");
        if (!message.from || !message.data?.correlationId || !message.data.payload) continue;

        const result = service.decide(message.data.payload);

        await client.send({
          to: message.from,
          topic: "factum.strategy_agent.result",
          payload: {
            correlationId: message.data.correlationId,
            result
          }
        });

        await markAxlWorkerProcessed("strategy-agent");
      }
    } catch (error) {
      await markAxlWorkerError("strategy-agent", error);
      logError("axl_strategy_worker_error", error);
      await sleep(Math.max(config.GENSYN_AXL_POLL_INTERVAL_MS, 500));
    }

    await sleep(config.GENSYN_AXL_POLL_INTERVAL_MS);
  }
}

main().catch((error) => {
  logError("axl_strategy_worker_fatal", error);
  process.exit(1);
});
