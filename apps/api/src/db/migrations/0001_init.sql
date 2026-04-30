CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  wallet_address text UNIQUE,
  email text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS datasets (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users(id),
  name text NOT NULL,
  source_type text NOT NULL,
  local_path text,
  original_filename text,
  row_count integer,
  column_count integer,
  schema_json jsonb,
  data_quality_report jsonb,
  dataset_hash text,
  og_storage_uri text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS experiments (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users(id),
  dataset_id uuid REFERENCES datasets(id),
  query text NOT NULL,
  status text NOT NULL,
  evidence_required boolean,
  evidence_type text,
  risk_level text,
  experiment_plan jsonb,
  result_summary jsonb,
  final_answer text,
  confidence text,
  error_message text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS model_runs (
  id uuid PRIMARY KEY,
  experiment_id uuid NOT NULL REFERENCES experiments(id),
  model_name text NOT NULL,
  model_type text NOT NULL,
  target_column text,
  feature_columns jsonb,
  metrics jsonb,
  artifact_hash text,
  artifact_uri text,
  status text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS backtest_reports (
  id uuid PRIMARY KEY,
  experiment_id uuid NOT NULL REFERENCES experiments(id),
  backtest_type text,
  baseline_name text,
  baseline_metrics jsonb,
  best_model_id uuid REFERENCES model_runs(id),
  model_metrics jsonb,
  lift_over_baseline numeric(10,4),
  report_json jsonb,
  report_hash text,
  report_uri text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS proof_receipts (
  id uuid PRIMARY KEY,
  experiment_id uuid NOT NULL REFERENCES experiments(id),
  receipt_json jsonb NOT NULL,
  receipt_hash text NOT NULL,
  dataset_hash text,
  model_hash text,
  config_hash text,
  metrics_hash text,
  backtest_hash text,
  final_answer_hash text,
  verification_status text,
  og_storage_uri text,
  onchain_tx_hash text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS artifacts (
  id uuid PRIMARY KEY,
  experiment_id uuid NOT NULL REFERENCES experiments(id),
  artifact_type text NOT NULL,
  name text NOT NULL,
  local_path text,
  content_hash text,
  og_storage_uri text,
  created_at timestamptz DEFAULT now() NOT NULL
);
