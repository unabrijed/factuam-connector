import { z } from "zod";

export const experimentStatuses = [
  "CREATED",
  "CLASSIFYING",
  "PLANNING",
  "WAITING_FOR_DATA",
  "VALIDATING_DATA",
  "TRAINING",
  "BACKTESTING",
  "VERIFYING",
  "GENERATING_RECEIPT",
  "COMPLETED",
  "FAILED_CLASSIFICATION",
  "FAILED_PLANNING",
  "FAILED_DATA_VALIDATION",
  "FAILED_TRAINING",
  "FAILED_BACKTESTING",
  "FAILED_VERIFICATION",
  "FAILED_RECEIPT_GENERATION",
  "REJECTED_NO_EVIDENCE_NEEDED",
  "REJECTED_INSUFFICIENT_DATA",
  "REJECTED_DATA_LEAKAGE",
  "REJECTED_MODEL_UNDERPERFORMED",
  "REJECTED_LOW_CONFIDENCE"
] as const;

export const evidenceTypes = [
  "none",
  "retrieval",
  "simulation",
  "supervised_prediction",
  "regression",
  "classification",
  "ranking",
  "forecasting",
  "backtest",
  "fine_tuning"
] as const;

export const riskLevels = [
  "low",
  "business_decision",
  "financial",
  "strategy",
  "high"
] as const;

export const confidenceLevels = ["low", "medium", "high"] as const;
export const executionModes = ["upload", "connector"] as const;
export const connectorProviders = ["kaggle", "url_csv"] as const;
export const connectorRunStatuses = ["pending", "running", "completed", "failed"] as const;
export const failureTaxonomy = [
  "schema_failure",
  "target_failure",
  "split_failure",
  "preprocessing_failure",
  "model_fit_failure",
  "metric_failure",
  "verification_failure",
  "infra_failure"
] as const;

export type ExperimentStatus = (typeof experimentStatuses)[number];
export type EvidenceType = (typeof evidenceTypes)[number];
export type RiskLevel = (typeof riskLevels)[number];
export type ConfidenceLevel = (typeof confidenceLevels)[number];
export type ExecutionMode = (typeof executionModes)[number];
export type ConnectorProvider = (typeof connectorProviders)[number];
export type ConnectorRunStatus = (typeof connectorRunStatuses)[number];
export type FailureCategory = (typeof failureTaxonomy)[number];

export const EvidenceClassifierResultSchema = z.object({
  requiresEvidenceMode: z.boolean(),
  evidenceType: z.enum(evidenceTypes),
  riskLevel: z.enum(riskLevels),
  reason: z.string(),
  minimumEvidenceRequired: z.string()
});
export type EvidenceClassifierResult = z.infer<typeof EvidenceClassifierResultSchema>;

export const ExperimentPlanSchema = z.object({
  objective: z.string(),
  taskType: z.enum(["classification", "regression", "ranking", "forecasting"]),
  targetColumn: z.string(),
  requiredColumns: z.array(z.string()),
  optionalColumns: z.array(z.string()),
  candidateModels: z.array(z.string()).min(1),
  baselineMethod: z.string(),
  evaluationMetrics: z.array(z.string()).min(1),
  backtestMethod: z.enum(["random_split", "time_split", "walk_forward", "holdout"]),
  splitConfig: z.object({
    trainSize: z.number().optional(),
    testSize: z.number().optional(),
    timeColumn: z.string().optional(),
    numberOfFolds: z.number().optional()
  }),
  successCriteria: z.object({
    minimumRows: z.number(),
    minimumLiftOverBaseline: z.number(),
    minimumMetricValue: z.number().optional()
  }),
  limitations: z.array(z.string())
});
export type ExperimentPlan = z.infer<typeof ExperimentPlanSchema>;

export const DataScoutResultSchema = z.object({
  dataStatus: z.enum(["sufficient", "insufficient"]),
  missingColumns: z.array(z.string()),
  recommendation: z.string()
});
export type DataScoutResult = z.infer<typeof DataScoutResultSchema>;

