import { Hono } from "hono";
import { getAxlTopologyController } from "../controllers/axl.controller";

export const axlRouter = new Hono();

axlRouter.get("/topology", async (c) => {
  try {
    const data = await getAxlTopologyController();
    return c.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return c.json({ error: message }, 502);
  }
});
