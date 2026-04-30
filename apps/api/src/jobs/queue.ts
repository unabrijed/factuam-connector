import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { config } from "../config";
import { AgentOrchestratorService } from "../services/agent-orchestrator.service";
import { log, logError } from "../lib/logger";

const connection = new IORedis(config.REDIS_URL, { maxRetriesPerRequest: null });
const queueName = "experiment.run";

connection.on("error", (error) => {
  logError("redis_connection_error", error, { component: "bullmq" });
});

connection.on("ready", () => {
  log("info", "redis_connection_ready", { component: "bullmq" });
});

export const experimentQueue = new Queue(queueName, { connection });

export async function enqueueExperiment(payload: { experimentId: string; datasetId?: string }) {
  await experimentQueue.add(queueName, payload, {
    attempts: 1,
    removeOnComplete: 100,
    removeOnFail: 100
  });
}

export function startExperimentWorker() {
  const orchestrator = new AgentOrchestratorService();
  const worker = new Worker(
    queueName,
    async (job) => {
      await orchestrator.runExperiment(job.data.experimentId);
    },
    { connection }
  );

  worker.on("failed", (job, error) => {
    logError("experiment_job_failed", error, {
      jobId: job?.id,
      experimentId: job?.data?.experimentId
    });
  });

  worker.on("error", (error) => {
    logError("experiment_worker_error", error);
  });

  worker.on("ready", () => {
    log("info", "experiment_worker_ready");
  });

  return worker;
}
