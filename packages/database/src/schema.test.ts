import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createDatabaseClient } from "./client";
import {
  accounts,
  companies,
  dbSchema,
  fixedCosts,
  organizations,
  productMonthlyPerformance,
  products,
  users,
  verifications,
} from "./index";

describe("@marginflow/database schema", () => {
  it("exports core schema objects", () => {
    expect(dbSchema.organizations).toBe(organizations);
    expect(dbSchema.companies).toBe(companies);
    expect(dbSchema.fixedCosts).toBe(fixedCosts);
    expect(dbSchema.productMonthlyPerformance).toBe(productMonthlyPerformance);
    expect(dbSchema.products).toBe(products);
    expect(dbSchema.users).toBe(users);
    expect(dbSchema.accounts).toBe(accounts);
    expect(dbSchema.verifications).toBe(verifications);
  });

  it("builds a typed database client without connecting", () => {
    const db = createDatabaseClient(
      "postgresql://postgres.project-ref:runtime-pass@aws-0-us-east-1.pooler.supabase.com:6543/postgres",
    );

    expect(db.query.organizations).toBeDefined();
    expect(db.query.companies).toBeDefined();
    expect(db.query.products).toBeDefined();
    expect(db.query.productMonthlyPerformance).toBeDefined();
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
    const companyInsert: typeof companies.$inferInsert = {
      code: "MELI",
      name: "Mercado Livre",
      organizationId: randomUUID(),
      userId: "user_123",
    };

    expect(organizationInsert.slug).toBe("demo-org");
    expect(companyInsert.code).toBe("MELI");
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

  it("keeps finance RLS policies aligned with the finance foundation migration", () => {
    const financeMigration = readFileSync(
      path.resolve(__dirname, "../drizzle/0003_m2_finance_rls_hardening.sql"),
      "utf8",
    );

    expect(financeMigration).toContain("ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;");
    expect(financeMigration).toContain("ALTER TABLE public.companies FORCE ROW LEVEL SECURITY;");
    expect(financeMigration).toContain(
      'CREATE POLICY "Members can view own companies"'
    );
    expect(financeMigration).toContain('FROM public.organization_members om');
    expect(financeMigration).toContain("om.organization_id = companies.organization_id");
    expect(financeMigration).toContain("om.user_id = auth.uid()::text");
    expect(financeMigration).toContain(
      'CREATE POLICY "Members can insert own product performance"'
    );
    expect(financeMigration).toContain(
      'CREATE POLICY "Members can insert own fixed costs"'
    );
  });

  it("keeps company foreign keys aligned with finance migrations", () => {
    const financeFoundationMigration = readFileSync(
      path.resolve(__dirname, "../drizzle/0002_m1_finance_foundation.sql"),
      "utf8",
    );
    const analyticsScopeMigration = readFileSync(
      path.resolve(__dirname, "../drizzle/0005_product_monthly_performance_analytics_scope.sql"),
      "utf8",
    );

    expect(financeFoundationMigration).toContain(
      'ALTER TABLE "product_monthly_performance" ADD CONSTRAINT "product_monthly_performance_company_id_companies_id_fk"',
    );
    expect(financeFoundationMigration).toContain(
      'ALTER TABLE "fixed_costs" ADD CONSTRAINT "fixed_costs_company_id_companies_id_fk"',
    );
    expect(financeFoundationMigration).toContain(
      'CREATE UNIQUE INDEX "companies_org_code_key" ON "companies" USING btree ("organization_id","code")',
    );
    expect(analyticsScopeMigration).toContain("FROM public.companies c");
    expect(analyticsScopeMigration).toContain("WHERE c.id = company_id");
  });
});
