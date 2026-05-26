DROP INDEX IF EXISTS "product_finance_defaults_organization_id_idx";

ALTER TABLE "product_finance_defaults"
  DROP CONSTRAINT IF EXISTS "product_finance_defaults_organization_id_organizations_id_fk";

ALTER TABLE "product_finance_defaults"
  DROP COLUMN IF EXISTS "organization_id";
