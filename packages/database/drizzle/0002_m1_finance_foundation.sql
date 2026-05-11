CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(12) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "companies_name_length" CHECK (char_length(trim("companies"."name")) >= 2),
	CONSTRAINT "companies_code_length" CHECK (char_length(trim("companies"."code")) between 2 and 12),
	CONSTRAINT "companies_code_uppercase" CHECK ("companies"."code" = upper("companies"."code"))
);
--> statement-breakpoint
CREATE TABLE "product_monthly_performance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"company_id" uuid NOT NULL,
	"reference_month" date NOT NULL,
	"channel" varchar(120) NOT NULL,
	"product_name" varchar(255) NOT NULL,
	"sku" varchar(128) NOT NULL,
	"sales_quantity" integer DEFAULT 0 NOT NULL,
	"returns_quantity" integer DEFAULT 0 NOT NULL,
	"unit_cost" numeric(12, 2) DEFAULT '0' NOT NULL,
	"sale_price" numeric(12, 2) NOT NULL,
	"commission_rate" numeric(8, 6) DEFAULT '0' NOT NULL,
	"shipping_fee" numeric(12, 2) DEFAULT '0' NOT NULL,
	"tax_rate" numeric(8, 6) DEFAULT '0' NOT NULL,
	"packaging_cost" numeric(12, 2) DEFAULT '0' NOT NULL,
	"advertising_cost" numeric(12, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_monthly_performance_reference_month_first_day" CHECK ("product_monthly_performance"."reference_month" = date_trunc('month', "product_monthly_performance"."reference_month")::date),
	CONSTRAINT "product_monthly_performance_channel_not_empty" CHECK (char_length(trim("product_monthly_performance"."channel")) >= 2),
	CONSTRAINT "product_monthly_performance_product_name_not_empty" CHECK (char_length(trim("product_monthly_performance"."product_name")) >= 2),
	CONSTRAINT "product_monthly_performance_sku_not_empty" CHECK (char_length(trim("product_monthly_performance"."sku")) >= 1),
	CONSTRAINT "product_monthly_performance_sales_non_negative" CHECK ("product_monthly_performance"."sales_quantity" >= 0),
	CONSTRAINT "product_monthly_performance_returns_non_negative" CHECK ("product_monthly_performance"."returns_quantity" >= 0),
	CONSTRAINT "product_monthly_performance_returns_lte_sales" CHECK ("product_monthly_performance"."returns_quantity" <= "product_monthly_performance"."sales_quantity"),
	CONSTRAINT "product_monthly_performance_unit_cost_non_negative" CHECK ("product_monthly_performance"."unit_cost" >= 0),
	CONSTRAINT "product_monthly_performance_sale_price_positive" CHECK ("product_monthly_performance"."sale_price" > 0),
	CONSTRAINT "product_monthly_performance_commission_rate_range" CHECK ("product_monthly_performance"."commission_rate" >= 0 and "product_monthly_performance"."commission_rate" <= 1),
	CONSTRAINT "product_monthly_performance_shipping_fee_non_negative" CHECK ("product_monthly_performance"."shipping_fee" >= 0),
	CONSTRAINT "product_monthly_performance_tax_rate_range" CHECK ("product_monthly_performance"."tax_rate" >= 0 and "product_monthly_performance"."tax_rate" <= 1),
	CONSTRAINT "product_monthly_performance_packaging_cost_non_negative" CHECK ("product_monthly_performance"."packaging_cost" >= 0),
	CONSTRAINT "product_monthly_performance_advertising_cost_non_negative" CHECK ("product_monthly_performance"."advertising_cost" >= 0)
);
--> statement-breakpoint
CREATE TABLE "fixed_costs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"company_id" uuid NOT NULL,
	"reference_month" date NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" varchar(120) DEFAULT 'general' NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"is_recurring" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fixed_costs_reference_month_first_day" CHECK ("fixed_costs"."reference_month" = date_trunc('month', "fixed_costs"."reference_month")::date),
	CONSTRAINT "fixed_costs_name_not_empty" CHECK (char_length(trim("fixed_costs"."name")) >= 2),
	CONSTRAINT "fixed_costs_category_not_empty" CHECK (char_length(trim("fixed_costs"."category")) >= 2),
	CONSTRAINT "fixed_costs_amount_non_negative" CHECK ("fixed_costs"."amount" >= 0)
);
--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "product_monthly_performance" ADD CONSTRAINT "product_monthly_performance_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "product_monthly_performance" ADD CONSTRAINT "product_monthly_performance_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "product_monthly_performance" ADD CONSTRAINT "product_monthly_performance_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "fixed_costs" ADD CONSTRAINT "fixed_costs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "fixed_costs" ADD CONSTRAINT "fixed_costs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "fixed_costs" ADD CONSTRAINT "fixed_costs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "companies_organization_id_idx" ON "companies" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "companies_user_id_idx" ON "companies" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "companies_org_is_active_idx" ON "companies" USING btree ("organization_id","is_active");
--> statement-breakpoint
CREATE UNIQUE INDEX "companies_org_code_key" ON "companies" USING btree ("organization_id","code");
--> statement-breakpoint
CREATE INDEX "product_monthly_performance_organization_id_idx" ON "product_monthly_performance" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "product_monthly_performance_user_id_idx" ON "product_monthly_performance" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "product_monthly_performance_company_month_idx" ON "product_monthly_performance" USING btree ("company_id","reference_month");
--> statement-breakpoint
CREATE INDEX "product_monthly_performance_org_month_idx" ON "product_monthly_performance" USING btree ("organization_id","reference_month");
--> statement-breakpoint
CREATE INDEX "product_monthly_performance_channel_month_idx" ON "product_monthly_performance" USING btree ("channel","reference_month");
--> statement-breakpoint
CREATE INDEX "product_monthly_performance_sku_idx" ON "product_monthly_performance" USING btree ("sku");
--> statement-breakpoint
CREATE UNIQUE INDEX "product_monthly_performance_org_company_month_channel_sku_key" ON "product_monthly_performance" USING btree ("organization_id","company_id","reference_month","channel","sku");
--> statement-breakpoint
CREATE INDEX "fixed_costs_organization_id_idx" ON "fixed_costs" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "fixed_costs_user_id_idx" ON "fixed_costs" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "fixed_costs_company_month_idx" ON "fixed_costs" USING btree ("company_id","reference_month");
--> statement-breakpoint
CREATE INDEX "fixed_costs_org_month_idx" ON "fixed_costs" USING btree ("organization_id","reference_month");
--> statement-breakpoint
CREATE INDEX "fixed_costs_category_idx" ON "fixed_costs" USING btree ("category");
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER set_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint
CREATE TRIGGER set_product_monthly_performance_updated_at
BEFORE UPDATE ON public.product_monthly_performance
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint
CREATE TRIGGER set_fixed_costs_updated_at
BEFORE UPDATE ON public.fixed_costs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.product_monthly_performance ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.fixed_costs ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "Users can view own companies"
ON public.companies
FOR SELECT
TO authenticated
USING (auth.uid()::text = user_id);
--> statement-breakpoint
CREATE POLICY "Users can insert own companies"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = user_id);
--> statement-breakpoint
CREATE POLICY "Users can update own companies"
ON public.companies
FOR UPDATE
TO authenticated
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);
--> statement-breakpoint
CREATE POLICY "Users can delete own companies"
ON public.companies
FOR DELETE
TO authenticated
USING (auth.uid()::text = user_id);
--> statement-breakpoint
CREATE POLICY "Users can view own product performance"
ON public.product_monthly_performance
FOR SELECT
TO authenticated
USING (auth.uid()::text = user_id);
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
CREATE POLICY "Users can delete own product performance"
ON public.product_monthly_performance
FOR DELETE
TO authenticated
USING (auth.uid()::text = user_id);
--> statement-breakpoint
CREATE POLICY "Users can view own fixed costs"
ON public.fixed_costs
FOR SELECT
TO authenticated
USING (auth.uid()::text = user_id);
--> statement-breakpoint
CREATE POLICY "Users can insert own fixed costs"
ON public.fixed_costs
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
CREATE POLICY "Users can update own fixed costs"
ON public.fixed_costs
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
CREATE POLICY "Users can delete own fixed costs"
ON public.fixed_costs
FOR DELETE
TO authenticated
USING (auth.uid()::text = user_id);
