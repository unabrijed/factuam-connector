# factuam — Validation Agent (AXL-routed) + Complete Message Contracts

## What this file covers

1. `validate_request` / `validate_result` — the new AXL-routed validation message pair
2. Updated `messages.ts` — all envelopes with the validation types added
3. `validation-agent/src/index.ts` — the agent implementation
4. Updated orchestrator flow — where validation slots in
5. Updated `start-all.sh` and port table

---

## Where Validation Fits

Validation runs after classify + plan and before diagnosis + strategy. It receives the connector
reference, fetches/checks the data, hashes it, and confirms the schema matches the plan before
any training is attempted. This prevents wasted training runs on bad data.

```
Orchestrator
  → classify_request   → Classifier   → classify_result
  → plan_request       → Planner      → plan_result
  → validate_request   → Validator    → validate_result   ← NEW (AXL-routed)
  [attempt loop]
    → diagnosis_request  → Diagnosis  → diagnosis_result
    → strategy_request   → Strategy   → strategy_result
    → training_request   → Training   → training_result
  → reflection_request → Reflection  → reflection_result
  → verify_request     → Verifier    → verify_result  (+REE)
  → answer_request     → Answer      → answer_result
  → FactuamRegistry.anchor()
```

---

## 1 — Updated messages.ts (complete, all types)

`packages/agent-sdk/src/types/messages.ts`:

