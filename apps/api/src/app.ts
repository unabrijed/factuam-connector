import { Hono } from "hono";
import { cors } from "hono/cors";
import { config } from "./config";
import { errorMiddleware } from "./middleware/error.middleware";
import { authMiddleware } from "./middleware/auth.middleware";
import { datasetsRouter } from "./routes/datasets.routes";
import { experimentsRouter } from "./routes/experiments.routes";
import { proofsRouter } from "./routes/proofs.routes";
import { internalRouter } from "./routes/internal.routes";
import { connectorsRouter } from "./routes/connectors.routes";

export function createApp() {
  const app = new Hono();

  const allowedOrigins = new Set([
    config.APP_URL,
    "http://localhost:3000",
    "http://127.0.0.1:3000"
  ]);

  app.use(
    "/api/*",
    cors({
      origin: (origin) => {
        if (!origin) return "";
        return allowedOrigins.has(origin) ? origin : "";
      },
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"]
    })
  );
  app.use("*", errorMiddleware);
  app.use("/api/*", authMiddleware);

  app.get("/health", (c) => c.json({ ok: true }));
  app.route("/api/datasets", datasetsRouter);
  app.route("/api/connectors", connectorsRouter);
  app.route("/api/experiments", experimentsRouter);
  app.route("/api/proofs", proofsRouter);
  app.route("/api/internal", internalRouter);

  return app;
}
