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
- **OpenCode** — HTTP server for JSON structured-agent calls (default `http://127.0.0.1:4096`; started separately via `opencode serve`). Factum does not bundle this process.
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

For a **repeatable run order** (infra, local AXL mesh vs fast dev, production checks) and how **`FACTUM_MODE` relates to Gensyn/AXL**, see [docs/nodes-runbook.md](./docs/nodes-runbook.md). The short path without Gensyn is [docs/LOCAL_DEVELOPMENT.md](./docs/LOCAL_DEVELOPMENT.md).

### Run everything locally (checklist)

Use this order whenever you want the web app, API, ML worker, and agent JSON calls working:

1. **Infrastructure:** `docker compose up -d postgres redis`
2. **OpenCode:** `opencode serve` on `127.0.0.1:4096` (or match `OPENCODE_BASE_URL`), with providers configured in OpenCode
3. **Env:** `cp vars .env` (and fill values — see [docs/ENVIRONMENT_VARIABLES.md](./docs/ENVIRONMENT_VARIABLES.md))
4. **Database:** `yarn db:migrate`
5. **App:** `yarn dev` (web + API + ML worker)

Verify: [Health / verification commands](#health--verification-commands) below (API, ML worker, OpenCode).

### How we run the stack (pick one profile)

| Goal | What you start | Notes |
|------|----------------|-------|
| **Default app development** | `docker compose up -d postgres redis` → **`opencode serve`** → `yarn db:migrate` → `yarn dev` | **`opencode serve`** must run whenever experiments hit JSON agents (classifier, planner, verifier, answer). `yarn dev` runs **web + API + ML worker** (Turbo). No Go AXL unless you add it. |
| **Fast / no AXL transport** | Same infra + set `FACTUM_MODE=dev`, `GENSYN_AXL_ENABLED=false`, `GENSYN_AXL_LOCAL_FALLBACK=true` | Specialists run **in-process** in the API; good when you are not testing the mesh. |
| **Full local Gensyn mesh** | Infra + app + `yarn local:axl` **or** `yarn local:axl:nodes` + `yarn dev:axl` | Writes `.env.local.axl`; **restart `yarn api` / `yarn dev`** after it changes. See [nodes-runbook](./docs/nodes-runbook.md). |
| **Hackathon single-node AXL** | Infra + app + `yarn local:axl:single` (or `yarn local:axl:single:nodes` + `yarn workspace @factum/api dev:axl-unified`) | One Go node + unified TS worker + Redis reply path. Narrative: [hackathon-axl-single-node.md](./docs/hackathon-axl-single-node.md). |

**Env reference:** [docs/ENVIRONMENT_VARIABLES.md](./docs/ENVIRONMENT_VARIABLES.md).

### After local testing: run “real” Gensyn AXL

When you are done with **in-process** agents (`FACTUM_MODE=dev`, `GENSYN_AXL_ENABLED=false`), switch to the mesh-backed profile:

1. Set **`FACTUM_MODE=gensyn`**, **`GENSYN_AXL_ENABLED=true`**, and **`GENSYN_AXL_LOCAL_FALLBACK=false`** when you must not fall back to local handlers.
2. Start the **Go bridge + TS workers** using either **`yarn local:axl`** (full local mesh) or **`yarn local:axl:single`** (one Go node + unified worker + Redis). Restart **`yarn api` / `yarn dev`** after `.env.local.axl` is written.
3. Point **`GENSYN_AXL_API_URL`** at the orchestrator node (local default `http://127.0.0.1:9002`). Ensure **`AXL_PEER_*`** or **`AXL_SINGLE_PEER_ID`** match **`our_public_key`** from `/topology` as documented in [docs/nodes-runbook.md](./docs/nodes-runbook.md).
4. For flaky links or slow hosts, raise **`GENSYN_AXL_TIMEOUT_MS`** and **`REPLY_TIMEOUT_MS`** (single-node).

See the **Production / shared demo** row and checklist in [docs/nodes-runbook.md](./docs/nodes-runbook.md) when peers are not all on one machine.

## 1. Prerequisites

Install these first:

- Node.js `20+`
- Yarn `1.22+`
- Python `3.11+`
- Docker
- **OpenCode CLI** — required for JSON specialist agents; install from [OpenCode docs](https://opencode.ai/docs/), then run `opencode serve` (see step 5 below)

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

## 5. Start OpenCode (required for JSON agents)

Experiments use **OpenCode** for structured JSON outputs from specialist agents. Install the OpenCode CLI from the [OpenCode docs](https://opencode.ai/docs/), configure **provider credentials** there (for example via `opencode.json` or OpenCode’s auth UI — not in Factum’s `.env`), then run a standalone server:

```bash
opencode serve --hostname 127.0.0.1 --port 4096
```

This matches the default **`OPENCODE_BASE_URL`** (`http://127.0.0.1:4096`). Use another port only if you change `OPENCODE_BASE_URL` accordingly.

Confirm the server is up:

```bash
curl http://127.0.0.1:4096/global/health
```

More detail: [OpenCode Server](https://opencode.ai/docs/server), [SDK](https://opencode.ai/docs/sdk/).

## 6. Run DB migrations

```bash
yarn db:migrate
```

## 7. Start the app stack

### Standard local stack

```bash
yarn dev
```

This starts:
- web
- api
- ml worker

### Gensyn worker swarm in a separate terminal

To run **one recv loop per specialist** (full local mesh), use:

```bash
yarn dev:axl
```

Or use the **automation** that starts Go `axl/node` processes and workers: `yarn local:axl` / `yarn local:axl:nodes` (see [docs/nodes-runbook.md](./docs/nodes-runbook.md)). For **one Go node + one unified TS worker**, use `yarn local:axl:single` instead.

`yarn dev:axl` starts these worker processes:
- classifier, planner, validation, diagnosis, strategy, training, reflection, verifier, answer

For a full Gensyn-first local run, you usually want:

### Terminal 1 — infrastructure
```bash
docker compose up -d postgres redis
```

### Terminal 2 — OpenCode (keep running)
```bash
opencode serve --hostname 127.0.0.1 --port 4096
```

### Terminal 3
```bash
yarn worker
```

### Terminal 4
```bash
yarn api
```

### Terminal 5
```bash
yarn web
```

### Terminal 6
```bash
yarn dev:axl
```

---

## Health / verification commands

### App health

```bash
curl http://localhost:4000/health
curl http://localhost:8000/health
curl http://127.0.0.1:4096/global/health
```

The last command checks **OpenCode** (same URL as `OPENCODE_BASE_URL` + `/global/health`).

### UI

Open:

```txt
http://localhost:3000
```

### Typechecks and full gate

```bash
yarn typecheck                      # all workspaces
yarn workspace @factum/api typecheck
yarn workspace @factum/agent-sdk typecheck
yarn workspace @factum/shared-types build
yarn check                          # typecheck + test
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

- `OPENCODE_BASE_URL` (OpenCode server; default `http://127.0.0.1:4096`)
- `OPENCODE_MODEL` — use a `provider/model` pair that your **OpenCode** install lists (see `GET /config/providers` on the OpenCode server, or the OpenCode UI). The default in `vars` / config may not match your server’s registry; wrong values cause `ProviderModelNotFoundError` in `opencode serve`. Provider credentials stay in OpenCode, not Factum.
- `LLM_MODEL` (default for Gensyn REE when `GENSYN_REE_VERIFIER_MODEL` is unset)

Direct OpenAI usage has been removed from the API; structured agent calls go through [OpenCode](https://opencode.ai/docs/sdk/).

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
- `GENSYN_AXL_IDLE_POLL_MAX_MS` (cap for exponential backoff when `/recv` is empty)
- `GENSYN_AXL_RECV_FATAL_AFTER` (consecutive recv failures before worker exits; `0` = disabled)
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
yarn test    # Turbo: every workspace that defines a test script
yarn check   # typecheck + test (handy pre-push gate)
```

**Targeted:**

```bash
yarn workspace @factum/api test                                      # all Vitest suites under apps/api
yarn workspace @factum/api test test/connectors-contract.test.ts    # connector HTTP contract only
yarn workspace @factum/ml-runner test                                # Python tests for ML worker
yarn workspace @factum/proof-receipts test                           # Vitest (proof receipts package)
```

**Connectors:** smoke script and manifest/run contract are documented in [connectors/README.md](./connectors/README.md).

**AXL:** with the API running, `yarn check:axl` probes worker health via the API.

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
