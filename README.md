# Factum

Factum is an evidence workflow app for tabular datasets with a **Gensyn-first multi-agent architecture**.
It lets you upload or import data, run an orchestrated experiment, watch specialist agents work through validation/strategy/training, and return a proof-backed result with saved artifacts.

## What this project does

Current end-to-end flow:

```txt
Dataset upload or connector import
→ API experiment orchestration
→ queue job
→ classify agent
→ planner agent
→ validation agent
→ diagnosis agent
→ strategy agent
→ training agent
→ reflection agent
→ verifier agent
→ answer agent
→ proof receipt creation
→ result shown in the web app
```

The app now supports:
- live experiment progress
- SSE streaming to the UI
- iterative attempts with reflections
- user guidance messages back into the experiment
- Gensyn AXL-routed specialist workers
- Gensyn-first runtime mode for hackathon/demo usage

---

## Architecture overview

### Primary services

- `apps/web` — Next.js frontend on `http://localhost:3000`
- `apps/api` — Hono API + experiment orchestrator on `http://localhost:4000`
- `workers/ml-runner` — FastAPI ML runtime on `http://localhost:8000`
- `postgres` — PostgreSQL on `localhost:5432`
- `redis` — Redis on `localhost:6379`

### Gensyn/agent runtime pieces

Factum now has a **swarm of specialist workers** coordinated by the API orchestrator.

AXL workers currently supported:
- `evidence-classifier`
- `experiment-planner`
- `validation-agent`
- `diagnosis-agent`
- `strategy-agent`
- `training-agent`
- `reflection-agent`
- `verifier`
- `answer-generator`

### Runtime modes

Two modes exist:

- `FACTUM_MODE=gensyn`
  - Gensyn-first mode
  - missing AXL peers should fail hard
  - intended for hackathon/demo compliance
- `FACTUM_MODE=dev`
  - local fallback mode
  - local service handlers remain available if AXL is unavailable

For hackathon/demo runs, use:

```bash
FACTUM_MODE=gensyn
GENSYN_AXL_ENABLED=true
GENSYN_AXL_LOCAL_FALLBACK=false
```

---

## Current experiment workflow

### Orchestrator flow

```txt
1. classify request
2. build experiment plan
3. validate dataset through validation agent
4. diagnose schema/data risks
5. choose strategy for attempt N
6. run training attempt through training agent
7. reflect on result/failure
8. repeat until success / stop condition
9. verify result
10. generate answer
11. create receipt/proof artifacts
```

### What the UI shows

The UI now exposes:
- current stage
- progress log
- attempts
- strategy decisions
- dataset diagnosis
- reflections
- experiment chat/guidance
- live stream status (`Live` / polling fallback)

### Experiment chat

Users can now message an experiment to:
- guide the agent
- constrain behavior
- ask for reruns
- request simpler or alternate modeling approaches

---

## Local development setup

For a **repeatable run order** (infra, local AXL mesh vs fast dev, production checks) and how **`FACTUM_MODE` relates to Gensyn/AXL**, see [docs/nodes-runbook.md](./docs/nodes-runbook.md).

## 1. Prerequisites

Install these first:

- Node.js `20+`
- Yarn `1.22+`
- Python `3.11+`
- Docker

Optional but useful:
- `curl`

## 2. Install JavaScript dependencies

From the repo root:

```bash
yarn install
```

## 3. Create your local env file

Use the root `vars` file as the template.

```bash
cp vars .env
```

Important env loading behavior:
- API loads root `.env`
- then loads `apps/api/.env` with override behavior

So if something seems ignored, check whether `apps/api/.env` overrides it.

## 4. Start Postgres and Redis

```bash
docker compose up -d postgres redis
```

## 5. Run DB migrations

```bash
yarn db:migrate
```

## 6. Start the app stack

### Standard local stack

```bash
yarn dev
```

This starts:
- web
- api
- ml worker

### Gensyn worker swarm in a separate terminal

To run all AXL workers together:

```bash
yarn dev:axl
```

This starts:
- classifier worker
- planner worker
- validation worker
- diagnosis worker
- strategy worker
- training worker
- reflection worker
- verifier worker
- answer worker

For a full Gensyn-first local run, you usually want:

### Terminal 1
```bash
docker compose up -d postgres redis
```

### Terminal 2
```bash
yarn worker
```

### Terminal 3
```bash
yarn api
```

### Terminal 4
```bash
yarn web
```

### Terminal 5
```bash
yarn dev:axl
```

---

## Health / verification commands

### App health

```bash
curl http://localhost:4000/health
curl http://localhost:8000/health
```

### UI

Open:

```txt
http://localhost:3000
```

### Typechecks

```bash
yarn typecheck
yarn workspace @factum/api typecheck
yarn workspace @factum/agent-sdk typecheck
yarn workspace @factum/shared-types build
```

---

## Important env groups

## Core API/web/worker

- `NEXT_PUBLIC_API_URL`
- `NODE_ENV`
- `PORT`
- `APP_URL`
- `API_URL`
- `ML_WORKER_URL`
- `RUN_QUEUE_WORKER`

