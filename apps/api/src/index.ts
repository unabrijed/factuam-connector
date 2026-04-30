import { serve } from "@hono/node-server";
import { config } from "./config";
import { createApp } from "./app";
import { startExperimentWorker } from "./jobs/queue";
import { ensureDir } from "./lib/fs";
import { paths } from "./config";
import { runMigrations } from "./db/migrate";
import { log, logError } from "./lib/logger";

process.on("unhandledRejection", (reason) => {
  logError("process_unhandled_rejection", reason);
});

process.on("uncaughtException", (error) => {
  logError("process_uncaught_exception", error);
});

async function bootstrap() {
  await runMigrations();
  await ensureDir(paths.uploads);
  await ensureDir(paths.artifacts);

  const app = createApp();
  serve({ fetch: app.fetch, port: config.PORT });
  log("info", "api_started", { port: config.PORT });

  if (config.RUN_QUEUE_WORKER) {
    try {
      startExperimentWorker();
      log("info", "experiment_worker_started");
    } catch (error) {
      logError("experiment_worker_start_failed", error);
    }
  }
}

bootstrap().catch((error) => {
  logError("api_bootstrap_failed", error);
  process.exit(1);
});
