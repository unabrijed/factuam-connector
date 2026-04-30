import type {
  AttemptReflection,
  DataQualityReport,
  DatasetDiagnosis,
  EvidenceClassifierResult,
  ExperimentPlan,
  ReeVerification,
  VerifierResult
} from "@factum/shared-types";

export type MessageType =
  | "classify_request"
  | "classify_result"
  | "plan_request"
  | "plan_result"
  | "validate_request"
  | "validate_result"
  | "diagnosis_request"
  | "diagnosis_result"
  | "strategy_request"
  | "strategy_result"
  | "training_request"
  | "training_result"
  | "reflection_request"
  | "reflection_result"
  | "verify_request"
  | "verify_result"
  | "answer_request"
  | "answer_result";

export interface AxlEnvelope {
  type: MessageType;
  experiment_id: string;
  attempt_id?: string;
  sent_at: string;
  sender_peer: string;
  reply_to_peer: string;
}

export interface AttemptSummary {
  attempt_number: number;
  strategy: string;
  status: "success" | "failed";
  primary_metric?: number;
  baseline_metric?: number;
  model?: string;
  overfit_gap?: number;
  significant?: boolean;
  error?: string;
}

export interface ClassifyRequest extends AxlEnvelope {
  type: "classify_request";
  prompt: string;
  dataset_schema?: unknown;
}
export type ClassifyResult = AxlEnvelope &
  EvidenceClassifierResult & {
    type: "classify_result";
    domain?: string;
    task_type?: string;
    preferred_connectors?: string[];
    confidence_score?: number;
  };

export interface PlanRequest extends AxlEnvelope {
  type: "plan_request";
  prompt: string;
  domain?: string;
  task_type?: string;
  dataset_summary?: unknown;
  user_guidance?: string[];
}
export interface PlanResult extends AxlEnvelope {
  type: "plan_result";
  plan: ExperimentPlan;
}

export interface ValidateRequest extends AxlEnvelope {
  type: "validate_request";
  connector_id?: string;
  dataset: {
    source: "local_path" | "upload" | "kaggle" | "binance" | "yahoo" | "connector";
    path?: string;
    ref?: string;
    params?: Record<string, unknown>;
  };
  expected_schema: {
    columns: string[];
    min_rows: number;
    max_nan_rate?: number;
  };
  plan: ExperimentPlan;
}

export interface ValidateResult extends AxlEnvelope {
  type: "validate_result";
  passed: boolean;
  validation_peer: string;
  validated_at: string;
  data_hash?: string;
  feature_hash?: string;
  rows?: number;
  columns_present?: boolean;
  nan_rate?: number;
  temporal_continuity?: boolean;
  leakage_risk?: "none" | "low" | "high";
  warnings?: string[];
  failure_reason?: "insufficient_rows" | "missing_columns" | "nan_rate_exceeded" | "schema_mismatch" | "fetch_failed";
  error?: string;
  report?: DataQualityReport;
}

export interface DiagnosisRequest extends AxlEnvelope {
  type: "diagnosis_request";
  plan: ExperimentPlan;
  validation: unknown;
  dataset_summary?: unknown;
}
export interface DiagnosisResult extends AxlEnvelope {
  type: "diagnosis_result";
  diagnosis: DatasetDiagnosis;
}

export interface StrategyRequest extends AxlEnvelope {
  type: "strategy_request";
  attempt_number: number;
  plan: ExperimentPlan;
  diagnosis: DatasetDiagnosis;
  previous_attempts: AttemptSummary[];
  user_guidance?: string[];
}
export interface StrategyResult extends AxlEnvelope {
  type: "strategy_result";
  strategy_key: string;
  rationale: string;
  notes: string;
  plan: ExperimentPlan;
}

export interface TrainingRequest extends AxlEnvelope {
  type: "training_request";
  attempt_number: number;
  dataset: {
    datasetId: string;
    datasetPath: string;
  };
  plan: ExperimentPlan;
  strategy: StrategyResult | Record<string, unknown>;
  validation?: ValidateResult;
  previous_attempts?: AttemptSummary[];
}

export interface TrainingResult extends AxlEnvelope {
  type: "training_result";
  attempt_number: number;
  status: "success" | "failed" | "insufficient_data" | "timeout";
  result?: unknown;
  error?: string;
  failure_reason?: string;
}

export interface ReflectionRequest extends AxlEnvelope {
  type: "reflection_request";
  plan: ExperimentPlan;
  attempt_id: string;
  attempt_summary: AttemptSummary;
  success: boolean;
}
export interface ReflectionResult extends AxlEnvelope {
  type: "reflection_result";
  reflection: AttemptReflection;
}

export interface VerifyRequest extends AxlEnvelope {
  type: "verify_request";
  payload: unknown;
}
export interface VerifyResult extends AxlEnvelope {
  type: "verify_result";
  verification: VerifierResult;
  reeVerification?: ReeVerification;
}

export interface AnswerRequest extends AxlEnvelope {
  type: "answer_request";
  payload: unknown;
}
export interface AnswerResult extends AxlEnvelope {
  type: "answer_result";
  finalAnswer: string;
  resultSummary: Record<string, unknown>;
}
