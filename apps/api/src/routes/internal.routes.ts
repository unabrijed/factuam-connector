import { Hono } from "hono";
import { getAxlWorkersStatusController } from "../controllers/axl-workers.controller";
import { runExperimentJobController } from "../controllers/internal.controller";

export const internalRouter = new Hono();

internalRouter.post("/experiments/:experimentId/run", async (c) => {
  await runExperimentJobController(c.req.param("experimentId"));
  return c.json({ status: "ok" });
});

internalRouter.get("/axl/workers", async (c) => {
  const status = await getAxlWorkersStatusController();
  return c.json(status);
});
