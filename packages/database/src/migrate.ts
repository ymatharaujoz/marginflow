import { migrate } from "drizzle-orm/postgres-js/migrator";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDatabaseClient } from "./client";
import { createPostgresConnection } from "./connection";
import { readMigrationDatabaseUrl } from "./database-url";
import { loadRepoEnv } from "./load-repo-env";

loadRepoEnv(import.meta.url);

function formatMigrationOutOfSyncHelp(error: unknown): string | null {
  const parts: unknown[] = [error];
  const cause = error instanceof Error ? error.cause : undefined;
  if (cause !== undefined) {
    parts.push(cause);
  }

  for (const e of parts) {
    const message = e instanceof Error ? e.message : String(e);
    const code =
      typeof e === "object" && e !== null && "code" in e
        ? String((e as { code?: unknown }).code)
        : "";

    if (
      message.includes("external_products") &&
      (message.includes("does not exist") || code === "42P01")
    ) {
      return `
Migration failed: "external_products" is missing while a later migration (e.g. 0001) is running.

Drizzle records which SQL files already ran in drizzle.__drizzle_migrations. If that journal says
0000 finished but the table was never created (or public was wiped), you get this error.

Confirm with:
  corepack pnpm --filter @marginflow/database db:diagnose

Fix on a disposable database (local/dev only): drop and recreate public + drizzle, then migrate:

  DROP SCHEMA IF EXISTS drizzle CASCADE;
  DROP SCHEMA public CASCADE;
  CREATE SCHEMA public;

Then:
  corepack pnpm --filter @marginflow/database db:migrate

(Supabase: after recreating public, restore default grants if your project requires them.)
`;
    }
  }

  return null;
}

async function run() {
  const connectionString = readMigrationDatabaseUrl();

  const sql = createPostgresConnection(connectionString);

  try {
    const db = createDatabaseClient(sql);
    const migrationsFolder = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../drizzle");

    await migrate(db, { migrationsFolder });
  } finally {
    await sql.end({ timeout: 10 });
  }
}

run().catch((error) => {
  const help = formatMigrationOutOfSyncHelp(error);
  if (help) {
    console.error(help.trim());
  }
  console.error(error);
  process.exitCode = 1;
});
