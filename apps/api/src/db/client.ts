import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { config } from "../config";
import * as schema from "./schema";

const sql = postgres(config.DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10
});

export const db = drizzle(sql, { schema });
export { sql };
