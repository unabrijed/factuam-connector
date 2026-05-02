import fs from "node:fs/promises";
import path from "node:path";
import { ensureDir } from "../lib/fs";

export type AxlWorkerName =
  | "evidence-classifier"
  | "experiment-planner"
  | "validation-agent"
  | "diagnosis-agent"
  | "strategy-agent"
  | "training-agent"
  | "reflection-agent"
  | "answer-generator"
  | "verifier"
  | "unified-axl";

export type AxlWorkerHealthRecord = {
  worker: AxlWorkerName;
  status: "starting" | "idle" | "processing" | "error";
  pid: number;
  apiBaseUrl: string;
  pollIntervalMs: number;
  startedAt: string;
  updatedAt: string;
  lastProcessedAt?: string;
  processedCount: number;
  lastErrorAt?: string;
  lastErrorMessage?: string;
};

const HEARTBEAT_TTL_MS = 10_000;
const HEARTBEAT_DIR = path.resolve(process.cwd(), ".runtime", "axl-workers");

function heartbeatPath(worker: AxlWorkerName) {
  return path.join(HEARTBEAT_DIR, `${worker}.json`);
}

async function writeRecord(worker: AxlWorkerName, updater: (current: AxlWorkerHealthRecord | null) => AxlWorkerHealthRecord) {
  await ensureDir(HEARTBEAT_DIR);

  let current: AxlWorkerHealthRecord | null = null;
  try {
    current = JSON.parse(await fs.readFile(heartbeatPath(worker), "utf8")) as AxlWorkerHealthRecord;
  } catch {
    current = null;
  }

  const next = updater(current);
  await fs.writeFile(heartbeatPath(worker), JSON.stringify(next, null, 2));
  return next;
}

export async function markAxlWorkerStarted(input: {
  worker: AxlWorkerName;
  apiBaseUrl: string;
  pollIntervalMs: number;
}) {
  const now = new Date().toISOString();
  return writeRecord(input.worker, (current) => ({
    worker: input.worker,
    status: current?.status ?? "starting",
    pid: process.pid,
    apiBaseUrl: input.apiBaseUrl,
    pollIntervalMs: input.pollIntervalMs,
    startedAt: current?.startedAt ?? now,
    updatedAt: now,
    lastProcessedAt: current?.lastProcessedAt,
    processedCount: current?.processedCount ?? 0,
    lastErrorAt: current?.lastErrorAt,
    lastErrorMessage: current?.lastErrorMessage
  }));
}

export async function markAxlWorkerIdle(worker: AxlWorkerName) {
  const now = new Date().toISOString();
  return writeRecord(worker, (current) => ({
    worker,
    status: "idle",
    pid: process.pid,
    apiBaseUrl: current?.apiBaseUrl ?? "",
    pollIntervalMs: current?.pollIntervalMs ?? 0,
    startedAt: current?.startedAt ?? now,
    updatedAt: now,
    lastProcessedAt: current?.lastProcessedAt,
    processedCount: current?.processedCount ?? 0,
    lastErrorAt: current?.lastErrorAt,
    lastErrorMessage: current?.lastErrorMessage
  }));
}

export async function markAxlWorkerProcessing(worker: AxlWorkerName) {
  const now = new Date().toISOString();
  return writeRecord(worker, (current) => ({
    worker,
    status: "processing",
    pid: process.pid,
    apiBaseUrl: current?.apiBaseUrl ?? "",
    pollIntervalMs: current?.pollIntervalMs ?? 0,
    startedAt: current?.startedAt ?? now,
    updatedAt: now,
    lastProcessedAt: current?.lastProcessedAt,
    processedCount: current?.processedCount ?? 0,
    lastErrorAt: current?.lastErrorAt,
    lastErrorMessage: current?.lastErrorMessage
  }));
}

export async function markAxlWorkerProcessed(worker: AxlWorkerName) {
  const now = new Date().toISOString();
  return writeRecord(worker, (current) => ({
    worker,
    status: "idle",
    pid: process.pid,
    apiBaseUrl: current?.apiBaseUrl ?? "",
    pollIntervalMs: current?.pollIntervalMs ?? 0,
    startedAt: current?.startedAt ?? now,
    updatedAt: now,
    lastProcessedAt: now,
    processedCount: (current?.processedCount ?? 0) + 1,
    lastErrorAt: current?.lastErrorAt,
    lastErrorMessage: current?.lastErrorMessage
  }));
}

export async function markAxlWorkerError(worker: AxlWorkerName, error: unknown) {
  const now = new Date().toISOString();
  const message = error instanceof Error ? error.message : String(error);
  return writeRecord(worker, (current) => ({
    worker,
    status: "error",
    pid: process.pid,
    apiBaseUrl: current?.apiBaseUrl ?? "",
    pollIntervalMs: current?.pollIntervalMs ?? 0,
    startedAt: current?.startedAt ?? now,
    updatedAt: now,
    lastProcessedAt: current?.lastProcessedAt,
    processedCount: current?.processedCount ?? 0,
    lastErrorAt: now,
    lastErrorMessage: message
  }));
}

export async function listAxlWorkerHealth() {
  await ensureDir(HEARTBEAT_DIR);
  const files = await fs.readdir(HEARTBEAT_DIR).catch(() => [] as string[]);
  const now = Date.now();

  const workers = await Promise.all(
    files
      .filter((file) => file.endsWith(".json"))
      .map(async (file) => {
        const raw = await fs.readFile(path.join(HEARTBEAT_DIR, file), "utf8");
        const record = JSON.parse(raw) as AxlWorkerHealthRecord;
        const stale = now - new Date(record.updatedAt).getTime() > HEARTBEAT_TTL_MS;
        return {
          ...record,
          healthy: !stale && record.status !== "error",
          stale,
          heartbeatAgeMs: Math.max(0, now - new Date(record.updatedAt).getTime())
        };
      })
  );

  return workers.sort((a, b) => a.worker.localeCompare(b.worker));
}
