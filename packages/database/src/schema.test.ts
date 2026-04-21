import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createDatabaseClient } from "./client";
import { dbSchema, organizations, products, users } from "./index";

describe("@marginflow/database schema", () => {
  it("exports core schema objects", () => {
    expect(dbSchema.organizations).toBe(organizations);
    expect(dbSchema.products).toBe(products);
    expect(dbSchema.users).toBe(users);
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
});
