CREATE TABLE IF NOT EXISTS "product_finance_defaults" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "packaging_cost" numeric(12, 2) DEFAULT '0' NOT NULL,
  "tax_rate" numeric(8, 6) DEFAULT '0' NOT NULL,
  "advertising_cost" numeric(12, 2) DEFAULT '0' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "product_finance_defaults_packaging_cost_non_negative" CHECK ("product_finance_defaults"."packaging_cost" >= 0),
  CONSTRAINT "product_finance_defaults_tax_rate_range" CHECK ("product_finance_defaults"."tax_rate" >= 0 and "product_finance_defaults"."tax_rate" <= 1),
  CONSTRAINT "product_finance_defaults_advertising_cost_non_negative" CHECK ("product_finance_defaults"."advertising_cost" >= 0)
);

ALTER TABLE "product_finance_defaults"
  ADD CONSTRAINT "product_finance_defaults_organization_id_organizations_id_fk"
  FOREIGN KEY ("organization_id")
  REFERENCES "public"."organizations"("id")
  ON DELETE cascade
  ON UPDATE no action;

ALTER TABLE "product_finance_defaults"
  ADD CONSTRAINT "product_finance_defaults_product_id_products_id_fk"
  FOREIGN KEY ("product_id")
  REFERENCES "public"."products"("id")
  ON DELETE cascade
  ON UPDATE no action;

CREATE INDEX IF NOT EXISTS "product_finance_defaults_organization_id_idx"
  ON "product_finance_defaults" USING btree ("organization_id");

CREATE UNIQUE INDEX IF NOT EXISTS "product_finance_defaults_product_id_key"
  ON "product_finance_defaults" USING btree ("product_id");

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_product_finance_defaults_updated_at
ON public.product_finance_defaults;

CREATE TRIGGER set_product_finance_defaults_updated_at
BEFORE UPDATE ON public.product_finance_defaults
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();
