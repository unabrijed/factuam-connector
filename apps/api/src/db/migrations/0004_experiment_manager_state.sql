CREATE TABLE IF NOT EXISTS experiment_diagnoses (
  id uuid PRIMARY KEY,
  experiment_id uuid NOT NULL REFERENCES experiments(id),
  diagnosis_json jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS experiment_reflections (
  id uuid PRIMARY KEY,
  experiment_id uuid NOT NULL REFERENCES experiments(id),
  attempt_id uuid NOT NULL REFERENCES experiment_attempts(id),
  reflection_json jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS strategy_decisions (
  id uuid PRIMARY KEY,
  experiment_id uuid NOT NULL REFERENCES experiments(id),
  attempt_number integer NOT NULL,
  decision_json jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);
