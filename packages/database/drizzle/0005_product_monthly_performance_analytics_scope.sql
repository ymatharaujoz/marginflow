ALTER TABLE public.product_monthly_performance
  ADD COLUMN IF NOT EXISTS returns_quantity integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS unit_cost numeric(12, 2) DEFAULT '0' NOT NULL,
  ADD COLUMN IF NOT EXISTS commission_rate numeric(8, 6) DEFAULT '0' NOT NULL,
  ADD COLUMN IF NOT EXISTS shipping_fee numeric(12, 2) DEFAULT '0' NOT NULL,
  ADD COLUMN IF NOT EXISTS tax_rate numeric(8, 6) DEFAULT '0' NOT NULL,
  ADD COLUMN IF NOT EXISTS packaging_cost numeric(12, 2) DEFAULT '0' NOT NULL,
  ADD COLUMN IF NOT EXISTS advertising_cost numeric(12, 2) DEFAULT '0' NOT NULL;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_monthly_performance_returns_non_negative'
  ) THEN
    ALTER TABLE public.product_monthly_performance
      ADD CONSTRAINT product_monthly_performance_returns_non_negative CHECK (returns_quantity >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_monthly_performance_returns_lte_sales'
  ) THEN
    ALTER TABLE public.product_monthly_performance
      ADD CONSTRAINT product_monthly_performance_returns_lte_sales CHECK (returns_quantity <= sales_quantity);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_monthly_performance_shipping_fee_non_negative'
  ) THEN
    ALTER TABLE public.product_monthly_performance
      ADD CONSTRAINT product_monthly_performance_shipping_fee_non_negative CHECK (shipping_fee >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_monthly_performance_tax_rate_range'
  ) THEN
    ALTER TABLE public.product_monthly_performance
      ADD CONSTRAINT product_monthly_performance_tax_rate_range CHECK (tax_rate >= 0 AND tax_rate <= 1);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_monthly_performance_packaging_cost_non_negative'
  ) THEN
    ALTER TABLE public.product_monthly_performance
      ADD CONSTRAINT product_monthly_performance_packaging_cost_non_negative CHECK (packaging_cost >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_monthly_performance_advertising_cost_non_negative'
  ) THEN
    ALTER TABLE public.product_monthly_performance
      ADD CONSTRAINT product_monthly_performance_advertising_cost_non_negative CHECK (advertising_cost >= 0);
  END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS product_monthly_performance_company_month_idx
  ON public.product_monthly_performance USING btree (company_id, reference_month);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS product_monthly_performance_org_month_idx
  ON public.product_monthly_performance USING btree (organization_id, reference_month);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS product_monthly_performance_channel_month_idx
  ON public.product_monthly_performance USING btree (channel, reference_month);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS product_monthly_performance_sku_idx
  ON public.product_monthly_performance USING btree (sku);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS product_monthly_performance_org_company_month_channel_sku_key
  ON public.product_monthly_performance USING btree (
    organization_id,
    company_id,
    reference_month,
    channel,
    sku
  );
--> statement-breakpoint
ALTER TABLE public.product_monthly_performance ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "Users can view own product performance" ON public.product_monthly_performance;
--> statement-breakpoint
CREATE POLICY "Users can view own product performance"
ON public.product_monthly_performance
FOR SELECT
TO authenticated
USING (auth.uid()::text = user_id);
--> statement-breakpoint
DROP POLICY IF EXISTS "Users can insert own product performance" ON public.product_monthly_performance;
--> statement-breakpoint
CREATE POLICY "Users can insert own product performance"
ON public.product_monthly_performance
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid()::text = user_id
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = company_id
      AND c.organization_id = organization_id
      AND c.user_id = auth.uid()::text
  )
);
--> statement-breakpoint
DROP POLICY IF EXISTS "Users can update own product performance" ON public.product_monthly_performance;
--> statement-breakpoint
CREATE POLICY "Users can update own product performance"
ON public.product_monthly_performance
FOR UPDATE
TO authenticated
USING (auth.uid()::text = user_id)
WITH CHECK (
  auth.uid()::text = user_id
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = company_id
      AND c.organization_id = organization_id
      AND c.user_id = auth.uid()::text
  )
);
--> statement-breakpoint
DROP POLICY IF EXISTS "Users can delete own product performance" ON public.product_monthly_performance;
--> statement-breakpoint
CREATE POLICY "Users can delete own product performance"
ON public.product_monthly_performance
FOR DELETE
TO authenticated
USING (auth.uid()::text = user_id);
