import { relations } from "drizzle-orm";
import { boolean, integer, jsonb, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { ExperimentPlan, ProofReceipt } from "@factum/shared-types";

export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  walletAddress: text("wallet_address").unique(),
  email: text("email"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const datasets = pgTable("datasets", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  name: text("name").notNull(),
  sourceType: text("source_type").notNull(),
  localPath: text("local_path"),
  originalFilename: text("original_filename"),
  rowCount: integer("row_count"),
  columnCount: integer("column_count"),
  schemaJson: jsonb("schema_json").$type<Record<string, unknown> | null>(),
  dataQualityReport: jsonb("data_quality_report").$type<Record<string, unknown> | null>(),
  datasetHash: text("dataset_hash"),
  ogStorageUri: text("og_storage_uri"),
  sourceMeta: jsonb("source_meta").$type<Record<string, unknown> | null>(),
  connectorId: text("connector_id"),
  connectorRunId: uuid("connector_run_id"),
  rawPayloadPath: text("raw_payload_path"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const experiments = pgTable("experiments", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  datasetId: uuid("dataset_id").references(() => datasets.id),
  query: text("query").notNull(),
  mode: text("mode"),
  status: text("status").notNull(),
  connectorRequest: jsonb("connector_request").$type<Record<string, unknown> | null>(),
  evidenceRequired: boolean("evidence_required"),
  evidenceType: text("evidence_type"),
  riskLevel: text("risk_level"),
  experimentPlan: jsonb("experiment_plan").$type<ExperimentPlan | null>(),
  resultSummary: jsonb("result_summary").$type<Record<string, unknown> | null>(),
  finalAnswer: text("final_answer"),
  confidence: text("confidence"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const experimentAttempts = pgTable("experiment_attempts", {
  id: uuid("id").primaryKey(),
  experimentId: uuid("experiment_id").references(() => experiments.id).notNull(),
  attemptNumber: integer("attempt_number").notNull(),
  status: text("status").notNull(),
  strategy: text("strategy"),
  notes: text("notes"),
  planJson: jsonb("plan_json").$type<Record<string, unknown> | null>(),
  summaryJson: jsonb("summary_json").$type<Record<string, unknown> | null>(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const experimentMessages = pgTable("experiment_messages", {
  id: uuid("id").primaryKey(),
  experimentId: uuid("experiment_id").references(() => experiments.id).notNull(),
  role: text("role").notNull(),
  message: text("message").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const experimentDiagnoses = pgTable("experiment_diagnoses", {
  id: uuid("id").primaryKey(),
  experimentId: uuid("experiment_id").references(() => experiments.id).notNull(),
  diagnosisJson: jsonb("diagnosis_json").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const experimentReflections = pgTable("experiment_reflections", {
  id: uuid("id").primaryKey(),
  experimentId: uuid("experiment_id").references(() => experiments.id).notNull(),
  attemptId: uuid("attempt_id").references(() => experimentAttempts.id).notNull(),
  reflectionJson: jsonb("reflection_json").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const strategyDecisions = pgTable("strategy_decisions", {
  id: uuid("id").primaryKey(),
  experimentId: uuid("experiment_id").references(() => experiments.id).notNull(),
  attemptNumber: integer("attempt_number").notNull(),
  decisionJson: jsonb("decision_json").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const connectorRuns = pgTable("connector_runs", {
  id: uuid("id").primaryKey(),
  provider: text("provider").notNull(),
  connectorId: text("connector_id").notNull(),
  status: text("status").notNull(),
  requestJson: jsonb("request_json").$type<Record<string, unknown> | null>(),
  sourceMeta: jsonb("source_meta").$type<Record<string, unknown> | null>(),
  rawHash: text("raw_hash"),
  normalizedHash: text("normalized_hash"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const modelRuns = pgTable("model_runs", {
  id: uuid("id").primaryKey(),
  experimentId: uuid("experiment_id").references(() => experiments.id).notNull(),
  attemptId: uuid("attempt_id").references(() => experimentAttempts.id),
  modelName: text("model_name").notNull(),
  modelType: text("model_type").notNull(),
  targetColumn: text("target_column"),
  featureColumns: jsonb("feature_columns").$type<string[]>(),
  metrics: jsonb("metrics").$type<Record<string, unknown>>(),
  artifactHash: text("artifact_hash"),
  artifactUri: text("artifact_uri"),
  status: text("status"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const backtestReports = pgTable("backtest_reports", {
  id: uuid("id").primaryKey(),
  experimentId: uuid("experiment_id").references(() => experiments.id).notNull(),
  attemptId: uuid("attempt_id").references(() => experimentAttempts.id),
  backtestType: text("backtest_type"),
  baselineName: text("baseline_name"),
  baselineMetrics: jsonb("baseline_metrics").$type<Record<string, unknown>>(),
  bestModelId: uuid("best_model_id").references(() => modelRuns.id),
  modelMetrics: jsonb("model_metrics").$type<Record<string, unknown>>(),
  liftOverBaseline: numeric("lift_over_baseline", { precision: 10, scale: 4 }),
  reportJson: jsonb("report_json").$type<Record<string, unknown>>(),
  reportHash: text("report_hash"),
  reportUri: text("report_uri"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const proofReceipts = pgTable("proof_receipts", {
  id: uuid("id").primaryKey(),
  experimentId: uuid("experiment_id").references(() => experiments.id).notNull(),
  receiptJson: jsonb("receipt_json").$type<ProofReceipt>().notNull(),
  receiptHash: text("receipt_hash").notNull(),
  datasetHash: text("dataset_hash"),
  modelHash: text("model_hash"),
  configHash: text("config_hash"),
  metricsHash: text("metrics_hash"),
  backtestHash: text("backtest_hash"),
  finalAnswerHash: text("final_answer_hash"),
  verificationStatus: text("verification_status"),
  ogStorageUri: text("og_storage_uri"),
  onchainTxHash: text("onchain_tx_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const artifacts = pgTable("artifacts", {
  id: uuid("id").primaryKey(),
  experimentId: uuid("experiment_id").references(() => experiments.id).notNull(),
  artifactType: text("artifact_type").notNull(),
  name: text("name").notNull(),
  localPath: text("local_path"),
  contentHash: text("content_hash"),
  ogStorageUri: text("og_storage_uri"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const experimentRelations = relations(experiments, ({ one, many }) => ({
  dataset: one(datasets, { fields: [experiments.datasetId], references: [datasets.id] }),
  attempts: many(experimentAttempts),
  messages: many(experimentMessages),
  diagnoses: many(experimentDiagnoses),
  reflections: many(experimentReflections),
  decisions: many(strategyDecisions),
  models: many(modelRuns),
  backtests: many(backtestReports),
  proofs: many(proofReceipts),
  artifacts: many(artifacts)
}));

export const experimentAttemptRelations = relations(experimentAttempts, ({ one, many }) => ({
  experiment: one(experiments, { fields: [experimentAttempts.experimentId], references: [experiments.id] }),
  models: many(modelRuns),
  backtests: many(backtestReports)
}));

export const experimentMessageRelations = relations(experimentMessages, ({ one }) => ({
  experiment: one(experiments, { fields: [experimentMessages.experimentId], references: [experiments.id] })
}));

export const experimentDiagnosisRelations = relations(experimentDiagnoses, ({ one }) => ({
  experiment: one(experiments, { fields: [experimentDiagnoses.experimentId], references: [experiments.id] })
}));

export const experimentReflectionRelations = relations(experimentReflections, ({ one }) => ({
  experiment: one(experiments, { fields: [experimentReflections.experimentId], references: [experiments.id] }),
  attempt: one(experimentAttempts, { fields: [experimentReflections.attemptId], references: [experimentAttempts.id] })
}));

export const strategyDecisionRelations = relations(strategyDecisions, ({ one }) => ({
  experiment: one(experiments, { fields: [strategyDecisions.experimentId], references: [experiments.id] })
}));

export const datasetRelations = relations(datasets, ({ one, many }) => ({
  user: one(users, { fields: [datasets.userId], references: [users.id] }),
  experiments: many(experiments)
}));

export const modelRunRelations = relations(modelRuns, ({ one, many }) => ({
  experiment: one(experiments, { fields: [modelRuns.experimentId], references: [experiments.id] }),
  attempt: one(experimentAttempts, { fields: [modelRuns.attemptId], references: [experimentAttempts.id] }),
  selectedInBacktests: many(backtestReports)
}));

export const backtestReportRelations = relations(backtestReports, ({ one }) => ({
  experiment: one(experiments, { fields: [backtestReports.experimentId], references: [experiments.id] }),
  attempt: one(experimentAttempts, { fields: [backtestReports.attemptId], references: [experimentAttempts.id] }),
  bestModel: one(modelRuns, { fields: [backtestReports.bestModelId], references: [modelRuns.id] })
}));

export const proofReceiptRelations = relations(proofReceipts, ({ one }) => ({
  experiment: one(experiments, { fields: [proofReceipts.experimentId], references: [experiments.id] })
}));

export const artifactRelations = relations(artifacts, ({ one }) => ({
  experiment: one(experiments, { fields: [artifacts.experimentId], references: [experiments.id] })
}));

export const connectorRunRelations = relations(connectorRuns, () => ({}));
