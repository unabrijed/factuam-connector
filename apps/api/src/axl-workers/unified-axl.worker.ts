/**
 * Single-process AXL consumer for hackathon single-node mode: sole owner of /recv on GENSYN_AXL_API_URL.
 * Replies are published via Redis so the API does not poll the same FIFO.
 */
import { AxlTransportClient } from "@factum/gensyn-axl";
import { config } from "../config";
import { log, logError } from "../lib/logger";
import { axlReplyBroker } from "../services/axl-reply-broker.service";
import {
  markAxlWorkerError,
  markAxlWorkerIdle,
  markAxlWorkerProcessed,
  markAxlWorkerProcessing,
  markAxlWorkerStarted
} from "../services/axl-worker-health.service";
import { runAgentByTopic } from "./axl-agent-handlers";

const HANDLED_TOPICS = new Set([
  "factum.evidence_classifier",
  "factum.experiment_planner",
  "factum.validation_agent",
  "factum.diagnosis_agent",
  "factum.strategy_agent",
  "factum.training_agent",
  "factum.reflection_agent",
  "factum.verifier",
  "factum.answer_generator"
]);

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  if (!config.GENSYN_AXL_SINGLE_NODE) {
    log("warn", "axl_unified_worker_requires_single_node", {});
    console.warn("[unified-axl] Set GENSYN_AXL_SINGLE_NODE=true for this worker.");
  }

  const client = new AxlTransportClient({ apiBaseUrl: config.GENSYN_AXL_API_URL });

  await markAxlWorkerStarted({
    worker: "unified-axl",
    apiBaseUrl: config.GENSYN_AXL_API_URL,
    pollIntervalMs: config.GENSYN_AXL_POLL_INTERVAL_MS
  });

  log("info", "axl_unified_worker_started", {
    apiBaseUrl: config.GENSYN_AXL_API_URL,
    pollIntervalMs: config.GENSYN_AXL_POLL_INTERVAL_MS
  });

  while (true) {
    try {
      await markAxlWorkerIdle("unified-axl");
      const messages = await client.recv<{ correlationId?: string; payload?: unknown }>();

      for (const message of messages) {
        const topic = message.topic ?? "";
        if (!HANDLED_TOPICS.has(topic)) continue;
        await markAxlWorkerProcessing("unified-axl");
        if (!message.data?.correlationId) continue;
        if (topic !== "factum.verifier" && message.data.payload === undefined) continue;

        const correlationId = message.data.correlationId;
        const result = await runAgentByTopic(topic, message.data);
        await axlReplyBroker.publishReply(correlationId, result);
        await markAxlWorkerProcessed("unified-axl");
      }
    } catch (error) {
      await markAxlWorkerError("unified-axl", error);
      logError("axl_unified_worker_error", error);
      await sleep(Math.max(config.GENSYN_AXL_POLL_INTERVAL_MS, 500));
    }

    await sleep(config.GENSYN_AXL_POLL_INTERVAL_MS);
  }
}

main().catch((error) => {
  logError("axl_unified_worker_fatal", error);
  process.exit(1);
});
