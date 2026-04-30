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
import { DiagnosisService } from "../services/diagnosis.service";

type DiagnosisRequestEnvelope = {
  correlationId?: string;
  agent?: string;
  payload?: {
    plan: Parameters<DiagnosisService["diagnose"]>[0]["plan"];
    validation: Parameters<DiagnosisService["diagnose"]>[0]["validation"];
  };
  sentAt?: string;
};

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const client = new AxlTransportClient({ apiBaseUrl: config.GENSYN_AXL_API_URL });
  const service = new DiagnosisService();

  await markAxlWorkerStarted({
    worker: "diagnosis-agent",
    apiBaseUrl: config.GENSYN_AXL_API_URL,
    pollIntervalMs: config.GENSYN_AXL_POLL_INTERVAL_MS
  });

  log("info", "axl_diagnosis_worker_started", {
    apiBaseUrl: config.GENSYN_AXL_API_URL,
    pollIntervalMs: config.GENSYN_AXL_POLL_INTERVAL_MS
  });

  while (true) {
    try {
      await markAxlWorkerIdle("diagnosis-agent");
      const messages = await client.recv<DiagnosisRequestEnvelope>();

      for (const message of messages) {
        if (message.topic !== "factum.diagnosis_agent") continue;
        await markAxlWorkerProcessing("diagnosis-agent");
        if (!message.from || !message.data?.correlationId || !message.data.payload) continue;

        const result = service.diagnose(message.data.payload);

        await client.send({
          to: message.from,
          topic: "factum.diagnosis_agent.result",
          payload: {
            correlationId: message.data.correlationId,
            result
          }
        });

        await markAxlWorkerProcessed("diagnosis-agent");
      }
    } catch (error) {
      await markAxlWorkerError("diagnosis-agent", error);
      logError("axl_diagnosis_worker_error", error);
      await sleep(Math.max(config.GENSYN_AXL_POLL_INTERVAL_MS, 500));
    }

    await sleep(config.GENSYN_AXL_POLL_INTERVAL_MS);
  }
}

main().catch((error) => {
  logError("axl_diagnosis_worker_fatal", error);
  process.exit(1);
});
