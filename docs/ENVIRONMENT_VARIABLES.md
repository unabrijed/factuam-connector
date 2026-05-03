# Environment Variables

This file keeps only the variables needed for the current supported workflow.

## Web

### `NEXT_PUBLIC_API_URL`

- default: `http://localhost:4000`
- purpose: browser → API base URL

Example:

```bash
export NEXT_PUBLIC_API_URL=http://localhost:4000
```

## API

Source of truth:

- `apps/api/src/config.ts`

### Core

#### `NODE_ENV`

- default: `development`

#### `PORT`

- default: `4000`

#### `APP_URL`

- default: `http://localhost:3000`

#### `API_URL`

- default: `http://localhost:4000`

#### `ML_WORKER_URL`

- default: `http://localhost:8000`

### Data and queue

#### `DATABASE_URL`

- required: yes
- example: `postgres://postgres:postgres@localhost:5432/factum`

#### `REDIS_URL`

- required: yes
- example: `redis://localhost:6379`

### OpenCode (JSON agents)

The API calls a running [OpenCode](https://opencode.ai/docs/sdk/) server. Configure provider API keys in OpenCode (`opencode.json` or its auth APIs), not in Factum.

#### OpenCode Go

[OpenCode Go](https://dev.opencode.ai/docs/providers/) is a low-cost subscription for open coding models hosted by the OpenCode team. Enable it in the **OpenCode CLI** (not in Factum’s `.env`):

1. Run `opencode` to open the TUI, then `/connect` and choose **OpenCode Go** (or use the flow described in the [providers doc](https://dev.opencode.ai/docs/providers/)).
2. Open [opencode.ai/auth](https://opencode.ai/auth) when prompted, sign in, add billing, and copy your API key.
3. Paste the key into the TUI. OpenCode stores credentials (commonly `~/.local/share/opencode/auth.json`), not this repo.
4. Run `/models` in the TUI to see recommended `provider/model` ids.
5. Keep **`opencode serve`** running (same host/port as `OPENCODE_BASE_URL`, default `http://127.0.0.1:4096`).
6. Set Factum’s **`OPENCODE_MODEL`** to a model your server actually lists (see `curl` under `OPENCODE_MODEL` below). The default `opencode/gpt-5-nano` may or may not exist on your install—pick one from `/models` or `GET /config/providers`.

#### `OPENCODE_BASE_URL`

- default: `http://127.0.0.1:4096`
- purpose: HTTP base URL of the OpenCode server

#### `OPENCODE_MODEL`

- default: `opencode/gpt-5-nano`
- format: `provider/model` (must contain exactly one `/`)
- **must match a model your OpenCode server actually exposes** — names change between OpenCode releases; the Factum default may not exist on your machine. If prompts fail with `ProviderModelNotFoundError`, list models from the running server (see [OpenCode Server](https://opencode.ai/docs/server)):

```bash
curl -s "${OPENCODE_BASE_URL:-http://127.0.0.1:4096}/config/providers" | head -c 2000
```

Then set `OPENCODE_MODEL` to a supported `provider/model` string (or adjust OpenCode config) until `opencode serve` accepts it.

#### `OPENCODE_DIRECTORY`

- required: no
- purpose: optional workspace directory passed through to OpenCode session APIs

#### `LLM_MODEL`

- default: `gpt-4.1-mini`
- purpose: default verifier model for **Gensyn REE** when `GENSYN_REE_VERIFIER_MODEL` is unset (not used by OpenCode path)

### Local filesystem

#### `LOCAL_UPLOAD_DIR`

- default: `./uploads`

#### `LOCAL_ARTIFACT_DIR`

- default: `./artifacts`

#### `LOCAL_CONNECTOR_DIR`

- default: `./connector-data`

#### `RUN_QUEUE_WORKER`

- default: `true`
- when `true`, the API process also runs the queue worker

### Connector-related

#### `KAGGLE_API_TOKEN`

- required: only for Kaggle imports

#### `KAGGLE_PYTHON_BIN`

- default: `python3`
- purpose: Python interpreter used by the Kaggle connector

## Proof pipeline

These are required by the current API config and by a full end-to-end experiment:

### 0G Storage

#### `OG_STORAGE_RPC`
- required: yes

#### `OG_STORAGE_INDEXER_RPC`
- required: yes

#### `OG_STORAGE_PRIVATE_KEY`
- required: yes

### 0G Compute

#### `OG_COMPUTE_RPC`
- required: yes

#### `OG_COMPUTE_PRIVATE_KEY`
- required: yes

#### `OG_COMPUTE_PROVIDER_ADDRESS`
- required: yes

### 0G Chain

#### `OG_CHAIN_RPC`
- required: yes

#### `OG_CHAIN_PRIVATE_KEY`
- required: yes
- format: `0x` + 64 hex chars

#### `OG_CHAIN_RECEIPT_REGISTRY_ADDRESS`
- required: yes
- format: `0x` + 40 hex chars

## ML worker

### `LOCAL_ARTIFACT_DIR`

- default: `./artifacts`

## Minimal local checklist

For normal local development, make sure at least these are set:

```bash
export NEXT_PUBLIC_API_URL=http://localhost:4000
export NODE_ENV=development
export PORT=4000
export APP_URL=http://localhost:3000
export API_URL=http://localhost:4000
export ML_WORKER_URL=http://localhost:8000
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/factum
export REDIS_URL=redis://localhost:6379
export OPENCODE_BASE_URL=http://127.0.0.1:4096
export OPENCODE_MODEL=opencode/gpt-5-nano
export LLM_MODEL=gpt-4.1-mini
export LOCAL_UPLOAD_DIR=./uploads
export LOCAL_ARTIFACT_DIR=./artifacts
export LOCAL_CONNECTOR_DIR=./connector-data
export RUN_QUEUE_WORKER=true
export OG_STORAGE_RPC=...
export OG_STORAGE_INDEXER_RPC=...
export OG_STORAGE_PRIVATE_KEY=...
export OG_COMPUTE_RPC=...
export OG_COMPUTE_PRIVATE_KEY=...
export OG_COMPUTE_PROVIDER_ADDRESS=...
export OG_CHAIN_RPC=...
export OG_CHAIN_PRIVATE_KEY=0x...
export OG_CHAIN_RECEIPT_REGISTRY_ADDRESS=0x...
```

If you use Kaggle imports, also set:

```bash
export KAGGLE_API_TOKEN=...
export KAGGLE_PYTHON_BIN=python3
```

Dataset discovery from a natural-language prompt uses Kaggle’s public HTTP API at `https://api.kaggle.com` (no Kaggle CLI). `KAGGLE_API_TOKEN` is optional for search listings but recommended for reliable rate limits and authenticated downloads when importing files.
