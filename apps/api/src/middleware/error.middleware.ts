import type { Context, Next } from "hono";
import { randomUUID } from "node:crypto";
import { AppError } from "../lib/errors";
import { logError } from "../lib/logger";

export async function errorMiddleware(c: Context, next: Next) {
  const requestId = c.req.header("x-request-id") ?? randomUUID();
  c.header("x-request-id", requestId);

  try {
    await next();
  } catch (error) {
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const code = error instanceof AppError ? error.code : "internal_error";
    const message = error instanceof Error ? error.message : "Internal server error";

    logError("request_failed", error, {
      requestId,
      method: c.req.method,
      path: c.req.path,
      statusCode,
      code,
      details: error instanceof AppError ? error.details : undefined
    });

    c.status(statusCode as 500);
    return c.json({
      error: message,
      code,
      requestId,
      ...(error instanceof AppError && error.details ? { details: error.details } : {})
    });
  }
}
