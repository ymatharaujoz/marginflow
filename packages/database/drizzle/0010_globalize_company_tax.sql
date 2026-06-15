ALTER TABLE "product_finance_defaults"
  DROP CONSTRAINT IF EXISTS "product_finance_defaults_tax_rate_range";

ALTER TABLE "product_monthly_performance"
  DROP CONSTRAINT IF EXISTS "product_monthly_performance_tax_rate_range";

ALTER TABLE "product_finance_defaults"
  DROP COLUMN IF EXISTS "tax_rate";

ALTER TABLE "product_monthly_performance"
  DROP COLUMN IF EXISTS "tax_rate";
