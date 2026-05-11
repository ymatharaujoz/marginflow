import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPostgresConnection } from "./connection";
import { readMigrationDatabaseUrl } from "./database-url";
import { loadRepoEnv } from "./load-repo-env";

loadRepoEnv(import.meta.url);

async function run() {
  const connectionString = readMigrationDatabaseUrl();
  const sql = createPostgresConnection(connectionString);
  const migrationsFolder = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../drizzle");
  const journalPath = path.join(migrationsFolder, "meta", "_journal.json");

  try {
    let applied: Array<{ id: string; hash: string; created_at: number | bigint | string }> = [];
    try {
      applied = await sql`
        SELECT id, hash, created_at
        FROM drizzle.__drizzle_migrations
        ORDER BY created_at
      `;
    } catch {
      console.log("drizzle.__drizzle_migrations: (not readable — drizzle schema may be missing)\n");
    }

    const regRows = await sql`
      SELECT to_regclass('public.external_products') AS regclass
    `;
    const externalProducts = regRows[0]?.regclass ?? null;

    console.log("Migration journal on disk:", journalPath);
    console.log("Rows in drizzle.__drizzle_migrations:", applied.length);
    for (const row of applied) {
      console.log(`  - ${row.id} (created_at=${row.created_at})`);
    }
    console.log("public.external_products exists:", Boolean(externalProducts));

    if (applied.length > 0 && !externalProducts) {
      console.log(`
Likely problem: Drizzle thinks at least one migration ran, but baseline tables (e.g. external_products
from 0000) are missing. Common causes:
  - public schema was dropped or replaced without clearing drizzle.__drizzle_migrations
  - DATABASE_URL / DATABASE_MIGRATION_URL pointed at a different DB when migrations first ran

On a disposable local / dev database you can realign by wiping both the journal and public objects,
then re-run migrations. Example (PostgreSQL; adjust for your host):

  DROP SCHEMA IF EXISTS drizzle CASCADE;
  DROP SCHEMA public CASCADE;
  CREATE SCHEMA public;
  -- If you use Supabase, re-apply default grants on public (Dashboard → SQL or project docs).

Then: corepack pnpm --filter @marginflow/database db:migrate
`);
    }
  } finally {
    await sql.end({ timeout: 10 });
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
