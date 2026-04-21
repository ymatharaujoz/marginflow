import { defineConfig } from "drizzle-kit";
import { loadRepoEnv } from "./src/load-repo-env";

loadRepoEnv(import.meta.url);

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to use the Drizzle workflow.");
}

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
