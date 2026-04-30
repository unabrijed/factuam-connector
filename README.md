# Factum

Factum is an evidence workflow app for tabular datasets. It lets you upload or import data, run an experiment workflow, and return a proof-backed result with saved artifacts.

## What this project does

Current supported flow:

```txt
Dataset upload or connector import
→ API orchestration
→ queue job
→ dataset validation
→ model / backtest run
→ verification
→ proof receipt creation
→ result shown in the web app
```

## Services in the local stack

- `apps/web` — Next.js frontend on `http://localhost:3000`
- `apps/api` — Hono API on `http://localhost:4000`
- `workers/ml-runner` — FastAPI ML worker on `http://localhost:8000`
- `postgres` — PostgreSQL on `localhost:5432`
- `redis` — Redis on `localhost:6379`

## Run everything together locally

This is the exact workflow to get the full local stack running.

### 1. Prerequisites

Install these first:

- Node.js `20+`
- Yarn `1.22+`
- Python `3.11+`
- Docker

Optional but useful:

- `curl`

### 2. Install JavaScript dependencies

From the repo root:

```bash
yarn install
```

### 3. Create your local environment file

The API reads `.env` from the repo root.

Create a local `.env` file in the repository root and set the required values from:

- `docs/ENVIRONMENT_VARIABLES.md`

Minimum local values you need:

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
NODE_ENV=development
PORT=4000
APP_URL=http://localhost:3000
API_URL=http://localhost:4000
ML_WORKER_URL=http://localhost:8000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/factum
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=...
LOCAL_UPLOAD_DIR=./uploads
LOCAL_ARTIFACT_DIR=./artifacts
LOCAL_CONNECTOR_DIR=./connector-data
RUN_QUEUE_WORKER=true
OG_STORAGE_RPC=...
OG_STORAGE_INDEXER_RPC=...
OG_STORAGE_PRIVATE_KEY=...
OG_COMPUTE_RPC=...
OG_COMPUTE_PRIVATE_KEY=...
OG_COMPUTE_PROVIDER_ADDRESS=...
OG_CHAIN_RPC=...
OG_CHAIN_PRIVATE_KEY=0x...
OG_CHAIN_RECEIPT_REGISTRY_ADDRESS=0x...
```

If you want Kaggle imports, also add:

```bash
KAGGLE_API_TOKEN=...
KAGGLE_PYTHON_BIN=python3
```

### 4. Start Postgres and Redis

```bash
docker compose up -d postgres redis
```

### 5. Start the full app stack

From the repo root, run:

```bash
yarn dev
```

That starts these three app processes together:

- web
- api
- ml worker

Notes:

- The API runs database migrations automatically on startup.
- The ML worker creates `workers/ml-runner/.venv` on first boot and installs Python dependencies automatically.
- The API also starts the queue worker when `RUN_QUEUE_WORKER=true`.

### 6. Verify everything is up

Open these health checks:

```bash
curl http://localhost:4000/health
curl http://localhost:8000/health
```

Then open the web app:

```txt
http://localhost:3000
```

## Manual startup, if you want each service in its own terminal

Use this if you do not want `yarn dev`.

### Terminal 1: infrastructure

```bash
docker compose up -d postgres redis
```

### Terminal 2: ML worker

```bash
yarn worker
```

### Terminal 3: API

```bash
yarn api
```

### Terminal 4: web app

```bash
yarn web
```

## Exact local workflow after startup

Once the stack is running:

1. Open `http://localhost:3000`
2. Upload a CSV or import a dataset through a connector
3. Create an experiment
4. The API queues the experiment
5. The ML worker runs validation, training, and backtesting
6. The API assembles the result and proof receipt
7. Review results in the web app

## Common commands

### Start everything

```bash
yarn dev
```

### Start only web

```bash
yarn web
```

### Start only API

```bash
yarn api
```

### Start only ML worker

```bash
yarn worker
```

### Run typechecks

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

## Shut everything down

Stop the app processes with `Ctrl+C`.

Stop infrastructure with:

```bash
docker compose down
```

If you also want to remove the local Postgres volume:

```bash
docker compose down -v
```

## Troubleshooting

### API fails at boot

Usually one of these:

- required env vars are missing
- `DATABASE_URL` is wrong
- `REDIS_URL` is wrong
- Postgres or Redis is not running

### ML worker fails on first startup

Usually one of these:

- Python `3.11+` is missing
- virtualenv creation failed
- Python dependency install failed

### Web loads but actions fail

Usually one of these:

- API is not running
- `NEXT_PUBLIC_API_URL` is wrong
- ML worker is not running

### Kaggle import fails

Usually one of these:

- `KAGGLE_API_TOKEN` is missing or invalid
- `KAGGLE_PYTHON_BIN` points to a missing Python interpreter

## Project structure

### `apps/`

- `apps/web` — Next.js frontend for uploads, experiment creation, status, and results
- `apps/api` — Hono API for datasets, experiments, connectors, orchestration, and proof assembly

### `workers/`

- `workers/ml-runner` — Python/FastAPI worker that performs dataset checks, training, and backtesting

### `packages/`

- `packages/shared-types` — shared request/response and domain types
- `packages/connector-sdk` — connector interfaces
- `packages/kaggle-connector` — Kaggle dataset import connector
- `packages/url-connector` — public CSV URL import connector
- `packages/proof-receipts` — proof receipt helpers and hashing utilities
- `packages/og-storage` — 0G storage client code
- `packages/og-compute` — 0G compute client code
- `packages/og-chain` — 0G chain registration client code
- `packages/openclaw-adapter` — adapter layer used by the current runtime boundary
- `packages/gensyn-axl`, `packages/gensyn-ree`, `packages/gensyn-chain` — older optional integration packages still present in the repo but not part of the minimal supported flow

### `agents/`

- prompt assets used by the API’s internal agent stages

### `contracts/`

- onchain registry contracts related to proof receipts

### `examples/`

- sample datasets and example project assets

### `scripts/`

- local helper scripts

### `docs/`

- minimal project docs only

### `axl/`

- bundled upstream AXL source tree; not required for the default local workflow

## Supporting docs

- [`docs/LOCAL_DEVELOPMENT.md`](./docs/LOCAL_DEVELOPMENT.md)
- [`docs/ENVIRONMENT_VARIABLES.md`](./docs/ENVIRONMENT_VARIABLES.md)
