import { AxlTransportClient } from "@factuam/gensyn-axl";
import { config } from "../config";
import { log, logError } from "../lib/logger";
import {
  markAxlWorkerProcessed,
  markAxlWorkerProcessing,
  markAxlWorkerStarted
} from "../services/axl-worker-health.service";
import { DiagnosisService } from "../services/diagnosis.service";
import { runAxlRecvLoop } from "./axl-recv-runner";

type DiagnosisRequestEnvelope = {
  correlationId?: string;
  agent?: string;
  payload?: {
    plan: Parameters<DiagnosisService["diagnose"]>[0]["plan"];
    validation: Parameters<DiagnosisService["diagnose"]>[0]["validation"];
  };
  sentAt?: string;
};

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
    pollIntervalMs: config.GENSYN_AXL_POLL_INTERVAL_MS,
    idlePollMaxMs: config.GENSYN_AXL_IDLE_POLL_MAX_MS,
    recvFatalAfter: config.GENSYN_AXL_RECV_FATAL_AFTER
  });

  await runAxlRecvLoop({
    workerKey: "diagnosis-agent",
    client,
    pollIntervalMs: config.GENSYN_AXL_POLL_INTERVAL_MS,
    idlePollMaxMs: config.GENSYN_AXL_IDLE_POLL_MAX_MS,
    recvFatalAfter: config.GENSYN_AXL_RECV_FATAL_AFTER,
    logTag: "axl_diagnosis_worker",
    handleMessages: async (messages) => {
      for (const message of messages) {
        if (message.topic !== "factuam.diagnosis_agent") continue;
        const data = message.data as DiagnosisRequestEnvelope;
        await markAxlWorkerProcessing("diagnosis-agent");
        if (!message.from || !data.correlationId || !data.payload) continue;

        const result = service.diagnose(data.payload);

        await client.send({
          to: message.from,
          topic: "factuam.diagnosis_agent.result",
          payload: {
            correlationId: data.correlationId,
            result
          }
        });

        await markAxlWorkerProcessed("diagnosis-agent");
      }
    }
  });
}

main().catch((error) => {
  logError("axl_diagnosis_worker_fatal", error);
  process.exit(1);
});