export const DataQualityReportSchema = z.object({
  valid: z.boolean(),
  rowCount: z.number(),
  columnCount: z.number(),
  missingValues: z.record(z.number()),
  duplicateRows: z.number(),
  warnings: z.array(z.string()),
  leakageDetected: z.boolean().default(false),
  inferredSchema: z.array(
    z.object({
      name: z.string(),
      kind: z.enum(["numeric", "categorical", "datetime", "text", "unknown"]),
      nullable: z.boolean(),
      uniqueValues: z.number().optional()
    })
  )
});
export type DataQualityReport = z.infer<typeof DataQualityReportSchema>;

export const ArtifactManifestEntrySchema = z.object({
  artifactType: z.string(),
  name: z.string(),
  localPath: z.string().optional(),
  contentHash: z.string(),
  uri: z.string().optional(),
  metadata: z.record(z.any()).optional()
});
export type ArtifactManifestEntry = z.infer<typeof ArtifactManifestEntrySchema>;

export const KaggleConnectorParamsSchema = z.object({
  dataset: z.string().min(3),
  file: z.string().min(1).optional()
});
export type KaggleConnectorParams = z.infer<typeof KaggleConnectorParamsSchema>;

export const UrlCsvConnectorParamsSchema = z.object({
  url: z.string().url(),
  fileName: z.string().min(1).optional()
});
export type UrlCsvConnectorParams = z.infer<typeof UrlCsvConnectorParamsSchema>;

export const ConnectorRequestSchema = z.discriminatedUnion("provider", [
  z.object({
    provider: z.literal("kaggle"),
    params: KaggleConnectorParamsSchema
  }),
  z.object({
    provider: z.literal("url_csv"),
    params: UrlCsvConnectorParamsSchema
  })
]);
export type ConnectorRequest = z.infer<typeof ConnectorRequestSchema>;

export const SourceTraceSchema = z.object({
  provider: z.enum(connectorProviders),
  connectorId: z.string(),
  dataset: z.string(),
  selectedFile: z.string(),
  rawHash: z.string(),
  normalizedHash: z.string()
});
export type SourceTrace = z.infer<typeof SourceTraceSchema>;

export const ConnectorRunSchema = z.object({
  id: z.string(),
  provider: z.enum(connectorProviders),
  connectorId: z.string(),
  status: z.enum(connectorRunStatuses),
  requestJson: z.record(z.any()).optional(),
  sourceMeta: z.record(z.any()).optional(),
  rawHash: z.string().optional(),
  normalizedHash: z.string().optional(),
  errorMessage: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});
export type ConnectorRun = z.infer<typeof ConnectorRunSchema>;

export const ModelRunResultSchema = z.object({
  modelId: z.string(),
  modelName: z.string(),
  modelType: z.string(),
  targetColumn: z.string(),
  featureColumns: z.array(z.string()),
  metrics: z.record(z.union([z.number(), z.string(), z.boolean()])),
  artifactPath: z.string().optional(),
  artifactHash: z.string().optional(),
  status: z.enum(["completed", "failed"]),
  failureReason: z.string().optional()
});
export type ModelRunResult = z.infer<typeof ModelRunResultSchema>;

export const BaselineResultSchema = z.object({
  modelName: z.string(),
  metrics: z.record(z.number())
});
export type BaselineResult = z.infer<typeof BaselineResultSchema>;

export const BacktestResultSchema = z.object({
  backtestType: z.string(),
  baselineName: z.string(),
  baselineMetrics: z.record(z.number()),
  bestModelName: z.string(),
  modelMetrics: z.record(z.number()),
  liftOverBaseline: z.number(),
  report: z.record(z.any()),
  reportPath: z.string().optional(),
  reportHash: z.string().optional()
});
export type BacktestResult = z.infer<typeof BacktestResultSchema>;

export const MLRunResultSchema = z.object({
  experimentId: z.string(),
  datasetId: z.string(),
  taskType: z.string(),
  targetColumn: z.string(),
  models: z.array(ModelRunResultSchema),
  bestModel: z.object({
    modelName: z.string(),
    modelId: z.string(),
    reason: z.string(),
    metrics: z.record(z.number())
  }),
  baseline: BaselineResultSchema,
  backtest: BacktestResultSchema,
  confidence: z.enum(confidenceLevels),
  dataQuality: DataQualityReportSchema,
  artifacts: z.array(ArtifactManifestEntrySchema),
  cleanedDatasetPath: z.string().optional(),
  featureManifestPath: z.string().optional()
});
export type MLRunResult = z.infer<typeof MLRunResultSchema>;

