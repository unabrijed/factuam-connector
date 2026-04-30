import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import type { ConnectorProvider, ConnectorRunStatus } from "@factum/shared-types";
import { db } from "../db/client";
import { connectorRuns } from "../db/schema";

export class ConnectorRunService {
  async create(input: { provider: ConnectorProvider; connectorId: string; requestJson: Record<string, unknown> }) {
    const id = uuidv4();
    const now = new Date();
    await db.insert(connectorRuns).values({
      id,
      provider: input.provider,
      connectorId: input.connectorId,
      status: "pending",
      requestJson: input.requestJson,
      createdAt: now,
      updatedAt: now
    });
    return id;
  }

  async update(runId: string, input: {
    status: ConnectorRunStatus;
    sourceMeta?: Record<string, unknown> | null;
    rawHash?: string | null;
    normalizedHash?: string | null;
    errorMessage?: string | null;
  }) {
    await db.update(connectorRuns).set({
      status: input.status,
      sourceMeta: input.sourceMeta,
      rawHash: input.rawHash,
      normalizedHash: input.normalizedHash,
      errorMessage: input.errorMessage,
      updatedAt: new Date()
    }).where(eq(connectorRuns.id, runId));
  }

  async getById(runId: string) {
    return db.query.connectorRuns.findFirst({ where: eq(connectorRuns.id, runId) });
  }

  async setStage(
    runId: string,
    input: {
      status: ConnectorRunStatus;
      stage: "pending" | "download" | "normalize" | "upload_0g" | "enqueue" | "run" | "completed" | "failed";
      message: string;
      extra?: Record<string, unknown>;
    }
  ) {
    const current = await this.getById(runId);
    await this.update(runId, {
      status: input.status,
      sourceMeta: {
        ...(current?.sourceMeta ?? {}),
        stage: input.stage,
        stageMessage: input.message,
        ...(input.extra ?? {})
      },
      rawHash: current?.rawHash,
      normalizedHash: current?.normalizedHash,
      errorMessage: current?.errorMessage
    });
  }
}