## Database / queue

- `DATABASE_URL`
- `REDIS_URL`

## LLM

- `OPENAI_API_KEY`
- `LLM_MODEL`

## Local file paths

- `LOCAL_UPLOAD_DIR`
- `LOCAL_ARTIFACT_DIR`
- `LOCAL_CONNECTOR_DIR`

## Gensyn AXL

- `FACTUM_MODE`
- `GENSYN_AXL_ENABLED`
- `GENSYN_AXL_API_URL`
- `GENSYN_AXL_LOCAL_FALLBACK`
- `GENSYN_AXL_TIMEOUT_MS`
- `GENSYN_AXL_POLL_INTERVAL_MS`
- `AXL_PEER_CLASSIFIER`
- `AXL_PEER_PLANNER`
- `AXL_PEER_VALIDATION`
- `AXL_PEER_DIAGNOSIS`
- `AXL_PEER_STRATEGY`
- `AXL_PEER_TRAINING`
- `AXL_PEER_REFLECTION`
- `AXL_PEER_VERIFIER`
- `AXL_PEER_ANSWER`

## Gensyn REE

- `GENSYN_REE_ENABLED`
- `GENSYN_REE_COMMAND`
- `GENSYN_REE_MODE`
- `GENSYN_REE_VERIFIER_MODEL`
- `GENSYN_REE_TASKS_ROOT`
- `GENSYN_REE_MAX_NEW_TOKENS`
- `GENSYN_REE_TEMPERATURE`

## Gensyn chain

- `GENSYN_CHAIN_ENABLED`
- `GENSYN_NETWORK`
- `GENSYN_CHAIN_RPC`
- `GENSYN_MAINNET_RPC`
- `GENSYN_TESTNET_RPC`
- `GENSYN_CHAIN_ID`
- `GENSYN_CHAIN_PRIVATE_KEY`
- `GENSYN_CHAIN_REGISTRY_ADDRESS`

## Kaggle connector

- `KAGGLE_API_TOKEN`
- `KAGGLE_PYTHON_BIN`

## 0G / receipt infrastructure

- `OG_STORAGE_RPC`
- `OG_STORAGE_INDEXER_RPC`
- `OG_STORAGE_PRIVATE_KEY`
- `OG_COMPUTE_RPC`
- `OG_COMPUTE_PRIVATE_KEY`
- `OG_COMPUTE_PROVIDER_ADDRESS`
- `OG_CHAIN_RPC`
- `OG_CHAIN_PRIVATE_KEY`
- `OG_CHAIN_RECEIPT_REGISTRY_ADDRESS`

---

## Recommended modes

Mode profiles and per-run checklists: [docs/nodes-runbook.md](./docs/nodes-runbook.md).

## Fast local dev mode

Use this when you want the app working even if AXL peers are not configured:

```bash
FACTUM_MODE=dev
GENSYN_AXL_ENABLED=false
GENSYN_AXL_LOCAL_FALLBACK=true
GENSYN_REE_ENABLED=false
```

## Full Gensyn-first mode

Use this for hackathon/demo compliance:

```bash
FACTUM_MODE=gensyn
GENSYN_AXL_ENABLED=true
GENSYN_AXL_LOCAL_FALLBACK=false
GENSYN_REE_ENABLED=true
```

Plus set all `AXL_PEER_*` values.

---

## Common commands

### Start everything

```bash
yarn dev
```

### Start web only

```bash
yarn web
```

### Start API only

```bash
yarn api
```

### Start ML worker only

```bash
yarn worker
```

### Start AXL swarm only

```bash
yarn dev:axl
```

### Run migrations

```bash
yarn db:migrate
```

### Run all typechecks

```bash
yarn typecheck
```

### Run tests

```bash
yarn test
```

### Clean build artifacts

```bash
yarn clean
```

---

## Troubleshooting

## API boots but experiments fail immediately

Usually one of these:
- required env vars are missing
- `apps/api/.env` overrides root `.env`
- Postgres or Redis is not running
- `RUN_QUEUE_WORKER` is false

## UI works but experiment stays idle

Usually one of these:
- queue worker is not running
- Redis is down
- experiment was never enqueued

## Gensyn mode fails fast

Usually one of these:
- `FACTUM_MODE=gensyn` but one or more `AXL_PEER_*` vars are missing
- `GENSYN_AXL_ENABLED` is false
- AXL API is not reachable at `GENSYN_AXL_API_URL`
- AXL workers are not running

## Validation/training issues

Usually one of these:
- dataset path is invalid on the worker machine
- Kaggle Python path is wrong
- ML worker is down
- plan required columns do not exist

## Kaggle issues

Check:
- `KAGGLE_API_TOKEN`
- `KAGGLE_PYTHON_BIN`
- that the referenced Python binary exists

## Web loads but actions fail

Usually one of these:
- API is not running
- `NEXT_PUBLIC_API_URL` is wrong
- browser is calling stale dev server values

---

## Shutdown

Stop app processes with `Ctrl+C`.

Stop infrastructure with:

```bash
docker compose down
```

To also remove Postgres volume:

```bash
docker compose down -v
```
