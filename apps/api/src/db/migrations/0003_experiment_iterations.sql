CREATE TABLE IF NOT EXISTS experiment_attempts (
  id uuid PRIMARY KEY,
  experiment_id uuid NOT NULL REFERENCES experiments(id),
  attempt_number integer NOT NULL,
  status text NOT NULL,
  strategy text,
  notes text,
  plan_json jsonb,
  summary_json jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS experiment_messages (
  id uuid PRIMARY KEY,
  experiment_id uuid NOT NULL REFERENCES experiments(id),
  role text NOT NULL,
  message text NOT NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE model_runs ADD COLUMN IF NOT EXISTS attempt_id uuid REFERENCES experiment_attempts(id);
ALTER TABLE backtest_reports ADD COLUMN IF NOT EXISTS attempt_id uuid REFERENCES experiment_attempts(id);