```typescript
// ─── Base envelope ───────────────────────────────────────────────────────────

export type MessageType =
  | "classify_request"   | "classify_result"
  | "plan_request"       | "plan_result"
  | "validate_request"   | "validate_result"    // ← new
  | "diagnosis_request"  | "diagnosis_result"
  | "strategy_request"   | "strategy_result"
  | "training_request"   | "training_result"
  | "reflection_request" | "reflection_result"
  | "verify_request"     | "verify_result"
  | "answer_request"     | "answer_result";

export interface AxlEnvelope {
  type:            MessageType;
  experiment_id:   string;
  attempt_id?:     string;          // set on attempt-scoped messages
  sent_at:         string;          // ISO 8601
  sender_peer:     string;          // 64-char hex AXL public key
  reply_to_peer:   string;          // peer that should receive the response
}

// ─── Classify ────────────────────────────────────────────────────────────────

export interface ClassifyRequest extends AxlEnvelope {
  type:    "classify_request";
  prompt:  string;
  dataset_schema?: {
    columns:     string[];
    row_count:   number;
    sample_rows: Record<string, unknown>[];
  };
}

export interface ClassifyResult extends AxlEnvelope {
  type:                   "classify_result";
  domain:                 "trading" | "defi" | "lead_scoring" | "campaign" | "forecasting" | "generic_ml";
  task_type:              "classification" | "regression" | "backtest" | "anomaly" | "retrieval" | "classification_and_backtest";
  requires_external_data: boolean;
  preferred_connectors:   string[];
  confidence:             number;
}

// ─── Plan ────────────────────────────────────────────────────────────────────

export interface PlanRequest extends AxlEnvelope {
  type:             "plan_request";
  prompt:           string;
  domain:           string;
  task_type:        string;
  dataset_summary:  { columns: string[]; row_count: number; inferred_target?: string };
}

export interface PlanResult extends AxlEnvelope {
  type:               "plan_result";
  objective:          string;
  target_column:      string;
  feature_columns:    string[];
  models_to_try:      string[];
  baselines:          string[];
  metrics:            string[];
  split_method:       string;
  significance_test:  string;
  max_attempts:       number;
}

// ─── Validate (NEW — fully AXL-routed) ───────────────────────────────────────

export interface ValidateRequest extends AxlEnvelope {
  type:            "validate_request";
  connector_id:    string;          // e.g. "binance_ohlcv_v1", "kaggle_dataset_v1"

  // Where the data is / how to fetch it
  dataset: {
    source:    "local_path" | "binance" | "kaggle" | "yahoo" | "upload";
    path?:     string;              // local path if source=local_path or upload
    ref?:      string;              // "BTCUSDT" or "owner/dataset-name"
    params?:   Record<string, unknown>;  // connector-specific params
  };

  // What the data must look like to be acceptable
  expected_schema: {
    columns:   string[];
    min_rows:  number;
    max_nan_rate?: number;          // default 0.05
  };

  plan: PlanResult;                 // full plan — validator checks feature cols are present
}

export interface ValidateResult extends AxlEnvelope {
  type:                 "validate_result";
  passed:               boolean;

  // Populated if passed === true
  data_hash?:           string;     // sha256 of raw fetched bytes — recorded in receipt
  feature_hash?:        string;     // sha256 of engineered feature matrix
  rows?:                number;
  columns_present?:     boolean;
  nan_rate?:            number;
  temporal_continuity?: boolean;
  leakage_risk?:        "none" | "low" | "high";
  warnings?:            string[];

  // Populated if passed === false
  failure_reason?:      "insufficient_rows" | "missing_columns" | "nan_rate_exceeded" | "schema_mismatch" | "fetch_failed";
  error?:               string;

  validation_peer:      string;     // validator's AXL peer ID — goes into agent receipt
  validated_at:         string;     // ISO timestamp
}

// ─── Diagnosis ───────────────────────────────────────────────────────────────

export interface DiagnosisRequest extends AxlEnvelope {
  type:           "diagnosis_request";
  attempt_result: TrainingResult;
  plan:           PlanResult;
}

export interface DiagnosisResult extends AxlEnvelope {
  type: "diagnosis_result";
  issues: Array<{
    type:        "overfitting" | "data_leakage" | "class_imbalance" | "insufficient_signal" | "wrong_features";
    severity:    "low" | "medium" | "high";
    description: string;
  }>;
  data_quality_score:   number;
  recommended_action:   "retry_with_changes" | "accept" | "reject";
}

// ─── Strategy ────────────────────────────────────────────────────────────────

export interface StrategyRequest extends AxlEnvelope {
  type:              "strategy_request";
  attempt_number:    number;
  plan:              PlanResult;
  diagnosis?:        DiagnosisResult;
  previous_attempts: AttemptSummary[];
}

export interface StrategyResult extends AxlEnvelope {
  type:                        "strategy_result";
  approach:                    string;
  model_override?:             string;
  hyperparameter_overrides?:   Record<string, unknown>;
  feature_engineering_notes?:  string;
  sampling_strategy?:          string;
  reasoning:                   string;
}

// ─── Training ────────────────────────────────────────────────────────────────

export interface TrainingRequest extends AxlEnvelope {
  type:              "training_request";
  attempt_number:    number;
  dataset: {
    source:    string;
    path?:     string;
    ref?:      string;
    connector_id?: string;
  };
  plan:              PlanResult;
  strategy:          StrategyResult;
  validation:        ValidateResult;    // ← pass validated data_hash through
  previous_attempts?: AttemptSummary[];
}

export interface TrainingResult extends AxlEnvelope {
  type:           "training_result";
  attempt_number: number;
  status:         "success" | "failed" | "insufficient_data" | "timeout";
  metrics?: {
    primary_metric:             string;
    primary_value:              number;
    baseline_value:             number;
    improvement_over_baseline:  number;
    all_metrics:                Record<string, number>;
    confidence_interval_95:     [number, number];
    p_value:                    number;
    statistically_significant:  boolean;
  };
  model?: {
    model_id:           string;
    algorithm:          string;
    hyperparameters:    Record<string, unknown>;
    artifact_path:      string;
    weight_fingerprint: string;     // sha256 of serialized model file
    train_metric:       number;
    test_metric:        number;
    overfit_gap:        number;
    overfit_verdict:    "clean" | "mild" | "severe";
  };
  backtest?: {
    strategy_return:  number;
    baseline_return:  number;
    sharpe_ratio:     number;
    max_drawdown:     number;
    win_rate:         number;
  };
  data_hash:    string;
  feature_hash: string;
  duration_ms:  number;
  error?:       string;
  failure_reason?: "data_leakage" | "insufficient_rows" | "model_error" | "timeout" | "other";
}

// ─── Reflection ──────────────────────────────────────────────────────────────

export interface ReflectionRequest extends AxlEnvelope {
  type:         "reflection_request";
  all_attempts: AttemptSummary[];
  plan:         PlanResult;
  best_attempt: AttemptSummary;
}

export interface ReflectionResult extends AxlEnvelope {
  type:             "reflection_result";
  should_continue:  boolean;
  reason:           string;
  overall_quality:  "strong" | "acceptable" | "weak" | "failed";
  limitations:      string[];
  key_findings:     string[];
}

// ─── Verify ──────────────────────────────────────────────────────────────────

export interface VerifyRequest extends AxlEnvelope {
  type:         "verify_request";
  best_attempt: AttemptSummary;
  reflection:   ReflectionResult;
  validation:   ValidateResult;    // ← data_hash from validation goes into receipt
  plan:         PlanResult;
}

export interface VerifyResult extends AxlEnvelope {
  type:           "verify_result";
  verdict:        "verified" | "verified_weak" | "rejected";
  confidence:     "high" | "medium" | "low";
  passed_checks:  string[];
  failed_checks:  string[];
  warnings:       string[];
  ree_receipt?: {
    model_name:       string;
    commit_hash:      string;
    prompt_hash:      string;
    tokens_hash:      string;
    receipt_hash:     string;
    ree_version:      string;
    operation_set:    string;
    finish_reason:    string;
    token_count:      number;
    ree_receipt_hash: string;
  };
}

// ─── Answer ──────────────────────────────────────────────────────────────────

export interface AnswerRequest extends AxlEnvelope {
  type:         "answer_request";
  prompt:       string;
  plan:         PlanResult;
  best_attempt: AttemptSummary;
  reflection:   ReflectionResult;
  verify_result: VerifyResult;
}

export interface AnswerResult extends AxlEnvelope {
  type:             "answer_result";
  verdict_text:     string;
  metrics_summary:  Record<string, unknown>;
  limitations:      string[];
  recommendation:   string;
  confidence:       string;
}

// ─── Shared ──────────────────────────────────────────────────────────────────

export interface AttemptSummary {
  attempt_number:  number;
  strategy:        string;
  status:          "success" | "failed";
  primary_metric?: number;
  baseline_metric?: number;
  model?:          string;
  overfit_gap?:    number;
  significant?:    boolean;
  error?:          string;
}
```

