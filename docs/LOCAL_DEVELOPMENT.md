# Local Development

This is the shortest path to a working local app **without** standing up the full Gensyn AXL mesh. For AXL (full mesh, single-node hackathon, env order), use [nodes-runbook.md](./nodes-runbook.md). The root [README.md](../README.md) has the full command list and env groups.

## Prerequisites

- Node.js `20+`
- Yarn `1.22+`
- Python `3.11+`
- Docker

## Services

- `apps/web` — frontend on `3000`
- `apps/api` — API on `4000`
- `workers/ml-runner` — ML worker on `8000`
- Postgres on `5432`
- Redis on `6379`

## 1. Install dependencies

From the repo root:

```bash
yarn install
```

## 1b. Database migrations (first run and after schema changes)

```bash
yarn db:migrate
```

## 2. Start local infrastructure

```bash
docker compose up -d postgres redis
```

## 3. Set environment variables

Use:

- [`docs/ENVIRONMENT_VARIABLES.md`](./ENVIRONMENT_VARIABLES.md)

Important:

- the API validates required variables at startup
- a full experiment run needs working OpenAI and 0G values

## 4. Start the application

**Recommended — one terminal:**

```bash
yarn dev
```

Turbo runs **web**, **API**, and **ML worker** together. The ML runner creates `workers/ml-runner/.venv` on first run if needed.

**Or split across terminals** (same ports as above):

```bash
yarn worker   # ML runner :8000
yarn api      # API :4000
yarn web      # Next.js :3000
```

## 5. Verify the stack

```bash
curl http://localhost:4000/health
curl http://localhost:8000/health
```

Open `http://localhost:3000`.

## Testing

From the repo root:

```bash
yarn test    # all workspaces that define tests (Turbo)
yarn check   # typecheck + test
```

**Often-used targets:**

```bash
yarn workspace @factum/api test
yarn workspace @factum/api test test/connectors-contract.test.ts
yarn workspace @factum/ml-runner test
```

Connector HTTP smoke (needs API up): [connectors/README.md](../connectors/README.md#quick-smoke-test).

## Supported local workflow

```txt
Upload CSV or import a connector dataset
→ create experiment
→ API queues work
→ ML worker runs validation / training / backtest
→ proof receipt is generated
```

## Quick fixes

### API fails at boot

- missing required env vars
- bad Postgres or Redis connection

### ML worker fails

- Python or venv setup issue
- missing Python dependencies

### Kaggle import fails

- `KAGGLE_API_TOKEN` missing or invalid
- `KAGGLE_PYTHON_BIN` points to a missing interpreter

### Web loads but actions fail

- API not running
- `NEXT_PUBLIC_API_URL` points to the wrong API address
