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

### OpenAI

#### `OPENAI_API_KEY`

- required: yes

#### `LLM_MODEL`

- default: `gpt-4.1-mini`

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
export OPENAI_API_KEY=...
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
