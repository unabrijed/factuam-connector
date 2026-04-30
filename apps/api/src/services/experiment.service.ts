import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import type {
  CreateExperimentInput,
  ConnectorRequest,
  DatasetDiagnosis,
  ExperimentPlan,
  ExperimentStatus
} from "@factum/shared-types";
import { db } from "../db/client";
import {
  experimentAttempts,
  experimentDiagnoses,
  experimentMessages,
  experimentReflections,
  experiments,
  strategyDecisions
} from "../db/schema";

type ExperimentUpdateExtra = {
  evidenceRequired?: boolean | null;
  evidenceType?: string | null;
  riskLevel?: string | null;
  resultSummary?: Record<string, unknown> | null;
  finalAnswer?: string | null;
  confidence?: string | null;
  errorMessage?: string | null;
  experimentPlan?: ExperimentPlan | null;
};

export class ExperimentService {
  async createExperiment(input: CreateExperimentInput) {
    const experimentId = uuidv4();
    const now = new Date();
    await db.insert(experiments).values({
      id: experimentId,
      datasetId: input.datasetId,
      query: input.query,
      mode: input.mode,
      status: "CREATED",
      connectorRequest: (input.connectorRequest as ConnectorRequest | undefined) ?? null,
      createdAt: now,
      updatedAt: now
    });

    return { experimentId, status: "CREATED" as const };
  }

  async getById(experimentId: string) {
    return db.query.experiments.findFirst({ where: eq(experiments.id, experimentId) });
  }