export const VerifierResultSchema = z.object({
  verificationStatus: z.enum(["verified", "rejected", "warning"]),
  confidence: z.enum(confidenceLevels),
  allowedClaims: z.array(z.string()),
  disallowedClaims: z.array(z.string()),
  warnings: z.array(z.string()),
  reason: z.string().optional()
});
export type VerifierResult = z.infer<typeof VerifierResultSchema>;

export const ComputeProofSchema = z.object({
  providerAddress: z.string(),
  responseId: z.string(),
  verified: z.boolean(),
  outputHash: z.string()
});
export type ComputeProof = z.infer<typeof ComputeProofSchema>;

export const ReeVerificationSchema = z.object({
  provider: z.literal("gensyn_ree").default("gensyn_ree"),
  model: z.string(),
  mode: z.enum(["default", "deterministic", "reproducible"]).optional(),
  receiptHash: z.string(),
  promptHash: z.string().optional(),
  configHash: z.string().optional(),
  outputHash: z.string().optional(),
  hardwareIndependent: z.boolean().optional(),
  verified: z.boolean().default(true),
  receipt: z.record(z.any()).optional()
});
export type ReeVerification = z.infer<typeof ReeVerificationSchema>;

export const AgentTraceEntrySchema = z.object({
  step: z.number(),
  agent: z.string(),
  axlPeerId: z.string().optional(),
  transport: z.literal("axl").optional(),
  input: z.record(z.any()).optional(),
  output: z.record(z.any()).optional(),
  reeVerification: ReeVerificationSchema.optional()
});
export type AgentTraceEntry = z.infer<typeof AgentTraceEntrySchema>;

export const ProofReceiptSchema = z.object({
  version: z.string(),
  project: z.enum(["Factum", "ProofLayer"]),
  experimentId: z.string(),
  executionMode: z.enum(executionModes).optional(),
  queryHash: z.string(),
  datasetHash: z.string(),
  experimentConfigHash: z.string(),
  codeHash: z.string().optional(),
  modelArtifactHash: z.string(),
  metricsHash: z.string(),
  backtestReportHash: z.string(),
  finalAnswerHash: z.string(),
  artifactManifestHash: z.string(),
  verificationStatus: z.enum(["verified", "rejected", "warning"]),
  confidence: z.enum(confidenceLevels),
  createdAt: z.string(),
  artifacts: z.object({
    datasetUri: z.string().optional(),
    modelUri: z.string().optional(),
    metricsUri: z.string().optional(),
    backtestReportUri: z.string().optional(),
    receiptUri: z.string().optional()
  }),
  sourceTraces: z.array(SourceTraceSchema).optional(),
  warnings: z.array(z.string()),
  computeProof: ComputeProofSchema.optional(),
  agentTrace: z.array(AgentTraceEntrySchema).optional(),
  reeVerification: ReeVerificationSchema.optional(),
  chain: z.object({
    network: z.string().optional(),
    txHash: z.string().optional(),
    contractAddress: z.string().optional(),
    blockNumber: z.number().optional(),
    verifyUrl: z.string().optional()
  }).optional()
});
export type ProofReceipt = z.infer<typeof ProofReceiptSchema>;

export const DatasetSchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
  name: z.string(),
  sourceType: z.string(),
  localPath: z.string().optional(),
  originalFilename: z.string().optional(),
  rowCount: z.number().optional(),
  columnCount: z.number().optional(),
  schemaJson: z.record(z.any()).optional(),
  dataQualityReport: z.record(z.any()).optional(),
  datasetHash: z.string().optional(),
  ogStorageUri: z.string().optional(),
  sourceMeta: z.record(z.any()).optional(),
  connectorId: z.string().optional(),
  connectorRunId: z.string().optional(),
  rawPayloadPath: z.string().optional(),
  createdAt: z.string().optional()
});
export type Dataset = z.infer<typeof DatasetSchema>;

