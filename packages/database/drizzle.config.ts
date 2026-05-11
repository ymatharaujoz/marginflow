import { defineConfig } from "drizzle-kit";
import { loadRepoEnv } from "./src/load-repo-env";
import { readMigrationDatabaseUrl } from "./src/database-url";

loadRepoEnv(import.meta.url);

const connectionString = readMigrationDatabaseUrl();

export default defineConfig({
  out: "./drizzle",
  schema: "./src/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
  strict: true,
  verbose: true,
});
