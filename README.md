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

## Minimal docs

- [`docs/LOCAL_DEVELOPMENT.md`](./docs/LOCAL_DEVELOPMENT.md) — how to run the project locally
- [`docs/ENVIRONMENT_VARIABLES.md`](./docs/ENVIRONMENT_VARIABLES.md) — variables needed for the current supported workflow

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

## What to read first

1. `README.md`
2. `docs/LOCAL_DEVELOPMENT.md`
3. `docs/ENVIRONMENT_VARIABLES.md`
