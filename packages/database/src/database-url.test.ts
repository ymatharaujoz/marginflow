import { describe, expect, it } from "vitest";
import {
  DATABASE_MIGRATION_URL_ERROR,
  DATABASE_URL_ERROR,
  readMigrationDatabaseUrl,
  readRuntimeDatabaseUrl,
} from "./database-url";

describe("@marginflow/database database URL helpers", () => {
  const pooledUrl =
    "postgresql://postgres.project-ref:runtime-pass@aws-0-us-east-1.pooler.supabase.com:6543/postgres";
  const directUrl =
    "postgresql://postgres.project-ref:migration-pass@db.project-ref.supabase.co:5432/postgres";

  it("requires runtime DATABASE_URL", () => {
    expect(() => readRuntimeDatabaseUrl({})).toThrow(DATABASE_URL_ERROR);
  });

  it("reads runtime DATABASE_URL", () => {
    expect(readRuntimeDatabaseUrl({ DATABASE_URL: pooledUrl })).toBe(pooledUrl);
  });

  it("prefers DATABASE_MIGRATION_URL for tooling", () => {
    expect(
      readMigrationDatabaseUrl({
        DATABASE_URL: pooledUrl,
        DATABASE_MIGRATION_URL: directUrl,
      }),
    ).toBe(directUrl);
  });

  it("falls back to DATABASE_URL for tooling", () => {
    expect(
      readMigrationDatabaseUrl({
        DATABASE_URL: pooledUrl,
      }),
    ).toBe(pooledUrl);
  });

  it("requires a tooling connection string", () => {
    expect(() => readMigrationDatabaseUrl({})).toThrow(DATABASE_MIGRATION_URL_ERROR);
  });
});
