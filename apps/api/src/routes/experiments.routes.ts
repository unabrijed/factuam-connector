import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { z } from "zod";
import { CreateExperimentInputSchema } from "@factum/shared-types";
import { addExperimentMessageController, createExperimentController, getExperimentController } from "../controllers/experiments.controller";

export const experimentsRouter = new Hono();
const ExperimentMessageInputSchema = z.object({
  message: z.string().min(1),
  rerun: z.boolean().optional()
});

experimentsRouter.post("/", async (c) => {
  const json = await c.req.json();
  const input = CreateExperimentInputSchema.parse(json);
  const result = await createExperimentController(input);
  return c.json(result, 201);
});

experimentsRouter.get("/:experimentId", async (c) => {
  const experiment = await getExperimentController(c.req.param("experimentId"));
  if (!experiment) {
    return c.json({ error: "Experiment not found" }, 404);
  }
  return c.json(experiment);
});

experimentsRouter.get("/:experimentId/stream", async (c) => {
  const experimentId = c.req.param("experimentId");
  const initial = await getExperimentController(experimentId);
  if (!initial) {
    return c.json({ error: "Experiment not found" }, 404);
  }

  return streamSSE(c, async (stream) => {
    let lastUpdatedAt = "";
    let heartbeatCounter = 0;

    while (!stream.aborted) {
      const experiment = await getExperimentController(experimentId);
      if (!experiment) {
        await stream.writeSSE({
          event: "error",
          data: JSON.stringify({ error: "Experiment not found" })
        });
        break;
      }

      const updatedAt = String(experiment.updatedAt ?? "");
      if (updatedAt !== lastUpdatedAt) {
        lastUpdatedAt = updatedAt;
        await stream.writeSSE({
          event: "experiment",
          id: updatedAt,
          data: JSON.stringify(experiment)
        });
      } else if (heartbeatCounter % 15 === 0) {
        await stream.writeSSE({
          event: "heartbeat",
          data: JSON.stringify({ ts: new Date().toISOString(), experimentId })
        });
      }

      heartbeatCounter += 1;
      await stream.sleep(1000);
    }
  });
});

experimentsRouter.post("/:experimentId/messages", async (c) => {
  const json = await c.req.json();
  const input = ExperimentMessageInputSchema.parse(json);
  const result = await addExperimentMessageController(c.req.param("experimentId"), input);
  return c.json(result, 201);
});