  async getDetail(experimentId: string) {
    const experiment = await db.query.experiments.findFirst({
      where: eq(experiments.id, experimentId),
      with: {
        dataset: true,
        attempts: true,
        messages: true,
        diagnoses: true,
        reflections: true,
        decisions: true,
        models: true,
        backtests: true,
        proofs: true,
        artifacts: true
      }
    });

    if (!experiment) return null;
    const latestProof = experiment.proofs.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))[0] ?? null;
    const latestBacktest = experiment.backtests.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))[0] ?? null;

    return {
      ...experiment,
      attempts: experiment.attempts.sort((a, b) => a.attemptNumber - b.attemptNumber),
      messages: experiment.messages.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)),
      diagnoses: experiment.diagnoses.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)),
      reflections: experiment.reflections.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)),
      decisions: experiment.decisions.sort((a, b) => a.attemptNumber - b.attemptNumber),
      latestProof,
      latestBacktest
    };
  }

  async updateStatus(
    experimentId: string,
    status: ExperimentStatus,
    extra: ExperimentUpdateExtra = {}
  ) {
    await db
      .update(experiments)
      .set({ ...extra, status, updatedAt: new Date() })
      .where(eq(experiments.id, experimentId));
  }

  async appendProgress(
    experimentId: string,
    input: {
      stage: string;
      message: string;
      details?: Record<string, unknown>;
    }
  ) {
    const current = await this.getById(experimentId);
    const currentSummary =
      current?.resultSummary && typeof current.resultSummary === "object"
        ? (current.resultSummary as Record<string, unknown>)
        : {};
    const existingProgress = Array.isArray(currentSummary.progress)
      ? (currentSummary.progress as Array<Record<string, unknown>>)
      : [];
    const progressEntry = {
      stage: input.stage,
      message: input.message,
      details: input.details ?? {},
      ts: new Date().toISOString()
    };

    await db
      .update(experiments)
      .set({
        resultSummary: {
          ...currentSummary,
          progress: [...existingProgress, progressEntry].slice(-50),
          currentStage: input.stage,
          currentMessage: input.message,
          progressUpdatedAt: progressEntry.ts
        },
        updatedAt: new Date()
      })
      .where(eq(experiments.id, experimentId));
  }

  async createAttempt(input: {
    experimentId: string;
    attemptNumber: number;
    strategy: string;
    notes?: string | null;
    planJson?: Record<string, unknown> | null;
  }) {
    const id = uuidv4();
    const now = new Date();
    await db.insert(experimentAttempts).values({
      id,
      experimentId: input.experimentId,
      attemptNumber: input.attemptNumber,
      status: "running",
      strategy: input.strategy,
      notes: input.notes ?? null,
      planJson: input.planJson ?? null,
      startedAt: now,
      createdAt: now
    });
    return id;
  }

  async completeAttempt(
    attemptId: string,
    input: {
      status: string;
      summaryJson?: Record<string, unknown> | null;
      notes?: string | null;
    }
  ) {
    await db
      .update(experimentAttempts)
      .set({
        status: input.status,
        summaryJson: input.summaryJson ?? null,
        notes: input.notes ?? null,
        completedAt: new Date()
      })
      .where(eq(experimentAttempts.id, attemptId));
  }

  async addMessage(input: {
    experimentId: string;
    role: "user" | "agent" | "system";
    message: string;
    metadata?: Record<string, unknown> | null;
  }) {
    const id = uuidv4();
    await db.insert(experimentMessages).values({
      id,
      experimentId: input.experimentId,
      role: input.role,
      message: input.message,
      metadata: input.metadata ?? null,
      createdAt: new Date()
    });
    return id;
  }

  async getRecentMessages(experimentId: string, limit = 8) {
    const detail = await this.getDetail(experimentId);
    return (detail?.messages ?? []).slice(-limit);
  }

  async addDiagnosis(experimentId: string, diagnosis: DatasetDiagnosis) {
    const id = uuidv4();
    await db.insert(experimentDiagnoses).values({
      id,
      experimentId,
      diagnosisJson: diagnosis,
      createdAt: new Date()
    });
    return id;
  }

  async addReflection(input: {
    experimentId: string;
    attemptId: string;
    reflection: Record<string, unknown>;
  }) {
    const id = uuidv4();
    await db.insert(experimentReflections).values({
      id,
      experimentId: input.experimentId,
      attemptId: input.attemptId,
      reflectionJson: input.reflection,
      createdAt: new Date()
    });
    return id;
  }

  async addStrategyDecision(input: {
    experimentId: string;
    attemptNumber: number;
    decision: Record<string, unknown>;
  }) {
    const id = uuidv4();
    await db.insert(strategyDecisions).values({
      id,
      experimentId: input.experimentId,
      attemptNumber: input.attemptNumber,
      decisionJson: input.decision,
      createdAt: new Date()
    });
    return id;
  }

  async updateClassification(experimentId: string, input: { evidenceRequired: boolean; evidenceType: string; riskLevel: string }) {
    await db
      .update(experiments)
      .set({
        evidenceRequired: input.evidenceRequired,
        evidenceType: input.evidenceType,
        riskLevel: input.riskLevel,
        updatedAt: new Date()
      })
      .where(eq(experiments.id, experimentId));
  }

  async updatePlan(experimentId: string, plan: ExperimentPlan) {
    await db.update(experiments).set({ experimentPlan: plan, updatedAt: new Date() }).where(eq(experiments.id, experimentId));
  }

  async attachDataset(experimentId: string, datasetId: string) {
    await db.update(experiments).set({ datasetId, updatedAt: new Date() }).where(eq(experiments.id, experimentId));
  }

  async complete(
    experimentId: string,
    input: { finalAnswer: string; confidence: string; resultSummary: Record<string, unknown> }
  ) {
    const current = await this.getById(experimentId);
    const currentSummary =
      current?.resultSummary && typeof current.resultSummary === "object"
        ? (current.resultSummary as Record<string, unknown>)
        : {};
    await db
      .update(experiments)
      .set({
        finalAnswer: input.finalAnswer,
        confidence: input.confidence,
        resultSummary: {
          ...currentSummary,
          ...input.resultSummary
        },
        status: "COMPLETED",
        updatedAt: new Date()
      })
      .where(eq(experiments.id, experimentId));
  }

  async fail(experimentId: string, status: ExperimentStatus, errorMessage: string) {
    await db.update(experiments).set({ status, errorMessage, updatedAt: new Date() }).where(eq(experiments.id, experimentId));
  }
}