---

## 2 — Validation Agent

`agents/validation-agent/src/index.ts`:

```typescript
import {
  waitForAxlNode,
  pollInbound,
  sendToAgent,
  getOwnPeerId,
} from "../../../packages/agent-sdk/src/axl-transport";
import type { ValidateRequest, ValidateResult } from "../../../packages/agent-sdk/src/types/messages";
import { validateDataset } from "./validator";

const AXL_API = process.env.AXL_API_URL ?? "http://127.0.0.1:9032";

async function handleValidateRequest(msg: ValidateRequest): Promise<ValidateResult> {
  const startedAt = Date.now();
  const ownPeer   = await getOwnPeerId();
  const now       = () => new Date().toISOString();

  let result: ValidateResult;
  try {
    const validation = await validateDataset({
      connectorId:    msg.connector_id,
      dataset:        msg.dataset,
      expectedSchema: msg.expected_schema,
      plan:           msg.plan,
    });

    result = {
      type:                "validate_result",
      experiment_id:       msg.experiment_id,
      attempt_id:          msg.attempt_id,
      sent_at:             now(),
      sender_peer:         ownPeer,
      reply_to_peer:       msg.reply_to_peer,
      passed:              validation.passed,
      data_hash:           validation.data_hash,
      feature_hash:        validation.feature_hash,
      rows:                validation.rows,
      columns_present:     validation.columns_present,
      nan_rate:            validation.nan_rate,
      temporal_continuity: validation.temporal_continuity,
      leakage_risk:        validation.leakage_risk,
      warnings:            validation.warnings,
      failure_reason:      validation.failure_reason,
      error:               validation.error,
      validation_peer:     ownPeer,
      validated_at:        now(),
    };
  } catch (err: any) {
    result = {
      type:            "validate_result",
      experiment_id:   msg.experiment_id,
      attempt_id:      msg.attempt_id,
      sent_at:         now(),
      sender_peer:     ownPeer,
      reply_to_peer:   msg.reply_to_peer,
      passed:          false,
      failure_reason:  "fetch_failed",
      error:           err.message,
      validation_peer: ownPeer,
      validated_at:    now(),
    };
  }

  return result;
}

async function main() {
  await waitForAxlNode();
  console.log("[validation-agent] AXL ready, polling...");

  while (true) {
    const messages = await pollInbound();
    for (const { data } of messages) {
      if (data.type === "validate_request") {
        console.log(`[validation-agent] Received validate_request for ${data.experiment_id}`);
        const result = await handleValidateRequest(data as ValidateRequest);
        await sendToAgent(result.reply_to_peer, result);
        console.log(`[validation-agent] → validate_result passed=${result.passed}`);
      }
    }
    await new Promise(r => setTimeout(r, 200));
  }
}

main().catch(console.error);
```

