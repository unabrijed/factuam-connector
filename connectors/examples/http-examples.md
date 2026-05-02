# Connector HTTP examples

Replace `API_URL` (e.g. `http://localhost:4000`). These endpoints sit behind `/api/*`; [`authMiddleware`](../apps/api/src/middleware/auth.middleware.ts) is currently a no-op but may require credentials in production.

## List registered connectors

```bash
curl -sS "$API_URL/api/connectors"
```

## Agent tool manifest (for Claude / MCP wiring)

Returns the same catalog as [`@factum/agent-connectors`](../packages/agent-connectors) (`buildAgentConnectorManifest`), including `binding.route` for each tool.

```bash
curl -sS "$API_URL/api/connectors/manifest"
```

## Run a connector (canonical path)

Body matches [`ConnectorRequest`](../packages/shared-types/src/index.ts): discriminated `provider` + `params`. Optional `datasetName` overrides the default derived name.

**Kaggle**

```bash
curl -sS -X POST "$API_URL/api/connectors/run" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "kaggle",
    "params": { "dataset": "owner/slug", "file": "optional.csv" }
  }'
```

**URL CSV**

```bash
curl -sS -X POST "$API_URL/api/connectors/run" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "url_csv",
    "params": { "url": "https://example.com/data.csv" }
  }'
```

## Poll connector run status

Use `connectorRunId` from the run response:

```bash
curl -sS "$API_URL/api/connectors/runs/<connectorRunId>"
```

## Legacy Kaggle import (experiment helper)

Still supported; same acquisition path as `/run` when not creating an experiment in one call.

```bash
curl -sS -X POST "$API_URL/api/connectors/kaggle/import" \
  -H "Content-Type: application/json" \
  -d '{
    "connectorRequest": { "provider": "kaggle", "params": { "dataset": "owner/slug" } },
    "createExperiment": false
  }'
```
