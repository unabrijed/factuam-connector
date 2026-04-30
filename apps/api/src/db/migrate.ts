import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import { sql } from "./client";
import { log, logError } from "../lib/logger";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.join(__dirname, "migrations");

async function ensureMigrationsTable() {
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS _prooflayer_migrations (
      id serial PRIMARY KEY,
      filename text NOT NULL UNIQUE,
      checksum text NOT NULL,
      applied_at timestamptz DEFAULT now() NOT NULL
    );
  `);
}

function checksum(contents: string) {
  return crypto.createHash("sha256").update(contents).digest("hex");
}

export async function runMigrations() {
  await ensureMigrationsTable();

  const files = (await fs.readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const migrationSql = await fs.readFile(path.join(migrationsDir, file), "utf8");
    const currentChecksum = checksum(migrationSql);

    const applied = await sql<{ checksum: string }[]>`
      SELECT checksum
      FROM _prooflayer_migrations
      WHERE filename = ${file}
      LIMIT 1
    `;

    if (applied[0]?.checksum === currentChecksum) {
      continue;
    }

    if (applied[0] && applied[0].checksum !== currentChecksum) {
      throw new Error(`Migration ${file} has changed after being applied`);
    }

    await sql.begin(async (tx) => {
      await tx.unsafe(migrationSql);
      await tx`
        INSERT INTO _prooflayer_migrations (filename, checksum)
        VALUES (${file}, ${currentChecksum})
      `;
    });

    log("info", "db_migration_applied", { file });
  }
}

if (process.argv[1] === __filename) {
  runMigrations()
    .then(async () => {
      log("info", "db_migrations_ready");
      await sql.end({ timeout: 5 });
    })
    .catch(async (error) => {
      logError("db_migrations_failed", error);
      await sql.end({ timeout: 5 });
      process.exit(1);
    });
}