export const ExperimentSchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
  datasetId: z.string().optional(),
  query: z.string(),
  mode: z.enum(executionModes).optional(),
  status: z.enum(experimentStatuses),
  connectorRequest: ConnectorRequestSchema.optional(),
  evidenceRequired: z.boolean().optional(),
  evidenceType: z.enum(evidenceTypes).optional(),
  riskLevel: z.enum(riskLevels).optional(),
  experimentPlan: ExperimentPlanSchema.optional(),
  resultSummary: z.record(z.any()).optional(),
  finalAnswer: z.string().optional(),
  confidence: z.enum(confidenceLevels).optional(),
  errorMessage: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type Experiment = z.infer<typeof ExperimentSchema>;

export const ExperimentAttemptSchema = z.object({
  id: z.string(),
  experimentId: z.string(),
  attemptNumber: z.number(),
  status: z.string(),
  strategy: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  planJson: z.record(z.any()).optional().nullable(),
  summaryJson: z.record(z.any()).optional().nullable(),
  startedAt: z.string().optional().nullable(),
  completedAt: z.string().optional().nullable(),
  createdAt: z.string().optional()
});
export type ExperimentAttempt = z.infer<typeof ExperimentAttemptSchema>;

export const ExperimentMessageSchema = z.object({
  id: z.string(),
  experimentId: z.string(),
  role: z.enum(["user", "agent", "system"]),
  message: z.string(),
  metadata: z.record(z.any()).optional().nullable(),
  createdAt: z.string().optional()
});
export type ExperimentMessage = z.infer<typeof ExperimentMessageSchema>;

export const DatasetDiagnosisSchema = z.object({
  id: z.string().optional(),
  experimentId: z.string().optional(),
  summary: z.string(),
  targetColumn: z.string(),
  targetKind: z.enum(["numeric", "categorical", "datetime", "text", "unknown"]),
  targetQuality: z.enum(["clean", "coerced", "sparse", "ambiguous", "invalid"]).default("clean"),
  taskTypeFit: z.enum(["strong", "moderate", "weak"]).default("moderate"),
  rowCount: z.number(),
  columnCount: z.number(),
  highMissingColumns: z.array(z.string()),
  highCardinalityColumns: z.array(z.string()),
  textColumns: z.array(z.string()),
  datetimeColumns: z.array(z.string()),
  leakageRisks: z.array(z.string()),
  splitRisks: z.array(z.string()).default([]),
  identifierLikeColumns: z.array(z.string()).default([]),
  likelyUsefulColumns: z.array(z.string()),
  likelyHarmfulColumns: z.array(z.string()),
  textStrategy: z.enum(["exclude", "meta_only", "featureize", "review"]).default("review"),
  targetQualityNotes: z.array(z.string()).default([]),
  recommendedActions: z.array(z.string()),
  createdAt: z.string().optional()
});
export type DatasetDiagnosis = z.infer<typeof DatasetDiagnosisSchema>;

export const AttemptReflectionSchema = z.object({
  id: z.string().optional(),
  experimentId: z.string().optional(),
  attemptId: z.string(),
  verdict: z.enum(["success", "weak_success", "failed"]),
  failureCategory: z.enum(failureTaxonomy).optional(),
  summary: z.string(),
  failures: z.array(z.string()),
  improvements: z.array(z.string()),
  nextActions: z.array(z.string()),
  createdAt: z.string().optional()
});
export type AttemptReflection = z.infer<typeof AttemptReflectionSchema>;

export const StrategyDecisionSchema = z.object({
  id: z.string().optional(),
  experimentId: z.string().optional(),
  attemptNumber: z.number(),
  strategyKey: z.string(),
  rationale: z.string(),
  changes: z.array(z.string()),
  stopAfterAttempt: z.boolean().default(false),
  createdAt: z.string().optional()
});
export type StrategyDecision = z.infer<typeof StrategyDecisionSchema>;

export const CreateExperimentInputSchema = z.object({
  query: z.string().min(5),
  mode: z.enum(executionModes).default("upload"),
  datasetId: z.string().uuid().optional(),
  connectorRequest: ConnectorRequestSchema.optional()
});
export type CreateExperimentInput = z.infer<typeof CreateExperimentInputSchema>;

export const UploadDatasetResponseSchema = z.object({
  datasetId: z.string(),
  name: z.string(),
  rowCount: z.number(),
  columnCount: z.number(),
  status: z.enum(["uploaded", "stored_locally"]),
  ogStorageUri: z.string().optional(),
  warning: z.string().optional()
});
export type UploadDatasetResponse = z.infer<typeof UploadDatasetResponseSchema>;
