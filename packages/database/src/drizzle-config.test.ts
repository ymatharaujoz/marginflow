import { afterEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";

describe("database drizzle config", () => {
  const originalUrl = process.env.DATABASE_URL;
  const originalMigrationUrl = process.env.DATABASE_MIGRATION_URL;
  const pooledUrl = "postgresql://postgres.project-ref:runtime-pass@aws-0-us-east-1.pooler.supabase.com:6543/postgres";
  const directUrl = "postgresql://postgres.project-ref:migration-pass@db.project-ref.supabase.co:5432/postgres";

  afterEach(() => {
    if (originalUrl) {
      process.env.DATABASE_URL = originalUrl;
    } else {
      delete process.env.DATABASE_URL;
    }

    if (originalMigrationUrl) {
      process.env.DATABASE_MIGRATION_URL = originalMigrationUrl;
    } else {
      delete process.env.DATABASE_MIGRATION_URL;
    }
  });

  it("throws without DATABASE_URL or DATABASE_MIGRATION_URL", async () => {
    delete process.env.DATABASE_URL;
    delete process.env.DATABASE_MIGRATION_URL;
    vi.resetModules();

    await expect(import("../drizzle.config")).rejects.toThrow(
      "DATABASE_MIGRATION_URL or DATABASE_URL is required for database tooling.",
    );
  });

  it("loads with DATABASE_MIGRATION_URL present", async () => {
    process.env.DATABASE_URL = pooledUrl;
    process.env.DATABASE_MIGRATION_URL = directUrl;
    vi.resetModules();

    const module = await import("../drizzle.config");
    const config = module.default as typeof module.default & {
      dbCredentials: { url: string };
    };

    expect(config.schema).toBe("./src/schema.ts");
    expect(config.out).toBe("./drizzle");
    expect(config.dbCredentials.url).toBe(directUrl);
  });

  it("uses singular Better Auth table names in schema", async () => {
    process.env.DATABASE_URL = pooledUrl;
    vi.resetModules();

    const schema = await import("./schema");

    expect(getTableName(schema.users)).toBe("user");
    expect(getTableName(schema.sessions)).toBe("session");
    expect(getTableName(schema.accounts)).toBe("account");
  });
});
