# Local Development

This is the shortest path to a working local setup.

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

## 4. Start the ML worker

```bash
yarn worker
```

This creates `workers/ml-runner/.venv` on first run if needed.

## 5. Start the API

```bash
yarn api
```

## 6. Start the web app

```bash
yarn web
```

## 7. Verify the stack

Check:

```bash
curl http://localhost:4000/health
curl http://localhost:8000/health
```

Then open:

```txt
http://localhost:3000
```

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