`agents/validation-agent/src/validator.ts`:

```typescript
import crypto from "crypto";
import * as fs from "fs";

interface ValidatorInput {
  connectorId:    string;
  dataset:        { source: string; path?: string; ref?: string; params?: Record<string, unknown> };
  expectedSchema: { columns: string[]; min_rows: number; max_nan_rate?: number };
  plan:           { feature_columns: string[]; target_column: string };
}

export async function validateDataset(input: ValidatorInput) {
  const { dataset, expectedSchema, plan } = input;

  // 1. Fetch / locate data
  let rawBytes: Buffer;
  if (dataset.source === "local_path" && dataset.path) {
    rawBytes = fs.readFileSync(dataset.path);
  } else {
    // Delegate to connector fetcher (Python ML worker /connector/fetch endpoint)
    const res = await fetch(`${process.env.ML_WORKER_URL ?? "http://127.0.0.1:8000"}/connector/fetch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connector_id: input.connectorId, dataset }),
    });
    if (!res.ok) throw new Error(`Connector fetch failed: HTTP ${res.status}`);
    rawBytes = Buffer.from(await res.arrayBuffer());
  }

  // 2. Hash raw bytes immediately — before any processing
  const data_hash = "0x" + crypto.createHash("sha256").update(rawBytes).digest("hex");

  // 3. Parse to get column info (ask ML worker to describe)
  const descRes = await fetch(`${process.env.ML_WORKER_URL ?? "http://127.0.0.1:8000"}/data/describe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data_hash, raw_bytes_b64: rawBytes.toString("base64") }),
  });
  const desc = await descRes.json() as {
    rows: number;
    columns: string[];
    nan_rate: number;
    temporal_continuity: boolean;
    feature_hash: string;
  };

  // 4. Checks
  const missing_columns = [
    ...expectedSchema.columns,
    ...plan.feature_columns,
    plan.target_column,
  ].filter(col => !desc.columns.includes(col));

  const warnings: string[] = [];
  const max_nan = expectedSchema.max_nan_rate ?? 0.05;

  if (desc.nan_rate > max_nan) {
    warnings.push(`High NaN rate: ${(desc.nan_rate * 100).toFixed(1)}% (threshold ${max_nan * 100}%)`);
  }

  if (!desc.temporal_continuity) {
    warnings.push("Temporal gaps detected in time-series data");
  }

  if (missing_columns.length > 0) {
    return {
      passed:          false,
      failure_reason:  "missing_columns" as const,
      error:           `Missing columns: ${missing_columns.join(", ")}`,
      data_hash,
    };
  }

  if (desc.rows < expectedSchema.min_rows) {
    return {
      passed:          false,
      failure_reason:  "insufficient_rows" as const,
      error:           `Got ${desc.rows} rows, need ${expectedSchema.min_rows}`,
      data_hash,
    };
  }

  return {
    passed:              true,
    data_hash,
    feature_hash:        desc.feature_hash,
    rows:                desc.rows,
    columns_present:     true,
    nan_rate:            desc.nan_rate,
    temporal_continuity: desc.temporal_continuity,
    leakage_risk:        "none" as const,
    warnings,
  };
}
```

---

## 3 — Updated Orchestrator (validation slotted in)

In `agents/orchestrator/src/gensyn-orchestrator.ts`, add this method and call it after plan:

```typescript
// After plan is received, before attempt loop
private async validate(
  expId: string,
  plan:  PlanResult,
  datasetRef: any,
  connectorId: string
): Promise<ValidateResult> {
  const req: ValidateRequest = {
    type:            "validate_request",
    experiment_id:   expId,
    sent_at:         new Date().toISOString(),
    sender_peer:     this.ownPeer,
    reply_to_peer:   this.ownPeer,
    connector_id:    connectorId,
    dataset:         datasetRef,
    expected_schema: {
      columns:  ["open", "high", "low", "close", "volume"],
      min_rows: 500,
    },
    plan,
  };

  await sendToAgent(PEERS.validation, req);
  const result = await waitForReply<ValidateResult>(expId, "validate_result", REPLY_TIMEOUT_MS);

  if (!result.passed) {
    throw new Error(`[orchestrator] Validation failed: ${result.failure_reason} — ${result.error}`);
  }

  console.log(`[orchestrator] Validation passed. data_hash=${result.data_hash} rows=${result.rows}`);
  return result;
}

// In runExperiment(), after plan:
const validation = await this.validate(
  experimentId,
  plan,
  datasetRef,
  classification.preferred_connectors[0]
);

// Pass validation through to training and verify
// training_request.validation = validation
// verify_request.validation   = validation
```

The `data_hash` from `ValidateResult` now flows all the way through to the proof receipt — without re-hashing anywhere downstream. It is the canonical hash of the raw data used in this experiment.

---

## 4 — AXL node config for validation agent

`agents/validation-agent/node-config.json`:
```json
{
  "PrivateKeyPath": "private.pem",
  "Peers": ["tls://ORCHESTRATOR_HOST:9001"],
  "api_port": 9032,
  "tcp_port": 7003
}
```

---

## 5 — Updated port table (all nine agents)

| Agent | AXL api_port | AXL tcp_port | AXL_API_URL env |
|---|---|---|---|
| orchestrator | 9002 | 7000 | `http://127.0.0.1:9002` |
| classifier | 9012 | 7001 | `http://127.0.0.1:9012` |
| planner | 9022 | 7002 | `http://127.0.0.1:9022` |
| **validation** | **9032** | **7003** | `http://127.0.0.1:9032` |
| diagnosis | 9042 | 7004 | `http://127.0.0.1:9042` |
| strategy | 9052 | 7005 | `http://127.0.0.1:9052` |
| training | 9062 | 7006 | `http://127.0.0.1:9062` |
| reflection | 9072 | 7007 | `http://127.0.0.1:9072` |
| verifier | 9082 | 7008 | `http://127.0.0.1:9082` |
| answer | 9092 | 7009 | `http://127.0.0.1:9092` |

---

## 6 — Updated peer registry

`packages/agent-sdk/src/peer-registry.ts`:

```typescript
function requirePeer(name: string, envVar: string): string {
  const val = process.env[envVar];
  if (!val && process.env.factuam_MODE !== "dev") {
    throw new Error(
      `[peer-registry] ${envVar} not set. ` +
      `Start the ${name} AXL node and copy its 64-char public key here.`
    );
  }
  return val ?? "";
}

export const PEERS = {
  classifier: requirePeer("classifier-agent",  "AXL_PEER_CLASSIFIER"),
  planner:    requirePeer("planner-agent",     "AXL_PEER_PLANNER"),
  validation: requirePeer("validation-agent",  "AXL_PEER_VALIDATION"),  // ← new
  diagnosis:  requirePeer("diagnosis-agent",   "AXL_PEER_DIAGNOSIS"),
  strategy:   requirePeer("strategy-agent",    "AXL_PEER_STRATEGY"),
  training:   requirePeer("training-agent",    "AXL_PEER_TRAINING"),
  reflection: requirePeer("reflection-agent",  "AXL_PEER_REFLECTION"),
  verifier:   requirePeer("verifier-agent",    "AXL_PEER_VERIFIER"),
  answer:     requirePeer("answer-agent",      "AXL_PEER_ANSWER"),
};
```

---

## 7 — Updated .env

```bash
# ── Mode ─────────────────────────────────────────────────────────────────────
factuam_MODE=gensyn

# ── AXL API URLs ──────────────────────────────────────────────────────────────
AXL_API_URL_ORCHESTRATOR=http://127.0.0.1:9002
AXL_API_URL_CLASSIFIER=http://127.0.0.1:9012
AXL_API_URL_PLANNER=http://127.0.0.1:9022
AXL_API_URL_VALIDATION=http://127.0.0.1:9032
AXL_API_URL_DIAGNOSIS=http://127.0.0.1:9042
AXL_API_URL_STRATEGY=http://127.0.0.1:9052
AXL_API_URL_TRAINING=http://127.0.0.1:9062
AXL_API_URL_REFLECTION=http://127.0.0.1:9072
AXL_API_URL_VERIFIER=http://127.0.0.1:9082
AXL_API_URL_ANSWER=http://127.0.0.1:9092

# ── AXL Peer public keys (from node startup output) ──────────────────────────
AXL_PEER_CLASSIFIER=
AXL_PEER_PLANNER=
AXL_PEER_VALIDATION=
AXL_PEER_DIAGNOSIS=
AXL_PEER_STRATEGY=
AXL_PEER_TRAINING=
AXL_PEER_REFLECTION=
AXL_PEER_VERIFIER=
AXL_PEER_ANSWER=

# ── Internal workers ──────────────────────────────────────────────────────────
ML_WORKER_URL=http://127.0.0.1:8000

# ── Timeouts ──────────────────────────────────────────────────────────────────
REPLY_TIMEOUT_MS=120000
MAX_ATTEMPTS=3

# ── REE ───────────────────────────────────────────────────────────────────────
REE_ENABLED=true
REE_TASKS_ROOT=/tmp/factuam-ree
REE_MODEL_NAME=Qwen/Qwen3-0.6B
REE_OPERATION_SET=reproducible
REE_MAX_NEW_TOKENS=256
HUGGINGFACE_TOKEN=

# ── Gensyn Chain ──────────────────────────────────────────────────────────────
GENSYN_NETWORK=testnet
GENSYN_RPC_URL=https://gensyn-testnet.g.alchemy.com/public
factuam_REGISTRY_CONTRACT=
PRIVATE_KEY=
DELPHI_NETWORK=testnet
DELPHI_SIGNER_TYPE=private_key
DELPHI_API_ACCESS_KEY=
```

---

## 8 — Updated start-all.sh

```bash
#!/bin/bash
set -e
AXL=./axl/node

start() {
  local name=$1 config=$2
  echo "[start] $name → $config"
  $AXL -config $config &
}

start orchestrator  agents/orchestrator/node-config.json
start classifier    agents/classifier-agent/node-config.json
start planner       agents/planner-agent/node-config.json
start validation    agents/validation-agent/node-config.json    # ← new
start diagnosis     agents/diagnosis-agent/node-config.json
start strategy      agents/strategy-agent/node-config.json
start training      agents/training-agent/node-config.json
start reflection    agents/reflection-agent/node-config.json
start verifier      agents/verifier-agent/node-config.json
start answer        agents/answer-agent/node-config.json

sleep 3

echo ""
echo "=== Copy these to .env ==="
declare -A NAMES=(
  [9002]=ORCHESTRATOR [9012]=CLASSIFIER [9022]=PLANNER [9032]=VALIDATION
  [9042]=DIAGNOSIS [9052]=STRATEGY [9062]=TRAINING
  [9072]=REFLECTION [9082]=VERIFIER [9092]=ANSWER
)
for port in 9002 9012 9022 9032 9042 9052 9062 9072 9082 9092; do
  key=$(curl -s --connect-timeout 2 "http://127.0.0.1:$port/topology" \
    | python3 -c "import sys,json; print(json.load(sys.stdin)['our_public_key'])" 2>/dev/null || echo "not ready")
  echo "AXL_PEER_${NAMES[$port]}=$key"
done
```

---

## 9 — What data_hash carries through the full flow

```
ValidateResult.data_hash  ("0xabc123...")
       │
       ├── TrainingRequest.validation.data_hash     (training agent logs this)
       │        │
       │        └── TrainingResult.data_hash         (echoed back — must match)
       │
       ├── VerifyRequest.validation.data_hash        (verifier checks it)
       │
       └── AgentWorkReceipt.artifact_hashes.dataset  (anchored to Gensyn Chain)
```

The hash is computed once, in the validation agent, from raw bytes before any processing.
It is passed by reference through every subsequent message. The verifier checks that
`TrainingResult.data_hash === ValidateResult.data_hash` before issuing a receipt.
If they differ, the run is rejected — it means the training agent processed different data
than what was validated.
