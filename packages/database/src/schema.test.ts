import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createDatabaseClient } from "./client";
import {
  accounts,
  billingTrials,
  companies,
  dbSchema,
  fixedCosts,
  organizations,
  productFinanceDefaults,
  productImages,
  productMonthlyPerformance,
  products,
  users,
  verifications,
} from "./index";

describe("@lucreii/database schema", () => {
  it("exports core schema objects", () => {
    expect(dbSchema.organizations).toBe(organizations);
    expect(dbSchema.companies).toBe(companies);
    expect(dbSchema.fixedCosts).toBe(fixedCosts);
    expect(dbSchema.productFinanceDefaults).toBe(productFinanceDefaults);
    expect(dbSchema.productImages).toBe(productImages);
    expect(dbSchema.productMonthlyPerformance).toBe(productMonthlyPerformance);
    expect(dbSchema.products).toBe(products);
    expect(dbSchema.users).toBe(users);
    expect(dbSchema.accounts).toBe(accounts);
    expect(dbSchema.billingTrials).toBe(billingTrials);
    expect(dbSchema.verifications).toBe(verifications);
  });

  it("builds a typed database client without connecting", () => {
    const db = createDatabaseClient(
      "postgresql://postgres.project-ref:runtime-pass@aws-0-us-east-1.pooler.supabase.com:6543/postgres",
    );

    expect(db.query.organizations).toBeDefined();
    expect(db.query.companies).toBeDefined();
    expect(db.query.products).toBeDefined();
    expect(db.query.productFinanceDefaults).toBeDefined();
    expect(db.query.productImages).toBeDefined();
    expect(db.query.productMonthlyPerformance).toBeDefined();
  });

  it("defines ordered product images with marketplace source metadata", () => {
    expect(productImages.productId).toBeDefined();
    expect(productImages.url).toBeDefined();
    expect(productImages.position).toBeDefined();
    expect(productImages.source).toBeDefined();
    expect(productImages.externalIdentifier).toBeDefined();
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
    const financeDefaultsInsert: typeof productFinanceDefaults.$inferInsert = {
      productId: randomUUID(),
    };
    const companyInsert: typeof companies.$inferInsert = {
      cnpj: "12345678000195",
      code: "MELI",
      fixedCostDefault: "0",
      taxRateDefault: "0",
      razaoSocial: "Mercado Livre LTDA",
      organizationId: randomUUID(),
      userId: "user_123",
    };

    expect(organizationInsert.slug).toBe("demo-org");
    expect(companyInsert.code).toBe("MELI");
    expect(companyInsert.cnpj).toBe("12345678000195");
    expect(companyInsert.fixedCostDefault).toBe("0");
    expect(companyInsert.razaoSocial).toBe("Mercado Livre LTDA");
    expect(companyInsert.taxRateDefault).toBe("0");
    expect(financeDefaultsInsert.productId).toBeDefined();
    expect(productInsert.name).toBe("Produto");
  });

  it("keeps billing trial persistence aligned with migration assets", () => {
    const billingTrialsMigration = readFileSync(
      path.resolve(__dirname, "../drizzle/0011_billing_trials.sql"),
      "utf8",
    );

    expect(billingTrialsMigration).toContain(
      'CREATE TABLE IF NOT EXISTS "billing_trials"',
    );
    expect(billingTrialsMigration).toContain(
      'CREATE UNIQUE INDEX IF NOT EXISTS "billing_trials_user_id_key"',
    );
    expect(billingTrialsMigration).toContain(
      'CREATE UNIQUE INDEX IF NOT EXISTS "billing_trials_email_key"',
    );
    expect(billingTrialsMigration).toContain(
      'ADD COLUMN IF NOT EXISTS "trial_start"',
    );
    expect(billingTrialsMigration).toContain(
      'ADD COLUMN IF NOT EXISTS "trial_end"',
    );
    expect(billingTrialsMigration).toContain('INSERT INTO "billing_trials"');

    const billingTrialPlanCodeMigration = readFileSync(
      path.resolve(__dirname, "../drizzle/0013_billing_trial_plan_code.sql"),
      "utf8",
    );
    expect(billingTrialPlanCodeMigration).toContain(
      'ADD COLUMN IF NOT EXISTS "plan_code"',
    );
  });

  it("keeps company finance defaults aligned with migration assets", () => {
    const companyDefaultsMigration = readFileSync(
      path.resolve(__dirname, "../drizzle/0009_company_finance_defaults.sql"),
      "utf8",
    );

    expect(companyDefaultsMigration).toContain(
      'ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "fixed_cost_default" numeric(12, 2) DEFAULT \'0\' NOT NULL;',
    );
    expect(companyDefaultsMigration).toContain(
      'ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "tax_rate_default" numeric(8, 6) DEFAULT \'0\' NOT NULL;',
    );
    expect(companyDefaultsMigration).toContain(
      "companies_fixed_cost_default_non_negative",
    );
    expect(companyDefaultsMigration).toContain(
      "companies_tax_rate_default_range",
    );
  });

  it("keeps product finance defaults aligned with migration assets", () => {
    const financeDefaultsCreateMigration = readFileSync(
      path.resolve(__dirname, "../drizzle/0006_product_finance_defaults.sql"),
      "utf8",
    );
    const financeDefaultsCleanupMigration = readFileSync(
      path.resolve(
        __dirname,
        "../drizzle/0007_product_finance_defaults_cleanup.sql",
      ),
      "utf8",
    );

    expect(financeDefaultsCreateMigration).toContain(
      'CREATE TABLE IF NOT EXISTS "product_finance_defaults"',
    );
    expect(financeDefaultsCreateMigration).toContain(
      '"organization_id" uuid NOT NULL',
    );
    expect(financeDefaultsCreateMigration).toContain(
      '"product_id" uuid NOT NULL',
    );
    expect(financeDefaultsCreateMigration).toContain(
      "\"packaging_cost\" numeric(12, 2) DEFAULT '0' NOT NULL",
    );
    expect(financeDefaultsCreateMigration).toContain(
      "\"advertising_cost\" numeric(12, 2) DEFAULT '0' NOT NULL",
    );
    expect(financeDefaultsCreateMigration).toContain(
      'CREATE UNIQUE INDEX IF NOT EXISTS "product_finance_defaults_product_id_key"',
    );
    expect(financeDefaultsCleanupMigration).toContain(
      'DROP INDEX IF EXISTS "product_finance_defaults_organization_id_idx"',
    );
    expect(financeDefaultsCleanupMigration).toContain(
      'DROP CONSTRAINT IF EXISTS "product_finance_defaults_organization_id_organizations_id_fk"',
    );
    expect(financeDefaultsCleanupMigration).toContain(
      'DROP COLUMN IF EXISTS "organization_id"',
    );
  });

  it("keeps product sku uniqueness migration aligned with schema", () => {
    const skuUniquenessMigration = readFileSync(
      path.resolve(
        __dirname,
        "../drizzle/0016_products_unique_normalized_sku.sql",
      ),
      "utf8",
    );

    expect(skuUniquenessMigration).toContain(
      'CREATE UNIQUE INDEX IF NOT EXISTS "products_org_normalized_sku_key"',
    );
    expect(skuUniquenessMigration).toContain('upper(trim("sku"))');
    expect(skuUniquenessMigration).toContain('"organization_id"');
    expect(skuUniquenessMigration).toContain('"sku" IS NOT NULL');
    expect(skuUniquenessMigration).toContain('char_length(trim("sku")) > 0');
  });

  it("keeps tax removal migration aligned with schema", () => {
    const taxGlobalizationMigration = readFileSync(
      path.resolve(__dirname, "../drizzle/0010_globalize_company_tax.sql"),
      "utf8",
    );

    expect(taxGlobalizationMigration).toContain(
      'DROP COLUMN IF EXISTS "tax_rate";',
    );
    expect(taxGlobalizationMigration).toContain(
      'DROP CONSTRAINT IF EXISTS "product_finance_defaults_tax_rate_range"',
    );
    expect(taxGlobalizationMigration).toContain(
      'DROP CONSTRAINT IF EXISTS "product_monthly_performance_tax_rate_range"',
    );
  });

  it("keeps auth table names aligned with baseline migration assets", () => {
    const baselineMigration = readFileSync(
      path.resolve(__dirname, "../drizzle/0000_small_dazzler.sql"),
      "utf8",
    );

    expect(baselineMigration).toContain('CREATE TABLE "user"');
    expect(baselineMigration).toContain('CREATE TABLE "session"');
    expect(baselineMigration).toContain('CREATE TABLE "account"');
    expect(baselineMigration).toContain('"password" text');
    expect(baselineMigration).not.toContain('CREATE TABLE "users"');
    expect(baselineMigration).not.toContain('CREATE TABLE "sessions"');
    expect(baselineMigration).not.toContain('CREATE TABLE "auth_accounts"');
  });

  it("keeps finance RLS policies aligned with the finance foundation migration", () => {
    const financeMigration = readFileSync(
      path.resolve(__dirname, "../drizzle/0003_m2_finance_rls_hardening.sql"),
      "utf8",
    );

    expect(financeMigration).toContain(
      "ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;",
    );
    expect(financeMigration).toContain(
      "ALTER TABLE public.companies FORCE ROW LEVEL SECURITY;",
    );
    expect(financeMigration).toContain(
      'CREATE POLICY "Members can view own companies"',
    );
    expect(financeMigration).toContain("FROM public.organization_members om");
    expect(financeMigration).toContain(
      "om.organization_id = companies.organization_id",
    );
    expect(financeMigration).toContain("om.user_id = auth.uid()::text");
    expect(financeMigration).toContain(
      'CREATE POLICY "Members can insert own product performance"',
    );
    expect(financeMigration).toContain(
      'CREATE POLICY "Members can insert own fixed costs"',
    );
  });

  it("keeps company foreign keys aligned with finance migrations", () => {
    const financeFoundationMigration = readFileSync(
      path.resolve(__dirname, "../drizzle/0002_m1_finance_foundation.sql"),
      "utf8",
    );
    const analyticsScopeMigration = readFileSync(
      path.resolve(
        __dirname,
        "../drizzle/0005_product_monthly_performance_analytics_scope.sql",
      ),
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
    expect(financeFoundationMigration).toContain('"name" varchar(255) NOT NULL');
    expect(analyticsScopeMigration).toContain("FROM public.companies c");
    expect(analyticsScopeMigration).toContain("WHERE c.id = company_id");
  });

  it("keeps company legal identity migration aligned with schema", () => {
    const legalIdentityMigration = readFileSync(
      path.resolve(__dirname, "../drizzle/0014_company_legal_identity.sql"),
      "utf8",
    );
    const legalIdentityRepairMigration = readFileSync(
      path.resolve(__dirname, "../drizzle/0015_company_legal_identity_repair.sql"),
      "utf8",
    );
    const migrationJournal = readFileSync(
      path.resolve(__dirname, "../drizzle/meta/_journal.json"),
      "utf8",
    );

    expect(legalIdentityMigration).toContain('ALTER TABLE "companies" RENAME COLUMN "name" TO "razao_social";');
    expect(legalIdentityMigration).toContain('ALTER TABLE "companies" ADD COLUMN "cnpj" varchar(14) NOT NULL;');
    expect(legalIdentityMigration).toContain("companies_cnpj_length");
    expect(legalIdentityMigration).toContain('CREATE UNIQUE INDEX "companies_org_cnpj_key" ON "companies" USING btree ("organization_id","cnpj")');
    expect(legalIdentityRepairMigration).toContain('ALTER TABLE "companies" RENAME COLUMN "name" TO "razao_social";');
    expect(legalIdentityRepairMigration).toContain('ADD COLUMN IF NOT EXISTS "cnpj" varchar(14)');
    expect(migrationJournal).toContain('"tag": "0014_company_legal_identity"');
    expect(migrationJournal).toContain('"tag": "0015_company_legal_identity_repair"');
  });
});
