ALTER TABLE datasets ADD COLUMN IF NOT EXISTS source_meta jsonb;
ALTER TABLE datasets ADD COLUMN IF NOT EXISTS connector_id text;
ALTER TABLE datasets ADD COLUMN IF NOT EXISTS connector_run_id uuid;
ALTER TABLE datasets ADD COLUMN IF NOT EXISTS raw_payload_path text;

ALTER TABLE experiments ADD COLUMN IF NOT EXISTS mode text;
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS connector_request jsonb;

CREATE TABLE IF NOT EXISTS connector_runs (
  id uuid PRIMARY KEY,
  provider text NOT NULL,
  connector_id text NOT NULL,
  status text NOT NULL,
  request_json jsonb,
  source_meta jsonb,
  raw_hash text,
  normalized_hash text,
  error_message text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
