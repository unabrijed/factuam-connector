import { Hono } from "hono";
import { uploadDatasetController } from "../controllers/datasets.controller";

export const datasetsRouter = new Hono();

datasetsRouter.post("/upload", async (c) => {
  const body = await c.req.parseBody();
  const file = body.file;
  const name = String(body.name ?? "Uploaded Dataset");

  if (!(file instanceof File)) {
    return c.json({ error: "file is required" }, 400);
  }

  const result = await uploadDatasetController(file, name);
  return c.json(result, 201);
});
