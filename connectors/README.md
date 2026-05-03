# Connectors hub

This directory is the **operator and developer entrypoint** for dataset connectors. Connector **implementations** live in workspace packages ([`packages/kaggle-connector`](../packages/kaggle-connector), [`packages/url-connector`](../packages/url-connector), [`packages/connector-sdk`](../packages/connector-sdk)); HTTP wiring lives in [`apps/api`](../apps/api).

## Running factuam to exercise connectors

Connectors are invoked by the API (`POST /api/connectors/run`). From the repo root:

1. Infra: `docker compose up -d postgres redis`
2. Migrate: `yarn db:migrate`
3. Env: see [`docs/ENVIRONMENT_VARIABLES.md`](../docs/ENVIRONMENT_VARIABLES.md) (API validates required vars at boot).
4. App: `yarn dev` or `yarn api` (see [README.md](../README.md) and [docs/LOCAL_DEVELOPMENT.md](../docs/LOCAL_DEVELOPMENT.md)).

Then run the smoke script or Vitest below.

## Architecture

Connectors run **before** the experiment orchestrator: they download or fetch sources, normalize hashes, and register a [`datasetId`](../packages/shared-types/src/index.ts). The ML agents consume datasets through the orchestrator and do not need to know whether the data came from Kaggle, a URL, or an upload. See [docs/architecture-flow.md](../docs/architecture-flow.md).

## Runtime data path

The API stores connector working files under **`LOCAL_CONNECTOR_DIR`** (default `./connector-data` relative to the API process, see [`config`](../apps/api/src/config.ts)). In production, mount a **persistent volume** at that path; otherwise downloads and Kaggle cache are lost when the container restarts.

Example:

- Set `LOCAL_CONNECTOR_DIR=/var/lib/factuam/connector-data`
- Mount a cloud or host volume at that path

Kaggle uses a per-run cache under that tree; disk usage can grow with use.

## Environment

| Variable | Purpose |
|----------|---------|
| `KAGGLE_API_TOKEN` | Required for private or rate-limited Kaggle access (secret; use a manager in deploy) |
| `KAGGLE_PYTHON_BIN` | Optional path to `python3` with `kagglehub` (API Docker image installs it; see [`apps/api/Dockerfile`](../apps/api/Dockerfile)) |
| `LOCAL_CONNECTOR_DIR` | Root directory for connector runs and cache |

## HTTP API (for external agents)

- **`GET /api/connectors/manifest`** — machine-readable tool list (`@factuam/agent-connectors`), for Claude / MCP / custom agents.
- **`POST /api/connectors/run`** — run acquisition with a [`ConnectorRequest`](../packages/shared-types/src/index.ts) body; returns `connectorRunId` and `datasetId`.

See [examples/http-examples.md](./examples/http-examples.md).

## Python dependencies (Docker / servers)

[`requirements-connectors.txt`](./requirements-connectors.txt) lists `kagglehub` for the API image. The Kaggle connector invokes Python from Node (see [`KaggleDatasetConnector`](../packages/kaggle-connector/src/index.ts)).

## Docker image (API)

Build from the **repository root** (requires a running Docker daemon):

```bash
docker build -f apps/api/Dockerfile -t factuam-api .
```

The image runs `yarn workspace @factuam/api start` (compiled `dist/`, not `dev`). Set `LOCAL_CONNECTOR_DIR` to a path under a **mounted volume** and pass `KAGGLE_API_TOKEN`, `DATABASE_URL`, `REDIS_URL`, and other variables required by [`apps/api/src/config.ts`](../apps/api/src/config.ts). See [`apps/api/Dockerfile`](../apps/api/Dockerfile).

## Quick smoke test

With the API running:

```bash
chmod +x connectors/scripts/smoke.sh
API_URL=http://localhost:4000 ./connectors/scripts/smoke.sh
```

The script fails **non-zero** if `curl` cannot reach the API or any endpoint returns an error.

## Automated contract test (Vitest)

Runs from the **`@factuam/api`** package root (filter path is relative to `apps/api`, not the repo root):

```bash
yarn workspace @factuam/api test test/connectors-contract.test.ts
```

This asserts that agent-connector manifest entries of type `connector_registry` bind to `POST /api/connectors/run`. It does not download data or call Python.

**Repo-wide test gate:** from the monorepo root, `yarn test` runs all workspaces that define a `test` script; `yarn check` runs **typecheck + test** (see root [README.md](../README.md)).
