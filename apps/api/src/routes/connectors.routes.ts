import { Hono } from "hono";
import {
  getConnectorRunController,
  importKaggleDatasetController,
  kaggleSuggestDatasetsController,
  listAgentConnectorManifestController,
  listConnectorPresetsController,
  listKagglePresetsController,
  listConnectorsController,
  runConnectorController
} from "../controllers/connectors.controller";

export const connectorsRouter = new Hono();

connectorsRouter.get("/", (c) => c.json(listConnectorsController()));
connectorsRouter.get("/manifest", (c) => c.json(listAgentConnectorManifestController()));
connectorsRouter.get("/presets", (c) => c.json(listConnectorPresetsController()));
connectorsRouter.get("/kaggle/presets", (c) => c.json(listKagglePresetsController()));

connectorsRouter.post("/kaggle/suggest", async (c) => {
  const json = await c.req.json();
  const result = await kaggleSuggestDatasetsController(json);
  return c.json(result, 200);
});

connectorsRouter.post("/run", async (c) => {
  const json = await c.req.json();
  const result = await runConnectorController(json);
  return c.json(result, 201);
});

connectorsRouter.post("/kaggle/import", async (c) => {
  const json = await c.req.json();
  const result = await importKaggleDatasetController(json);
  return c.json(result, 201);
});

connectorsRouter.get("/runs/:runId", async (c) => {
  const run = await getConnectorRunController(c.req.param("runId"));
  if (!run) {
    return c.json({ error: "Connector run not found" }, 404);
  }
  return c.json(run);
});
