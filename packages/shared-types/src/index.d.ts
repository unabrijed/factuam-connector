import { z } from "zod";
export declare const experimentStatuses: readonly ["CREATED", "CLASSIFYING", "PLANNING", "WAITING_FOR_DATA", "VALIDATING_DATA", "TRAINING", "BACKTESTING", "VERIFYING", "GENERATING_RECEIPT", "COMPLETED", "FAILED_CLASSIFICATION", "FAILED_PLANNING", "FAILED_DATA_VALIDATION", "FAILED_TRAINING", "FAILED_BACKTESTING", "FAILED_VERIFICATION", "FAILED_AXL_TRANSPORT", "FAILED_RECEIPT_GENERATION", "REJECTED_NO_EVIDENCE_NEEDED", "REJECTED_INSUFFICIENT_DATA", "REJECTED_DATA_LEAKAGE", "REJECTED_MODEL_UNDERPERFORMED", "REJECTED_LOW_CONFIDENCE"];
export declare const evidenceTypes: readonly ["none", "retrieval", "simulation", "supervised_prediction", "regression", "classification", "ranking", "forecasting", "backtest", "fine_tuning"];
export declare const riskLevels: readonly ["low", "business_decision", "financial", "strategy", "high"];
export declare const confidenceLevels: readonly ["low", "medium", "high"];
export declare const executionModes: readonly ["upload", "connector"];
export declare const connectorProviders: readonly ["kaggle", "url_csv"];
export declare const connectorRunStatuses: readonly ["pending", "running", "completed", "failed"];
export declare const failureTaxonomy: readonly ["schema_failure", "target_failure", "split_failure", "preprocessing_failure", "model_fit_failure", "metric_failure", "verification_failure", "infra_failure"];
export type ExperimentStatus = (typeof experimentStatuses)[number];
export type EvidenceType = (typeof evidenceTypes)[number];
export type RiskLevel = (typeof riskLevels)[number];
export type ConfidenceLevel = (typeof confidenceLevels)[number];
export type ExecutionMode = (typeof executionModes)[number];
export type ConnectorProvider = (typeof connectorProviders)[number];
export type ConnectorRunStatus = (typeof connectorRunStatuses)[number];
export type FailureCategory = (typeof failureTaxonomy)[number];
export declare const EvidenceClassifierResultSchema: z.ZodObject<{
    requiresEvidenceMode: z.ZodBoolean;
    evidenceType: z.ZodEnum<["none", "retrieval", "simulation", "supervised_prediction", "regression", "classification", "ranking", "forecasting", "backtest", "fine_tuning"]>;
    riskLevel: z.ZodEnum<["low", "business_decision", "financial", "strategy", "high"]>;
    reason: z.ZodString;
    minimumEvidenceRequired: z.ZodString;
}, "strip", z.ZodTypeAny, {
    requiresEvidenceMode: boolean;
    evidenceType: "none" | "retrieval" | "simulation" | "supervised_prediction" | "regression" | "classification" | "ranking" | "forecasting" | "backtest" | "fine_tuning";
    riskLevel: "low" | "business_decision" | "financial" | "strategy" | "high";
    reason: string;
    minimumEvidenceRequired: string;
}, {
    requiresEvidenceMode: boolean;
    evidenceType: "none" | "retrieval" | "simulation" | "supervised_prediction" | "regression" | "classification" | "ranking" | "forecasting" | "backtest" | "fine_tuning";
    riskLevel: "low" | "business_decision" | "financial" | "strategy" | "high";
    reason: string;
    minimumEvidenceRequired: string;
}>;
export type EvidenceClassifierResult = z.infer<typeof EvidenceClassifierResultSchema>;
export declare const ExperimentPlanSchema: z.ZodObject<{
    objective: z.ZodString;
    taskType: z.ZodEnum<["classification", "regression", "ranking", "forecasting"]>;
    targetColumn: z.ZodString;
    requiredColumns: z.ZodArray<z.ZodString, "many">;
    optionalColumns: z.ZodArray<z.ZodString, "many">;
    candidateModels: z.ZodArray<z.ZodString, "many">;
    baselineMethod: z.ZodString;
    evaluationMetrics: z.ZodArray<z.ZodString, "many">;
    backtestMethod: z.ZodEnum<["random_split", "time_split", "walk_forward", "holdout"]>;
    splitConfig: z.ZodObject<{
        trainSize: z.ZodOptional<z.ZodNumber>;
        testSize: z.ZodOptional<z.ZodNumber>;
        timeColumn: z.ZodOptional<z.ZodString>;
        numberOfFolds: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        trainSize?: number | undefined;
        testSize?: number | undefined;
        timeColumn?: string | undefined;
        numberOfFolds?: number | undefined;
    }, {
        trainSize?: number | undefined;
        testSize?: number | undefined;
        timeColumn?: string | undefined;
        numberOfFolds?: number | undefined;
    }>;
    successCriteria: z.ZodObject<{
        minimumRows: z.ZodNumber;
        minimumLiftOverBaseline: z.ZodNumber;
        minimumMetricValue: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        minimumRows: number;
        minimumLiftOverBaseline: number;
        minimumMetricValue?: number | undefined;
    }, {
        minimumRows: number;
        minimumLiftOverBaseline: number;
        minimumMetricValue?: number | undefined;
    }>;
    limitations: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    objective: string;
    taskType: "regression" | "classification" | "ranking" | "forecasting";
    targetColumn: string;
    requiredColumns: string[];
    optionalColumns: string[];
    candidateModels: string[];
    baselineMethod: string;
    evaluationMetrics: string[];
    backtestMethod: "random_split" | "time_split" | "walk_forward" | "holdout";
    splitConfig: {
        trainSize?: number | undefined;
        testSize?: number | undefined;
        timeColumn?: string | undefined;
        numberOfFolds?: number | undefined;
    };
    successCriteria: {
        minimumRows: number;
        minimumLiftOverBaseline: number;
        minimumMetricValue?: number | undefined;
    };
    limitations: string[];
}, {
    objective: string;
    taskType: "regression" | "classification" | "ranking" | "forecasting";
    targetColumn: string;
    requiredColumns: string[];
    optionalColumns: string[];
    candidateModels: string[];
    baselineMethod: string;
    evaluationMetrics: string[];
    backtestMethod: "random_split" | "time_split" | "walk_forward" | "holdout";
    splitConfig: {
        trainSize?: number | undefined;
        testSize?: number | undefined;
        timeColumn?: string | undefined;
        numberOfFolds?: number | undefined;
    };
    successCriteria: {
        minimumRows: number;
        minimumLiftOverBaseline: number;
        minimumMetricValue?: number | undefined;
    };
    limitations: string[];
}>;
export type ExperimentPlan = z.infer<typeof ExperimentPlanSchema>;
export declare const DataScoutResultSchema: z.ZodObject<{
    dataStatus: z.ZodEnum<["sufficient", "insufficient"]>;
    missingColumns: z.ZodArray<z.ZodString, "many">;
    recommendation: z.ZodString;
}, "strip", z.ZodTypeAny, {
    dataStatus: "sufficient" | "insufficient";
    missingColumns: string[];
    recommendation: string;
}, {
    dataStatus: "sufficient" | "insufficient";
    missingColumns: string[];
    recommendation: string;
}>;
export type DataScoutResult = z.infer<typeof DataScoutResultSchema>;
export declare const DataQualityReportSchema: z.ZodObject<{
    valid: z.ZodBoolean;
    rowCount: z.ZodNumber;
    columnCount: z.ZodNumber;
    missingValues: z.ZodRecord<z.ZodString, z.ZodNumber>;
    duplicateRows: z.ZodNumber;
    warnings: z.ZodArray<z.ZodString, "many">;
    leakageDetected: z.ZodDefault<z.ZodBoolean>;
    inferredSchema: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        kind: z.ZodEnum<["numeric", "categorical", "datetime", "text", "unknown"]>;
        nullable: z.ZodBoolean;
        uniqueValues: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        kind: "unknown" | "numeric" | "categorical" | "datetime" | "text";
        nullable: boolean;
        uniqueValues?: number | undefined;
    }, {
        name: string;
        kind: "unknown" | "numeric" | "categorical" | "datetime" | "text";
        nullable: boolean;
        uniqueValues?: number | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    valid: boolean;
    rowCount: number;
    columnCount: number;
    missingValues: Record<string, number>;
    duplicateRows: number;
    warnings: string[];
    leakageDetected: boolean;
    inferredSchema: {
        name: string;
        kind: "unknown" | "numeric" | "categorical" | "datetime" | "text";
        nullable: boolean;
        uniqueValues?: number | undefined;
    }[];
}, {
    valid: boolean;
    rowCount: number;
    columnCount: number;
    missingValues: Record<string, number>;
    duplicateRows: number;
    warnings: string[];
    inferredSchema: {
        name: string;
        kind: "unknown" | "numeric" | "categorical" | "datetime" | "text";
        nullable: boolean;
        uniqueValues?: number | undefined;
    }[];
    leakageDetected?: boolean | undefined;
}>;
export type DataQualityReport = z.infer<typeof DataQualityReportSchema>;
export declare const ArtifactManifestEntrySchema: z.ZodObject<{
    artifactType: z.ZodString;
    name: z.ZodString;
    localPath: z.ZodOptional<z.ZodString>;
    contentHash: z.ZodString;
    uri: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    artifactType: string;
    contentHash: string;
    localPath?: string | undefined;
    uri?: string | undefined;
    metadata?: Record<string, any> | undefined;
}, {
    name: string;
    artifactType: string;
    contentHash: string;
    localPath?: string | undefined;
    uri?: string | undefined;
    metadata?: Record<string, any> | undefined;
}>;
export type ArtifactManifestEntry = z.infer<typeof ArtifactManifestEntrySchema>;
export declare const KaggleConnectorParamsSchema: z.ZodObject<{
    dataset: z.ZodString;
    file: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    dataset: string;
    file?: string | undefined;
}, {
    dataset: string;
    file?: string | undefined;
}>;
export type KaggleConnectorParams = z.infer<typeof KaggleConnectorParamsSchema>;
export declare const UrlCsvConnectorParamsSchema: z.ZodObject<{
    url: z.ZodString;
    fileName: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    url: string;
    fileName?: string | undefined;
}, {
    url: string;
    fileName?: string | undefined;
}>;
export type UrlCsvConnectorParams = z.infer<typeof UrlCsvConnectorParamsSchema>;
export declare const ConnectorRequestSchema: z.ZodDiscriminatedUnion<"provider", [z.ZodObject<{
    provider: z.ZodLiteral<"kaggle">;
    params: z.ZodObject<{
        dataset: z.ZodString;
        file: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        dataset: string;
        file?: string | undefined;
    }, {
        dataset: string;
        file?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    params: {
        dataset: string;
        file?: string | undefined;
    };
    provider: "kaggle";
}, {
    params: {
        dataset: string;
        file?: string | undefined;
    };
    provider: "kaggle";
}>, z.ZodObject<{
    provider: z.ZodLiteral<"url_csv">;
    params: z.ZodObject<{
        url: z.ZodString;
        fileName: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        url: string;
        fileName?: string | undefined;
    }, {
        url: string;
        fileName?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    params: {
        url: string;
        fileName?: string | undefined;
    };
    provider: "url_csv";
}, {
    params: {
        url: string;
        fileName?: string | undefined;
    };
    provider: "url_csv";
}>]>;
export type ConnectorRequest = z.infer<typeof ConnectorRequestSchema>;
export declare const SourceTraceSchema: z.ZodObject<{
    provider: z.ZodEnum<["kaggle", "url_csv"]>;
    connectorId: z.ZodString;
    dataset: z.ZodString;
    selectedFile: z.ZodString;
    rawHash: z.ZodString;
    normalizedHash: z.ZodString;
}, "strip", z.ZodTypeAny, {
    dataset: string;
    provider: "kaggle" | "url_csv";
    connectorId: string;
    selectedFile: string;
    rawHash: string;
    normalizedHash: string;
}, {
    dataset: string;
    provider: "kaggle" | "url_csv";
    connectorId: string;
    selectedFile: string;
    rawHash: string;
    normalizedHash: string;
}>;
export type SourceTrace = z.infer<typeof SourceTraceSchema>;
export declare const ConnectorRunSchema: z.ZodObject<{
    id: z.ZodString;
    provider: z.ZodEnum<["kaggle", "url_csv"]>;
    connectorId: z.ZodString;
    status: z.ZodEnum<["pending", "running", "completed", "failed"]>;
    requestJson: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    sourceMeta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    rawHash: z.ZodOptional<z.ZodString>;
    normalizedHash: z.ZodOptional<z.ZodString>;
    errorMessage: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "pending" | "running" | "completed" | "failed";
    provider: "kaggle" | "url_csv";
    connectorId: string;
    id: string;
    rawHash?: string | undefined;
    normalizedHash?: string | undefined;
    requestJson?: Record<string, any> | undefined;
    sourceMeta?: Record<string, any> | undefined;
    errorMessage?: string | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
}, {
    status: "pending" | "running" | "completed" | "failed";
    provider: "kaggle" | "url_csv";
    connectorId: string;
    id: string;
    rawHash?: string | undefined;
    normalizedHash?: string | undefined;
    requestJson?: Record<string, any> | undefined;
    sourceMeta?: Record<string, any> | undefined;
    errorMessage?: string | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
}>;
export type ConnectorRun = z.infer<typeof ConnectorRunSchema>;
export declare const ModelRunResultSchema: z.ZodObject<{
    modelId: z.ZodString;
    modelName: z.ZodString;
    modelType: z.ZodString;
    targetColumn: z.ZodString;
    featureColumns: z.ZodArray<z.ZodString, "many">;
    metrics: z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodNumber, z.ZodString, z.ZodBoolean]>>;
    artifactPath: z.ZodOptional<z.ZodString>;
    artifactHash: z.ZodOptional<z.ZodString>;
    status: z.ZodEnum<["completed", "failed"]>;
    failureReason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "completed" | "failed";
    targetColumn: string;
    modelId: string;
    modelName: string;
    modelType: string;
    featureColumns: string[];
    metrics: Record<string, string | number | boolean>;
    artifactPath?: string | undefined;
    artifactHash?: string | undefined;
    failureReason?: string | undefined;
}, {
    status: "completed" | "failed";
    targetColumn: string;
    modelId: string;
    modelName: string;
    modelType: string;
    featureColumns: string[];
    metrics: Record<string, string | number | boolean>;
    artifactPath?: string | undefined;
    artifactHash?: string | undefined;
    failureReason?: string | undefined;
}>;
export type ModelRunResult = z.infer<typeof ModelRunResultSchema>;
export declare const BaselineResultSchema: z.ZodObject<{
    modelName: z.ZodString;
    metrics: z.ZodRecord<z.ZodString, z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    modelName: string;
    metrics: Record<string, number>;
}, {
    modelName: string;
    metrics: Record<string, number>;
}>;
export type BaselineResult = z.infer<typeof BaselineResultSchema>;
export declare const BacktestResultSchema: z.ZodObject<{
    backtestType: z.ZodString;
    baselineName: z.ZodString;
    baselineMetrics: z.ZodRecord<z.ZodString, z.ZodNumber>;
    bestModelName: z.ZodString;
    modelMetrics: z.ZodRecord<z.ZodString, z.ZodNumber>;
    liftOverBaseline: z.ZodNumber;
    report: z.ZodRecord<z.ZodString, z.ZodAny>;
    reportPath: z.ZodOptional<z.ZodString>;
    reportHash: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    backtestType: string;
    baselineName: string;
    baselineMetrics: Record<string, number>;
    bestModelName: string;
    modelMetrics: Record<string, number>;
    liftOverBaseline: number;
    report: Record<string, any>;
    reportPath?: string | undefined;
    reportHash?: string | undefined;
}, {
    backtestType: string;
    baselineName: string;
    baselineMetrics: Record<string, number>;
    bestModelName: string;
    modelMetrics: Record<string, number>;
    liftOverBaseline: number;
    report: Record<string, any>;
    reportPath?: string | undefined;
    reportHash?: string | undefined;
}>;
export type BacktestResult = z.infer<typeof BacktestResultSchema>;
export declare const MLRunResultSchema: z.ZodObject<{
    experimentId: z.ZodString;
    datasetId: z.ZodString;
    taskType: z.ZodString;
    targetColumn: z.ZodString;
    models: z.ZodArray<z.ZodObject<{
        modelId: z.ZodString;
        modelName: z.ZodString;
        modelType: z.ZodString;
        targetColumn: z.ZodString;
        featureColumns: z.ZodArray<z.ZodString, "many">;
        metrics: z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodNumber, z.ZodString, z.ZodBoolean]>>;
        artifactPath: z.ZodOptional<z.ZodString>;
        artifactHash: z.ZodOptional<z.ZodString>;
        status: z.ZodEnum<["completed", "failed"]>;
        failureReason: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status: "completed" | "failed";
        targetColumn: string;
        modelId: string;
        modelName: string;
        modelType: string;
        featureColumns: string[];
        metrics: Record<string, string | number | boolean>;
        artifactPath?: string | undefined;
        artifactHash?: string | undefined;
        failureReason?: string | undefined;
    }, {
        status: "completed" | "failed";
        targetColumn: string;
        modelId: string;
        modelName: string;
        modelType: string;
        featureColumns: string[];
        metrics: Record<string, string | number | boolean>;
        artifactPath?: string | undefined;
        artifactHash?: string | undefined;
        failureReason?: string | undefined;
    }>, "many">;
    bestModel: z.ZodObject<{
        modelName: z.ZodString;
        modelId: z.ZodString;
        reason: z.ZodString;
        metrics: z.ZodRecord<z.ZodString, z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        reason: string;
        modelId: string;
        modelName: string;
        metrics: Record<string, number>;
    }, {
        reason: string;
        modelId: string;
        modelName: string;
        metrics: Record<string, number>;
    }>;
    baseline: z.ZodObject<{
        modelName: z.ZodString;
        metrics: z.ZodRecord<z.ZodString, z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        modelName: string;
        metrics: Record<string, number>;
    }, {
        modelName: string;
        metrics: Record<string, number>;
    }>;
    backtest: z.ZodObject<{
        backtestType: z.ZodString;
        baselineName: z.ZodString;
        baselineMetrics: z.ZodRecord<z.ZodString, z.ZodNumber>;
        bestModelName: z.ZodString;
        modelMetrics: z.ZodRecord<z.ZodString, z.ZodNumber>;
        liftOverBaseline: z.ZodNumber;
        report: z.ZodRecord<z.ZodString, z.ZodAny>;
        reportPath: z.ZodOptional<z.ZodString>;
        reportHash: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        backtestType: string;
        baselineName: string;
        baselineMetrics: Record<string, number>;
        bestModelName: string;
        modelMetrics: Record<string, number>;
        liftOverBaseline: number;
        report: Record<string, any>;
        reportPath?: string | undefined;
        reportHash?: string | undefined;
    }, {
        backtestType: string;
        baselineName: string;
        baselineMetrics: Record<string, number>;
        bestModelName: string;
        modelMetrics: Record<string, number>;
        liftOverBaseline: number;
        report: Record<string, any>;
        reportPath?: string | undefined;
        reportHash?: string | undefined;
    }>;
    confidence: z.ZodEnum<["low", "medium", "high"]>;
    dataQuality: z.ZodObject<{
        valid: z.ZodBoolean;
        rowCount: z.ZodNumber;
        columnCount: z.ZodNumber;
        missingValues: z.ZodRecord<z.ZodString, z.ZodNumber>;
        duplicateRows: z.ZodNumber;
        warnings: z.ZodArray<z.ZodString, "many">;
        leakageDetected: z.ZodDefault<z.ZodBoolean>;
        inferredSchema: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            kind: z.ZodEnum<["numeric", "categorical", "datetime", "text", "unknown"]>;
            nullable: z.ZodBoolean;
            uniqueValues: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            kind: "unknown" | "numeric" | "categorical" | "datetime" | "text";
            nullable: boolean;
            uniqueValues?: number | undefined;
        }, {
            name: string;
            kind: "unknown" | "numeric" | "categorical" | "datetime" | "text";
            nullable: boolean;
            uniqueValues?: number | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        valid: boolean;
        rowCount: number;
        columnCount: number;
        missingValues: Record<string, number>;
        duplicateRows: number;
        warnings: string[];
        leakageDetected: boolean;
        inferredSchema: {
            name: string;
            kind: "unknown" | "numeric" | "categorical" | "datetime" | "text";
            nullable: boolean;
            uniqueValues?: number | undefined;
        }[];
    }, {
        valid: boolean;
        rowCount: number;
        columnCount: number;
        missingValues: Record<string, number>;
        duplicateRows: number;
        warnings: string[];
        inferredSchema: {
            name: string;
            kind: "unknown" | "numeric" | "categorical" | "datetime" | "text";
            nullable: boolean;
            uniqueValues?: number | undefined;
        }[];
        leakageDetected?: boolean | undefined;
    }>;
    artifacts: z.ZodArray<z.ZodObject<{
        artifactType: z.ZodString;
        name: z.ZodString;
        localPath: z.ZodOptional<z.ZodString>;
        contentHash: z.ZodString;
        uri: z.ZodOptional<z.ZodString>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        artifactType: string;
        contentHash: string;
        localPath?: string | undefined;
        uri?: string | undefined;
        metadata?: Record<string, any> | undefined;
    }, {
        name: string;
        artifactType: string;
        contentHash: string;
        localPath?: string | undefined;
        uri?: string | undefined;
        metadata?: Record<string, any> | undefined;
    }>, "many">;
    cleanedDatasetPath: z.ZodOptional<z.ZodString>;
    featureManifestPath: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    backtest: {
        backtestType: string;
        baselineName: string;
        baselineMetrics: Record<string, number>;
        bestModelName: string;
        modelMetrics: Record<string, number>;
        liftOverBaseline: number;
        report: Record<string, any>;
        reportPath?: string | undefined;
        reportHash?: string | undefined;
    };
    taskType: string;
    targetColumn: string;
    experimentId: string;
    datasetId: string;
    models: {
        status: "completed" | "failed";
        targetColumn: string;
        modelId: string;
        modelName: string;
        modelType: string;
        featureColumns: string[];
        metrics: Record<string, string | number | boolean>;
        artifactPath?: string | undefined;
        artifactHash?: string | undefined;
        failureReason?: string | undefined;
    }[];
    bestModel: {
        reason: string;
        modelId: string;
        modelName: string;
        metrics: Record<string, number>;
    };
    baseline: {
        modelName: string;
        metrics: Record<string, number>;
    };
    confidence: "low" | "high" | "medium";
    dataQuality: {
        valid: boolean;
        rowCount: number;
        columnCount: number;
        missingValues: Record<string, number>;
        duplicateRows: number;
        warnings: string[];
        leakageDetected: boolean;
        inferredSchema: {
            name: string;
            kind: "unknown" | "numeric" | "categorical" | "datetime" | "text";
            nullable: boolean;
            uniqueValues?: number | undefined;
        }[];
    };
    artifacts: {
        name: string;
        artifactType: string;
        contentHash: string;
        localPath?: string | undefined;
        uri?: string | undefined;
        metadata?: Record<string, any> | undefined;
    }[];
    cleanedDatasetPath?: string | undefined;
    featureManifestPath?: string | undefined;
}, {
    backtest: {
        backtestType: string;
        baselineName: string;
        baselineMetrics: Record<string, number>;
        bestModelName: string;
        modelMetrics: Record<string, number>;
        liftOverBaseline: number;
        report: Record<string, any>;
        reportPath?: string | undefined;
        reportHash?: string | undefined;
    };
    taskType: string;
    targetColumn: string;
    experimentId: string;
    datasetId: string;
    models: {
        status: "completed" | "failed";
        targetColumn: string;
        modelId: string;
        modelName: string;
        modelType: string;
        featureColumns: string[];
        metrics: Record<string, string | number | boolean>;
        artifactPath?: string | undefined;
        artifactHash?: string | undefined;
        failureReason?: string | undefined;
    }[];
    bestModel: {
        reason: string;
        modelId: string;
        modelName: string;
        metrics: Record<string, number>;
    };
    baseline: {
        modelName: string;
        metrics: Record<string, number>;
    };
    confidence: "low" | "high" | "medium";
    dataQuality: {
        valid: boolean;
        rowCount: number;
        columnCount: number;
        missingValues: Record<string, number>;
        duplicateRows: number;
        warnings: string[];
        inferredSchema: {
            name: string;
            kind: "unknown" | "numeric" | "categorical" | "datetime" | "text";
            nullable: boolean;
            uniqueValues?: number | undefined;
        }[];
        leakageDetected?: boolean | undefined;
    };
    artifacts: {
        name: string;
        artifactType: string;
        contentHash: string;
        localPath?: string | undefined;
        uri?: string | undefined;
        metadata?: Record<string, any> | undefined;
    }[];
    cleanedDatasetPath?: string | undefined;
    featureManifestPath?: string | undefined;
}>;
export type MLRunResult = z.infer<typeof MLRunResultSchema>;
export declare const VerifierResultSchema: z.ZodObject<{
    verificationStatus: z.ZodEnum<["verified", "rejected", "warning"]>;
    confidence: z.ZodEnum<["low", "medium", "high"]>;
    allowedClaims: z.ZodArray<z.ZodString, "many">;
    disallowedClaims: z.ZodArray<z.ZodString, "many">;
    warnings: z.ZodArray<z.ZodString, "many">;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    warnings: string[];
    confidence: "low" | "high" | "medium";
    verificationStatus: "verified" | "rejected" | "warning";
    allowedClaims: string[];
    disallowedClaims: string[];
    reason?: string | undefined;
}, {
    warnings: string[];
    confidence: "low" | "high" | "medium";
    verificationStatus: "verified" | "rejected" | "warning";
    allowedClaims: string[];
    disallowedClaims: string[];
    reason?: string | undefined;
}>;
export type VerifierResult = z.infer<typeof VerifierResultSchema>;
export declare const ComputeProofSchema: z.ZodObject<{
    providerAddress: z.ZodString;
    responseId: z.ZodString;
    verified: z.ZodBoolean;
    outputHash: z.ZodString;
}, "strip", z.ZodTypeAny, {
    verified: boolean;
    providerAddress: string;
    responseId: string;
    outputHash: string;
}, {
    verified: boolean;
    providerAddress: string;
    responseId: string;
    outputHash: string;
}>;
export type ComputeProof = z.infer<typeof ComputeProofSchema>;
export declare const ReeVerificationSchema: z.ZodObject<{
    provider: z.ZodDefault<z.ZodLiteral<"gensyn_ree">>;
    model: z.ZodString;
    mode: z.ZodOptional<z.ZodEnum<["default", "deterministic", "reproducible"]>>;
    receiptHash: z.ZodString;
    promptHash: z.ZodOptional<z.ZodString>;
    configHash: z.ZodOptional<z.ZodString>;
    outputHash: z.ZodOptional<z.ZodString>;
    hardwareIndependent: z.ZodOptional<z.ZodBoolean>;
    verified: z.ZodDefault<z.ZodBoolean>;
    receipt: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    provider: "gensyn_ree";
    verified: boolean;
    model: string;
    receiptHash: string;
    outputHash?: string | undefined;
    mode?: "default" | "deterministic" | "reproducible" | undefined;
    promptHash?: string | undefined;
    configHash?: string | undefined;
    hardwareIndependent?: boolean | undefined;
    receipt?: Record<string, any> | undefined;
}, {
    model: string;
    receiptHash: string;
    provider?: "gensyn_ree" | undefined;
    verified?: boolean | undefined;
    outputHash?: string | undefined;
    mode?: "default" | "deterministic" | "reproducible" | undefined;
    promptHash?: string | undefined;
    configHash?: string | undefined;
    hardwareIndependent?: boolean | undefined;
    receipt?: Record<string, any> | undefined;
}>;
export type ReeVerification = z.infer<typeof ReeVerificationSchema>;
export declare const AgentTraceEntrySchema: z.ZodObject<{
    step: z.ZodNumber;
    agent: z.ZodString;
    axlPeerId: z.ZodOptional<z.ZodString>;
    transport: z.ZodOptional<z.ZodLiteral<"axl">>;
    input: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    output: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    reeVerification: z.ZodOptional<z.ZodObject<{
        provider: z.ZodDefault<z.ZodLiteral<"gensyn_ree">>;
        model: z.ZodString;
        mode: z.ZodOptional<z.ZodEnum<["default", "deterministic", "reproducible"]>>;
        receiptHash: z.ZodString;
        promptHash: z.ZodOptional<z.ZodString>;
        configHash: z.ZodOptional<z.ZodString>;
        outputHash: z.ZodOptional<z.ZodString>;
        hardwareIndependent: z.ZodOptional<z.ZodBoolean>;
        verified: z.ZodDefault<z.ZodBoolean>;
        receipt: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        provider: "gensyn_ree";
        verified: boolean;
        model: string;
        receiptHash: string;
        outputHash?: string | undefined;
        mode?: "default" | "deterministic" | "reproducible" | undefined;
        promptHash?: string | undefined;
        configHash?: string | undefined;
        hardwareIndependent?: boolean | undefined;
        receipt?: Record<string, any> | undefined;
    }, {
        model: string;
        receiptHash: string;
        provider?: "gensyn_ree" | undefined;
        verified?: boolean | undefined;
        outputHash?: string | undefined;
        mode?: "default" | "deterministic" | "reproducible" | undefined;
        promptHash?: string | undefined;
        configHash?: string | undefined;
        hardwareIndependent?: boolean | undefined;
        receipt?: Record<string, any> | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    step: number;
    agent: string;
    axlPeerId?: string | undefined;
    transport?: "axl" | undefined;
    input?: Record<string, any> | undefined;
    output?: Record<string, any> | undefined;
    reeVerification?: {
        provider: "gensyn_ree";
        verified: boolean;
        model: string;
        receiptHash: string;
        outputHash?: string | undefined;
        mode?: "default" | "deterministic" | "reproducible" | undefined;
        promptHash?: string | undefined;
        configHash?: string | undefined;
        hardwareIndependent?: boolean | undefined;
        receipt?: Record<string, any> | undefined;
    } | undefined;
}, {
    step: number;
    agent: string;
    axlPeerId?: string | undefined;
    transport?: "axl" | undefined;
    input?: Record<string, any> | undefined;
    output?: Record<string, any> | undefined;
    reeVerification?: {
        model: string;
        receiptHash: string;
        provider?: "gensyn_ree" | undefined;
        verified?: boolean | undefined;
        outputHash?: string | undefined;
        mode?: "default" | "deterministic" | "reproducible" | undefined;
        promptHash?: string | undefined;
        configHash?: string | undefined;
        hardwareIndependent?: boolean | undefined;
        receipt?: Record<string, any> | undefined;
    } | undefined;
}>;
export type AgentTraceEntry = z.infer<typeof AgentTraceEntrySchema>;
export declare const ProofReceiptSchema: z.ZodObject<{
    version: z.ZodString;
    project: z.ZodEnum<["factuam", "ProofLayer"]>;
    experimentId: z.ZodString;
    executionMode: z.ZodOptional<z.ZodEnum<["upload", "connector"]>>;
    queryHash: z.ZodString;
    datasetHash: z.ZodString;
    experimentConfigHash: z.ZodString;
    codeHash: z.ZodOptional<z.ZodString>;
    modelArtifactHash: z.ZodString;
    metricsHash: z.ZodString;
    backtestReportHash: z.ZodString;
    finalAnswerHash: z.ZodString;
    artifactManifestHash: z.ZodString;
    verificationStatus: z.ZodEnum<["verified", "rejected", "warning"]>;
    confidence: z.ZodEnum<["low", "medium", "high"]>;
    createdAt: z.ZodString;
    artifacts: z.ZodObject<{
        datasetUri: z.ZodOptional<z.ZodString>;
        modelUri: z.ZodOptional<z.ZodString>;
        metricsUri: z.ZodOptional<z.ZodString>;
        backtestReportUri: z.ZodOptional<z.ZodString>;
        receiptUri: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        datasetUri?: string | undefined;
        modelUri?: string | undefined;
        metricsUri?: string | undefined;
        backtestReportUri?: string | undefined;
        receiptUri?: string | undefined;
    }, {
        datasetUri?: string | undefined;
        modelUri?: string | undefined;
        metricsUri?: string | undefined;
        backtestReportUri?: string | undefined;
        receiptUri?: string | undefined;
    }>;
    sourceTraces: z.ZodOptional<z.ZodArray<z.ZodObject<{
        provider: z.ZodEnum<["kaggle", "url_csv"]>;
        connectorId: z.ZodString;
        dataset: z.ZodString;
        selectedFile: z.ZodString;
        rawHash: z.ZodString;
        normalizedHash: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        dataset: string;
        provider: "kaggle" | "url_csv";
        connectorId: string;
        selectedFile: string;
        rawHash: string;
        normalizedHash: string;
    }, {
        dataset: string;
        provider: "kaggle" | "url_csv";
        connectorId: string;
        selectedFile: string;
        rawHash: string;
        normalizedHash: string;
    }>, "many">>;
    warnings: z.ZodArray<z.ZodString, "many">;
    computeProof: z.ZodOptional<z.ZodObject<{
        providerAddress: z.ZodString;
        responseId: z.ZodString;
        verified: z.ZodBoolean;
        outputHash: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        verified: boolean;
        providerAddress: string;
        responseId: string;
        outputHash: string;
    }, {
        verified: boolean;
        providerAddress: string;
        responseId: string;
        outputHash: string;
    }>>;
    agentTrace: z.ZodOptional<z.ZodArray<z.ZodObject<{
        step: z.ZodNumber;
        agent: z.ZodString;
        axlPeerId: z.ZodOptional<z.ZodString>;
        transport: z.ZodOptional<z.ZodLiteral<"axl">>;
        input: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        output: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        reeVerification: z.ZodOptional<z.ZodObject<{
            provider: z.ZodDefault<z.ZodLiteral<"gensyn_ree">>;
            model: z.ZodString;
            mode: z.ZodOptional<z.ZodEnum<["default", "deterministic", "reproducible"]>>;
            receiptHash: z.ZodString;
            promptHash: z.ZodOptional<z.ZodString>;
            configHash: z.ZodOptional<z.ZodString>;
            outputHash: z.ZodOptional<z.ZodString>;
            hardwareIndependent: z.ZodOptional<z.ZodBoolean>;
            verified: z.ZodDefault<z.ZodBoolean>;
            receipt: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        }, "strip", z.ZodTypeAny, {
            provider: "gensyn_ree";
            verified: boolean;
            model: string;
            receiptHash: string;
            outputHash?: string | undefined;
            mode?: "default" | "deterministic" | "reproducible" | undefined;
            promptHash?: string | undefined;
            configHash?: string | undefined;
            hardwareIndependent?: boolean | undefined;
            receipt?: Record<string, any> | undefined;
        }, {
            model: string;
            receiptHash: string;
            provider?: "gensyn_ree" | undefined;
            verified?: boolean | undefined;
            outputHash?: string | undefined;
            mode?: "default" | "deterministic" | "reproducible" | undefined;
            promptHash?: string | undefined;
            configHash?: string | undefined;
            hardwareIndependent?: boolean | undefined;
            receipt?: Record<string, any> | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        step: number;
        agent: string;
        axlPeerId?: string | undefined;
        transport?: "axl" | undefined;
        input?: Record<string, any> | undefined;
        output?: Record<string, any> | undefined;
        reeVerification?: {
            provider: "gensyn_ree";
            verified: boolean;
            model: string;
            receiptHash: string;
            outputHash?: string | undefined;
            mode?: "default" | "deterministic" | "reproducible" | undefined;
            promptHash?: string | undefined;
            configHash?: string | undefined;
            hardwareIndependent?: boolean | undefined;
            receipt?: Record<string, any> | undefined;
        } | undefined;
    }, {
        step: number;
        agent: string;
        axlPeerId?: string | undefined;
        transport?: "axl" | undefined;
        input?: Record<string, any> | undefined;
        output?: Record<string, any> | undefined;
        reeVerification?: {
            model: string;
            receiptHash: string;
            provider?: "gensyn_ree" | undefined;
            verified?: boolean | undefined;
            outputHash?: string | undefined;
            mode?: "default" | "deterministic" | "reproducible" | undefined;
            promptHash?: string | undefined;
            configHash?: string | undefined;
            hardwareIndependent?: boolean | undefined;
            receipt?: Record<string, any> | undefined;
        } | undefined;
    }>, "many">>;
    reeVerification: z.ZodOptional<z.ZodObject<{
        provider: z.ZodDefault<z.ZodLiteral<"gensyn_ree">>;
        model: z.ZodString;
        mode: z.ZodOptional<z.ZodEnum<["default", "deterministic", "reproducible"]>>;
        receiptHash: z.ZodString;
        promptHash: z.ZodOptional<z.ZodString>;
        configHash: z.ZodOptional<z.ZodString>;
        outputHash: z.ZodOptional<z.ZodString>;
        hardwareIndependent: z.ZodOptional<z.ZodBoolean>;
        verified: z.ZodDefault<z.ZodBoolean>;
        receipt: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        provider: "gensyn_ree";
        verified: boolean;
        model: string;
        receiptHash: string;
        outputHash?: string | undefined;
        mode?: "default" | "deterministic" | "reproducible" | undefined;
        promptHash?: string | undefined;
        configHash?: string | undefined;
        hardwareIndependent?: boolean | undefined;
        receipt?: Record<string, any> | undefined;
    }, {
        model: string;
        receiptHash: string;
        provider?: "gensyn_ree" | undefined;
        verified?: boolean | undefined;
        outputHash?: string | undefined;
        mode?: "default" | "deterministic" | "reproducible" | undefined;
        promptHash?: string | undefined;
        configHash?: string | undefined;
        hardwareIndependent?: boolean | undefined;
        receipt?: Record<string, any> | undefined;
    }>>;
    chain: z.ZodOptional<z.ZodObject<{
        network: z.ZodOptional<z.ZodString>;
        txHash: z.ZodOptional<z.ZodString>;
        contractAddress: z.ZodOptional<z.ZodString>;
        blockNumber: z.ZodOptional<z.ZodNumber>;
        verifyUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        network?: string | undefined;
        txHash?: string | undefined;
        contractAddress?: string | undefined;
        blockNumber?: number | undefined;
        verifyUrl?: string | undefined;
    }, {
        network?: string | undefined;
        txHash?: string | undefined;
        contractAddress?: string | undefined;
        blockNumber?: number | undefined;
        verifyUrl?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    warnings: string[];
    createdAt: string;
    experimentId: string;
    confidence: "low" | "high" | "medium";
    artifacts: {
        datasetUri?: string | undefined;
        modelUri?: string | undefined;
        metricsUri?: string | undefined;
        backtestReportUri?: string | undefined;
        receiptUri?: string | undefined;
    };
    verificationStatus: "verified" | "rejected" | "warning";
    version: string;
    project: "factuam" | "ProofLayer";
    queryHash: string;
    datasetHash: string;
    experimentConfigHash: string;
    modelArtifactHash: string;
    metricsHash: string;
    backtestReportHash: string;
    finalAnswerHash: string;
    artifactManifestHash: string;
    reeVerification?: {
        provider: "gensyn_ree";
        verified: boolean;
        model: string;
        receiptHash: string;
        outputHash?: string | undefined;
        mode?: "default" | "deterministic" | "reproducible" | undefined;
        promptHash?: string | undefined;
        configHash?: string | undefined;
        hardwareIndependent?: boolean | undefined;
        receipt?: Record<string, any> | undefined;
    } | undefined;
    executionMode?: "upload" | "connector" | undefined;
    codeHash?: string | undefined;
    sourceTraces?: {
        dataset: string;
        provider: "kaggle" | "url_csv";
        connectorId: string;
        selectedFile: string;
        rawHash: string;
        normalizedHash: string;
    }[] | undefined;
    computeProof?: {
        verified: boolean;
        providerAddress: string;
        responseId: string;
        outputHash: string;
    } | undefined;
    agentTrace?: {
        step: number;
        agent: string;
        axlPeerId?: string | undefined;
        transport?: "axl" | undefined;
        input?: Record<string, any> | undefined;
        output?: Record<string, any> | undefined;
        reeVerification?: {
            provider: "gensyn_ree";
            verified: boolean;
            model: string;
            receiptHash: string;
            outputHash?: string | undefined;
            mode?: "default" | "deterministic" | "reproducible" | undefined;
            promptHash?: string | undefined;
            configHash?: string | undefined;
            hardwareIndependent?: boolean | undefined;
            receipt?: Record<string, any> | undefined;
        } | undefined;
    }[] | undefined;
    chain?: {
        network?: string | undefined;
        txHash?: string | undefined;
        contractAddress?: string | undefined;
        blockNumber?: number | undefined;
        verifyUrl?: string | undefined;
    } | undefined;
}, {
    warnings: string[];
    createdAt: string;
    experimentId: string;
    confidence: "low" | "high" | "medium";
    artifacts: {
        datasetUri?: string | undefined;
        modelUri?: string | undefined;
        metricsUri?: string | undefined;
        backtestReportUri?: string | undefined;
        receiptUri?: string | undefined;
    };
    verificationStatus: "verified" | "rejected" | "warning";
    version: string;
    project: "factuam" | "ProofLayer";
    queryHash: string;
    datasetHash: string;
    experimentConfigHash: string;
    modelArtifactHash: string;
    metricsHash: string;
    backtestReportHash: string;
    finalAnswerHash: string;
    artifactManifestHash: string;
    reeVerification?: {
        model: string;
        receiptHash: string;
        provider?: "gensyn_ree" | undefined;
        verified?: boolean | undefined;
        outputHash?: string | undefined;
        mode?: "default" | "deterministic" | "reproducible" | undefined;
        promptHash?: string | undefined;
        configHash?: string | undefined;
        hardwareIndependent?: boolean | undefined;
        receipt?: Record<string, any> | undefined;
    } | undefined;
    executionMode?: "upload" | "connector" | undefined;
    codeHash?: string | undefined;
    sourceTraces?: {
        dataset: string;
        provider: "kaggle" | "url_csv";
        connectorId: string;
        selectedFile: string;
        rawHash: string;
        normalizedHash: string;
    }[] | undefined;
    computeProof?: {
        verified: boolean;
        providerAddress: string;
        responseId: string;
        outputHash: string;
    } | undefined;
    agentTrace?: {
        step: number;
        agent: string;
        axlPeerId?: string | undefined;
        transport?: "axl" | undefined;
        input?: Record<string, any> | undefined;
        output?: Record<string, any> | undefined;
        reeVerification?: {
            model: string;
            receiptHash: string;
            provider?: "gensyn_ree" | undefined;
            verified?: boolean | undefined;
            outputHash?: string | undefined;
            mode?: "default" | "deterministic" | "reproducible" | undefined;
            promptHash?: string | undefined;
            configHash?: string | undefined;
            hardwareIndependent?: boolean | undefined;
            receipt?: Record<string, any> | undefined;
        } | undefined;
    }[] | undefined;
    chain?: {
        network?: string | undefined;
        txHash?: string | undefined;
        contractAddress?: string | undefined;
        blockNumber?: number | undefined;
        verifyUrl?: string | undefined;
    } | undefined;
}>;
export type ProofReceipt = z.infer<typeof ProofReceiptSchema>;
export declare const DatasetSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    sourceType: z.ZodString;
    localPath: z.ZodOptional<z.ZodString>;
    originalFilename: z.ZodOptional<z.ZodString>;
    rowCount: z.ZodOptional<z.ZodNumber>;
    columnCount: z.ZodOptional<z.ZodNumber>;
    schemaJson: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    dataQualityReport: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    datasetHash: z.ZodOptional<z.ZodString>;
    ogStorageUri: z.ZodOptional<z.ZodString>;
    sourceMeta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    connectorId: z.ZodOptional<z.ZodString>;
    connectorRunId: z.ZodOptional<z.ZodString>;
    rawPayloadPath: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: string;
    sourceType: string;
    rowCount?: number | undefined;
    columnCount?: number | undefined;
    localPath?: string | undefined;
    connectorId?: string | undefined;
    sourceMeta?: Record<string, any> | undefined;
    createdAt?: string | undefined;
    datasetHash?: string | undefined;
    userId?: string | undefined;
    originalFilename?: string | undefined;
    schemaJson?: Record<string, any> | undefined;
    dataQualityReport?: Record<string, any> | undefined;
    ogStorageUri?: string | undefined;
    connectorRunId?: string | undefined;
    rawPayloadPath?: string | undefined;
}, {
    name: string;
    id: string;
    sourceType: string;
    rowCount?: number | undefined;
    columnCount?: number | undefined;
    localPath?: string | undefined;
    connectorId?: string | undefined;
    sourceMeta?: Record<string, any> | undefined;
    createdAt?: string | undefined;
    datasetHash?: string | undefined;
    userId?: string | undefined;
    originalFilename?: string | undefined;
    schemaJson?: Record<string, any> | undefined;
    dataQualityReport?: Record<string, any> | undefined;
    ogStorageUri?: string | undefined;
    connectorRunId?: string | undefined;
    rawPayloadPath?: string | undefined;
}>;
export type Dataset = z.infer<typeof DatasetSchema>;
export declare const ExperimentSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodOptional<z.ZodString>;
    datasetId: z.ZodOptional<z.ZodString>;
    query: z.ZodString;
    mode: z.ZodOptional<z.ZodEnum<["upload", "connector"]>>;
    status: z.ZodEnum<["CREATED", "CLASSIFYING", "PLANNING", "WAITING_FOR_DATA", "VALIDATING_DATA", "TRAINING", "BACKTESTING", "VERIFYING", "GENERATING_RECEIPT", "COMPLETED", "FAILED_CLASSIFICATION", "FAILED_PLANNING", "FAILED_DATA_VALIDATION", "FAILED_TRAINING", "FAILED_BACKTESTING", "FAILED_VERIFICATION", "FAILED_AXL_TRANSPORT", "FAILED_RECEIPT_GENERATION", "REJECTED_NO_EVIDENCE_NEEDED", "REJECTED_INSUFFICIENT_DATA", "REJECTED_DATA_LEAKAGE", "REJECTED_MODEL_UNDERPERFORMED", "REJECTED_LOW_CONFIDENCE"]>;
    connectorRequest: z.ZodOptional<z.ZodDiscriminatedUnion<"provider", [z.ZodObject<{
        provider: z.ZodLiteral<"kaggle">;
        params: z.ZodObject<{
            dataset: z.ZodString;
            file: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            dataset: string;
            file?: string | undefined;
        }, {
            dataset: string;
            file?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        params: {
            dataset: string;
            file?: string | undefined;
        };
        provider: "kaggle";
    }, {
        params: {
            dataset: string;
            file?: string | undefined;
        };
        provider: "kaggle";
    }>, z.ZodObject<{
        provider: z.ZodLiteral<"url_csv">;
        params: z.ZodObject<{
            url: z.ZodString;
            fileName: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            url: string;
            fileName?: string | undefined;
        }, {
            url: string;
            fileName?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        params: {
            url: string;
            fileName?: string | undefined;
        };
        provider: "url_csv";
    }, {
        params: {
            url: string;
            fileName?: string | undefined;
        };
        provider: "url_csv";
    }>]>>;
    evidenceRequired: z.ZodOptional<z.ZodBoolean>;
    evidenceType: z.ZodOptional<z.ZodEnum<["none", "retrieval", "simulation", "supervised_prediction", "regression", "classification", "ranking", "forecasting", "backtest", "fine_tuning"]>>;
    riskLevel: z.ZodOptional<z.ZodEnum<["low", "business_decision", "financial", "strategy", "high"]>>;
    experimentPlan: z.ZodOptional<z.ZodObject<{
        objective: z.ZodString;
        taskType: z.ZodEnum<["classification", "regression", "ranking", "forecasting"]>;
        targetColumn: z.ZodString;
        requiredColumns: z.ZodArray<z.ZodString, "many">;
        optionalColumns: z.ZodArray<z.ZodString, "many">;
        candidateModels: z.ZodArray<z.ZodString, "many">;
        baselineMethod: z.ZodString;
        evaluationMetrics: z.ZodArray<z.ZodString, "many">;
        backtestMethod: z.ZodEnum<["random_split", "time_split", "walk_forward", "holdout"]>;
        splitConfig: z.ZodObject<{
            trainSize: z.ZodOptional<z.ZodNumber>;
            testSize: z.ZodOptional<z.ZodNumber>;
            timeColumn: z.ZodOptional<z.ZodString>;
            numberOfFolds: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            trainSize?: number | undefined;
            testSize?: number | undefined;
            timeColumn?: string | undefined;
            numberOfFolds?: number | undefined;
        }, {
            trainSize?: number | undefined;
            testSize?: number | undefined;
            timeColumn?: string | undefined;
            numberOfFolds?: number | undefined;
        }>;
        successCriteria: z.ZodObject<{
            minimumRows: z.ZodNumber;
            minimumLiftOverBaseline: z.ZodNumber;
            minimumMetricValue: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            minimumRows: number;
            minimumLiftOverBaseline: number;
            minimumMetricValue?: number | undefined;
        }, {
            minimumRows: number;
            minimumLiftOverBaseline: number;
            minimumMetricValue?: number | undefined;
        }>;
        limitations: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        objective: string;
        taskType: "regression" | "classification" | "ranking" | "forecasting";
        targetColumn: string;
        requiredColumns: string[];
        optionalColumns: string[];
        candidateModels: string[];
        baselineMethod: string;
        evaluationMetrics: string[];
        backtestMethod: "random_split" | "time_split" | "walk_forward" | "holdout";
        splitConfig: {
            trainSize?: number | undefined;
            testSize?: number | undefined;
            timeColumn?: string | undefined;
            numberOfFolds?: number | undefined;
        };
        successCriteria: {
            minimumRows: number;
            minimumLiftOverBaseline: number;
            minimumMetricValue?: number | undefined;
        };
        limitations: string[];
    }, {
        objective: string;
        taskType: "regression" | "classification" | "ranking" | "forecasting";
        targetColumn: string;
        requiredColumns: string[];
        optionalColumns: string[];
        candidateModels: string[];
        baselineMethod: string;
        evaluationMetrics: string[];
        backtestMethod: "random_split" | "time_split" | "walk_forward" | "holdout";
        splitConfig: {
            trainSize?: number | undefined;
            testSize?: number | undefined;
            timeColumn?: string | undefined;
            numberOfFolds?: number | undefined;
        };
        successCriteria: {
            minimumRows: number;
            minimumLiftOverBaseline: number;
            minimumMetricValue?: number | undefined;
        };
        limitations: string[];
    }>>;
    resultSummary: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    finalAnswer: z.ZodOptional<z.ZodString>;
    confidence: z.ZodOptional<z.ZodEnum<["low", "medium", "high"]>>;
    errorMessage: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "CREATED" | "CLASSIFYING" | "PLANNING" | "WAITING_FOR_DATA" | "VALIDATING_DATA" | "TRAINING" | "BACKTESTING" | "VERIFYING" | "GENERATING_RECEIPT" | "COMPLETED" | "FAILED_CLASSIFICATION" | "FAILED_PLANNING" | "FAILED_DATA_VALIDATION" | "FAILED_TRAINING" | "FAILED_BACKTESTING" | "FAILED_VERIFICATION" | "FAILED_AXL_TRANSPORT" | "FAILED_RECEIPT_GENERATION" | "REJECTED_NO_EVIDENCE_NEEDED" | "REJECTED_INSUFFICIENT_DATA" | "REJECTED_DATA_LEAKAGE" | "REJECTED_MODEL_UNDERPERFORMED" | "REJECTED_LOW_CONFIDENCE";
    id: string;
    createdAt: string;
    updatedAt: string;
    query: string;
    evidenceType?: "none" | "retrieval" | "simulation" | "supervised_prediction" | "regression" | "classification" | "ranking" | "forecasting" | "backtest" | "fine_tuning" | undefined;
    riskLevel?: "low" | "business_decision" | "financial" | "strategy" | "high" | undefined;
    errorMessage?: string | undefined;
    datasetId?: string | undefined;
    confidence?: "low" | "high" | "medium" | undefined;
    mode?: "upload" | "connector" | undefined;
    userId?: string | undefined;
    connectorRequest?: {
        params: {
            dataset: string;
            file?: string | undefined;
        };
        provider: "kaggle";
    } | {
        params: {
            url: string;
            fileName?: string | undefined;
        };
        provider: "url_csv";
    } | undefined;
    evidenceRequired?: boolean | undefined;
    experimentPlan?: {
        objective: string;
        taskType: "regression" | "classification" | "ranking" | "forecasting";
        targetColumn: string;
        requiredColumns: string[];
        optionalColumns: string[];
        candidateModels: string[];
        baselineMethod: string;
        evaluationMetrics: string[];
        backtestMethod: "random_split" | "time_split" | "walk_forward" | "holdout";
        splitConfig: {
            trainSize?: number | undefined;
            testSize?: number | undefined;
            timeColumn?: string | undefined;
            numberOfFolds?: number | undefined;
        };
        successCriteria: {
            minimumRows: number;
            minimumLiftOverBaseline: number;
            minimumMetricValue?: number | undefined;
        };
        limitations: string[];
    } | undefined;
    resultSummary?: Record<string, any> | undefined;
    finalAnswer?: string | undefined;
}, {
    status: "CREATED" | "CLASSIFYING" | "PLANNING" | "WAITING_FOR_DATA" | "VALIDATING_DATA" | "TRAINING" | "BACKTESTING" | "VERIFYING" | "GENERATING_RECEIPT" | "COMPLETED" | "FAILED_CLASSIFICATION" | "FAILED_PLANNING" | "FAILED_DATA_VALIDATION" | "FAILED_TRAINING" | "FAILED_BACKTESTING" | "FAILED_VERIFICATION" | "FAILED_AXL_TRANSPORT" | "FAILED_RECEIPT_GENERATION" | "REJECTED_NO_EVIDENCE_NEEDED" | "REJECTED_INSUFFICIENT_DATA" | "REJECTED_DATA_LEAKAGE" | "REJECTED_MODEL_UNDERPERFORMED" | "REJECTED_LOW_CONFIDENCE";
    id: string;
    createdAt: string;
    updatedAt: string;
    query: string;
    evidenceType?: "none" | "retrieval" | "simulation" | "supervised_prediction" | "regression" | "classification" | "ranking" | "forecasting" | "backtest" | "fine_tuning" | undefined;
    riskLevel?: "low" | "business_decision" | "financial" | "strategy" | "high" | undefined;
    errorMessage?: string | undefined;
    datasetId?: string | undefined;
    confidence?: "low" | "high" | "medium" | undefined;
    mode?: "upload" | "connector" | undefined;
    userId?: string | undefined;
    connectorRequest?: {
        params: {
            dataset: string;
            file?: string | undefined;
        };
        provider: "kaggle";
    } | {
        params: {
            url: string;
            fileName?: string | undefined;
        };
        provider: "url_csv";
    } | undefined;
    evidenceRequired?: boolean | undefined;
    experimentPlan?: {
        objective: string;
        taskType: "regression" | "classification" | "ranking" | "forecasting";
        targetColumn: string;
        requiredColumns: string[];
        optionalColumns: string[];
        candidateModels: string[];
        baselineMethod: string;
        evaluationMetrics: string[];
        backtestMethod: "random_split" | "time_split" | "walk_forward" | "holdout";
        splitConfig: {
            trainSize?: number | undefined;
            testSize?: number | undefined;
            timeColumn?: string | undefined;
            numberOfFolds?: number | undefined;
        };
        successCriteria: {
            minimumRows: number;
            minimumLiftOverBaseline: number;
            minimumMetricValue?: number | undefined;
        };
        limitations: string[];
    } | undefined;
    resultSummary?: Record<string, any> | undefined;
    finalAnswer?: string | undefined;
}>;
export type Experiment = z.infer<typeof ExperimentSchema>;
export declare const ExperimentAttemptSchema: z.ZodObject<{
    id: z.ZodString;
    experimentId: z.ZodString;
    attemptNumber: z.ZodNumber;
    status: z.ZodString;
    strategy: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    planJson: z.ZodNullable<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>>;
    summaryJson: z.ZodNullable<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>>;
    startedAt: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    completedAt: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    createdAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: string;
    id: string;
    experimentId: string;
    attemptNumber: number;
    strategy?: string | null | undefined;
    createdAt?: string | undefined;
    notes?: string | null | undefined;
    planJson?: Record<string, any> | null | undefined;
    summaryJson?: Record<string, any> | null | undefined;
    startedAt?: string | null | undefined;
    completedAt?: string | null | undefined;
}, {
    status: string;
    id: string;
    experimentId: string;
    attemptNumber: number;
    strategy?: string | null | undefined;
    createdAt?: string | undefined;
    notes?: string | null | undefined;
    planJson?: Record<string, any> | null | undefined;
    summaryJson?: Record<string, any> | null | undefined;
    startedAt?: string | null | undefined;
    completedAt?: string | null | undefined;
}>;
export type ExperimentAttempt = z.infer<typeof ExperimentAttemptSchema>;
export declare const ExperimentMessageSchema: z.ZodObject<{
    id: z.ZodString;
    experimentId: z.ZodString;
    role: z.ZodEnum<["user", "agent", "system"]>;
    message: z.ZodString;
    metadata: z.ZodNullable<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>>;
    createdAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    message: string;
    id: string;
    experimentId: string;
    role: "agent" | "user" | "system";
    metadata?: Record<string, any> | null | undefined;
    createdAt?: string | undefined;
}, {
    message: string;
    id: string;
    experimentId: string;
    role: "agent" | "user" | "system";
    metadata?: Record<string, any> | null | undefined;
    createdAt?: string | undefined;
}>;
export type ExperimentMessage = z.infer<typeof ExperimentMessageSchema>;
export declare const DatasetDiagnosisSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    experimentId: z.ZodOptional<z.ZodString>;
    summary: z.ZodString;
    targetColumn: z.ZodString;
    targetKind: z.ZodEnum<["numeric", "categorical", "datetime", "text", "unknown"]>;
    targetQuality: z.ZodDefault<z.ZodEnum<["clean", "coerced", "sparse", "ambiguous", "invalid"]>>;
    taskTypeFit: z.ZodDefault<z.ZodEnum<["strong", "moderate", "weak"]>>;
    rowCount: z.ZodNumber;
    columnCount: z.ZodNumber;
    highMissingColumns: z.ZodArray<z.ZodString, "many">;
    highCardinalityColumns: z.ZodArray<z.ZodString, "many">;
    textColumns: z.ZodArray<z.ZodString, "many">;
    datetimeColumns: z.ZodArray<z.ZodString, "many">;
    leakageRisks: z.ZodArray<z.ZodString, "many">;
    splitRisks: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    identifierLikeColumns: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    likelyUsefulColumns: z.ZodArray<z.ZodString, "many">;
    likelyHarmfulColumns: z.ZodArray<z.ZodString, "many">;
    textStrategy: z.ZodDefault<z.ZodEnum<["exclude", "meta_only", "featureize", "review"]>>;
    targetQualityNotes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    recommendedActions: z.ZodArray<z.ZodString, "many">;
    createdAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    targetColumn: string;
    rowCount: number;
    columnCount: number;
    summary: string;
    targetKind: "unknown" | "numeric" | "categorical" | "datetime" | "text";
    targetQuality: "clean" | "coerced" | "sparse" | "ambiguous" | "invalid";
    taskTypeFit: "strong" | "moderate" | "weak";
    highMissingColumns: string[];
    highCardinalityColumns: string[];
    textColumns: string[];
    datetimeColumns: string[];
    leakageRisks: string[];
    splitRisks: string[];
    identifierLikeColumns: string[];
    likelyUsefulColumns: string[];
    likelyHarmfulColumns: string[];
    textStrategy: "exclude" | "meta_only" | "featureize" | "review";
    targetQualityNotes: string[];
    recommendedActions: string[];
    id?: string | undefined;
    createdAt?: string | undefined;
    experimentId?: string | undefined;
}, {
    targetColumn: string;
    rowCount: number;
    columnCount: number;
    summary: string;
    targetKind: "unknown" | "numeric" | "categorical" | "datetime" | "text";
    highMissingColumns: string[];
    highCardinalityColumns: string[];
    textColumns: string[];
    datetimeColumns: string[];
    leakageRisks: string[];
    likelyUsefulColumns: string[];
    likelyHarmfulColumns: string[];
    recommendedActions: string[];
    id?: string | undefined;
    createdAt?: string | undefined;
    experimentId?: string | undefined;
    targetQuality?: "clean" | "coerced" | "sparse" | "ambiguous" | "invalid" | undefined;
    taskTypeFit?: "strong" | "moderate" | "weak" | undefined;
    splitRisks?: string[] | undefined;
    identifierLikeColumns?: string[] | undefined;
    textStrategy?: "exclude" | "meta_only" | "featureize" | "review" | undefined;
    targetQualityNotes?: string[] | undefined;
}>;
export type DatasetDiagnosis = z.infer<typeof DatasetDiagnosisSchema>;
export declare const AttemptReflectionSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    experimentId: z.ZodOptional<z.ZodString>;
    attemptId: z.ZodString;
    verdict: z.ZodEnum<["success", "weak_success", "failed"]>;
    failureCategory: z.ZodOptional<z.ZodEnum<["schema_failure", "target_failure", "split_failure", "preprocessing_failure", "model_fit_failure", "metric_failure", "verification_failure", "infra_failure"]>>;
    summary: z.ZodString;
    failures: z.ZodArray<z.ZodString, "many">;
    improvements: z.ZodArray<z.ZodString, "many">;
    nextActions: z.ZodArray<z.ZodString, "many">;
    createdAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    summary: string;
    attemptId: string;
    verdict: "failed" | "success" | "weak_success";
    failures: string[];
    improvements: string[];
    nextActions: string[];
    id?: string | undefined;
    createdAt?: string | undefined;
    experimentId?: string | undefined;
    failureCategory?: "schema_failure" | "target_failure" | "split_failure" | "preprocessing_failure" | "model_fit_failure" | "metric_failure" | "verification_failure" | "infra_failure" | undefined;
}, {
    summary: string;
    attemptId: string;
    verdict: "failed" | "success" | "weak_success";
    failures: string[];
    improvements: string[];
    nextActions: string[];
    id?: string | undefined;
    createdAt?: string | undefined;
    experimentId?: string | undefined;
    failureCategory?: "schema_failure" | "target_failure" | "split_failure" | "preprocessing_failure" | "model_fit_failure" | "metric_failure" | "verification_failure" | "infra_failure" | undefined;
}>;
export type AttemptReflection = z.infer<typeof AttemptReflectionSchema>;
export declare const StrategyDecisionSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    experimentId: z.ZodOptional<z.ZodString>;
    attemptNumber: z.ZodNumber;
    strategyKey: z.ZodString;
    rationale: z.ZodString;
    changes: z.ZodArray<z.ZodString, "many">;
    stopAfterAttempt: z.ZodDefault<z.ZodBoolean>;
    createdAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    attemptNumber: number;
    strategyKey: string;
    rationale: string;
    changes: string[];
    stopAfterAttempt: boolean;
    id?: string | undefined;
    createdAt?: string | undefined;
    experimentId?: string | undefined;
}, {
    attemptNumber: number;
    strategyKey: string;
    rationale: string;
    changes: string[];
    id?: string | undefined;
    createdAt?: string | undefined;
    experimentId?: string | undefined;
    stopAfterAttempt?: boolean | undefined;
}>;
export type StrategyDecision = z.infer<typeof StrategyDecisionSchema>;
export declare const CreateExperimentInputSchema: z.ZodObject<{
    query: z.ZodString;
    mode: z.ZodDefault<z.ZodEnum<["upload", "connector"]>>;
    datasetId: z.ZodOptional<z.ZodString>;
    connectorRequest: z.ZodOptional<z.ZodDiscriminatedUnion<"provider", [z.ZodObject<{
        provider: z.ZodLiteral<"kaggle">;
        params: z.ZodObject<{
            dataset: z.ZodString;
            file: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            dataset: string;
            file?: string | undefined;
        }, {
            dataset: string;
            file?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        params: {
            dataset: string;
            file?: string | undefined;
        };
        provider: "kaggle";
    }, {
        params: {
            dataset: string;
            file?: string | undefined;
        };
        provider: "kaggle";
    }>, z.ZodObject<{
        provider: z.ZodLiteral<"url_csv">;
        params: z.ZodObject<{
            url: z.ZodString;
            fileName: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            url: string;
            fileName?: string | undefined;
        }, {
            url: string;
            fileName?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        params: {
            url: string;
            fileName?: string | undefined;
        };
        provider: "url_csv";
    }, {
        params: {
            url: string;
            fileName?: string | undefined;
        };
        provider: "url_csv";
    }>]>>;
}, "strip", z.ZodTypeAny, {
    mode: "upload" | "connector";
    query: string;
    datasetId?: string | undefined;
    connectorRequest?: {
        params: {
            dataset: string;
            file?: string | undefined;
        };
        provider: "kaggle";
    } | {
        params: {
            url: string;
            fileName?: string | undefined;
        };
        provider: "url_csv";
    } | undefined;
}, {
    query: string;
    datasetId?: string | undefined;
    mode?: "upload" | "connector" | undefined;
    connectorRequest?: {
        params: {
            dataset: string;
            file?: string | undefined;
        };
        provider: "kaggle";
    } | {
        params: {
            url: string;
            fileName?: string | undefined;
        };
        provider: "url_csv";
    } | undefined;
}>;
export type CreateExperimentInput = z.infer<typeof CreateExperimentInputSchema>;
export declare const UploadDatasetResponseSchema: z.ZodObject<{
    datasetId: z.ZodString;
    name: z.ZodString;
    rowCount: z.ZodNumber;
    columnCount: z.ZodNumber;
    status: z.ZodEnum<["uploaded", "stored_locally"]>;
    ogStorageUri: z.ZodOptional<z.ZodString>;
    warning: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "uploaded" | "stored_locally";
    rowCount: number;
    columnCount: number;
    name: string;
    datasetId: string;
    warning?: string | undefined;
    ogStorageUri?: string | undefined;
}, {
    status: "uploaded" | "stored_locally";
    rowCount: number;
    columnCount: number;
    name: string;
    datasetId: string;
    warning?: string | undefined;
    ogStorageUri?: string | undefined;
}>;
export type UploadDatasetResponse = z.infer<typeof UploadDatasetResponseSchema>;
//# sourceMappingURL=index.d.ts.map