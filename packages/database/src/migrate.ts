import { migrate } from "drizzle-orm/postgres-js/migrator";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDatabaseClient } from "./client";
import { createPostgresConnection } from "./connection";
import { loadRepoEnv } from "./load-repo-env";

loadRepoEnv(import.meta.url);

async function run() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required to run database migrations.");
  }

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
  console.error(error);
  process.exitCode = 1;
});
