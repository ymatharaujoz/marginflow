import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createDatabaseClient } from "./client";
import { accounts, dbSchema, organizations, products, users, verifications } from "./index";

describe("@marginflow/database schema", () => {
  it("exports core schema objects", () => {
    expect(dbSchema.organizations).toBe(organizations);
    expect(dbSchema.products).toBe(products);
    expect(dbSchema.users).toBe(users);
    expect(dbSchema.accounts).toBe(accounts);
    expect(dbSchema.verifications).toBe(verifications);
  });

  it("builds a typed database client without connecting", () => {
    const db = createDatabaseClient("postgresql://postgres:postgres@localhost:5432/marginflow");

    expect(db.query.organizations).toBeDefined();
    expect(db.query.products).toBeDefined();
  });

  it("exposes inferred insert types", () => {
    const organizationInsert: typeof organizations.$inferInsert = {
      name: "Demo Org",
      slug: "demo-org",
    };
    const productInsert: typeof products.$inferInsert = {
      organizationId: randomUUID(),
      name: "Produto",
    };

    expect(organizationInsert.slug).toBe("demo-org");
    expect(productInsert.name).toBe("Produto");
  });

  it("keeps auth table names aligned with baseline migration assets", () => {
    const baselineMigration = readFileSync(
      path.resolve(__dirname, "../drizzle/0000_small_dazzler.sql"),
      "utf8",
    );

    expect(baselineMigration).toContain('CREATE TABLE "user"');
    expect(baselineMigration).toContain('CREATE TABLE "session"');
    expect(baselineMigration).toContain('CREATE TABLE "account"');
    expect(baselineMigration).not.toContain('CREATE TABLE "users"');
    expect(baselineMigration).not.toContain('CREATE TABLE "sessions"');
    expect(baselineMigration).not.toContain('CREATE TABLE "auth_accounts"');
  });
});
