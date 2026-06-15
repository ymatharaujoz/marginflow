ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "fixed_cost_default" numeric(12, 2) DEFAULT '0' NOT NULL;
--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "tax_rate_default" numeric(8, 6) DEFAULT '0' NOT NULL;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'companies_fixed_cost_default_non_negative'
  ) THEN
    ALTER TABLE "companies"
      ADD CONSTRAINT "companies_fixed_cost_default_non_negative"
      CHECK ("companies"."fixed_cost_default" >= 0);
  END IF;
END
$$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'companies_tax_rate_default_range'
  ) THEN
    ALTER TABLE "companies"
      ADD CONSTRAINT "companies_tax_rate_default_range"
      CHECK ("companies"."tax_rate_default" >= 0 and "companies"."tax_rate_default" <= 1);
  END IF;
END
$$;
