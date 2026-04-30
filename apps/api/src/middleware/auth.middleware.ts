import type { Context, Next } from "hono";

export async function authMiddleware(_c: Context, next: Next) {
  await next();
}
