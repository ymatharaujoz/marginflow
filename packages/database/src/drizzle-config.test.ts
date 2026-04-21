import { afterEach, describe, expect, it, vi } from "vitest";

describe("database drizzle config", () => {
  const originalUrl = process.env.DATABASE_URL;

  afterEach(() => {
    if (originalUrl) {
      process.env.DATABASE_URL = originalUrl;
      return;
    }

    delete process.env.DATABASE_URL;
  });

  it("throws without DATABASE_URL", async () => {
    delete process.env.DATABASE_URL;
    vi.resetModules();

    await expect(import("../drizzle.config")).rejects.toThrow(
      "DATABASE_URL is required to use the Drizzle workflow.",
    );
  });

  it("loads with DATABASE_URL present", async () => {
    process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/marginflow";
    vi.resetModules();

    const module = await import("../drizzle.config");

    expect(module.default.schema).toBe("./src/schema.ts");
    expect(module.default.out).toBe("./drizzle");
  });
});
