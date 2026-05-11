ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.companies FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.product_monthly_performance ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.product_monthly_performance FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.fixed_costs ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.fixed_costs FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "Users can view own companies" ON public.companies;
--> statement-breakpoint
DROP POLICY IF EXISTS "Users can insert own companies" ON public.companies;
--> statement-breakpoint
DROP POLICY IF EXISTS "Users can update own companies" ON public.companies;
--> statement-breakpoint
DROP POLICY IF EXISTS "Users can delete own companies" ON public.companies;
--> statement-breakpoint
DROP POLICY IF EXISTS "Users can view own product performance" ON public.product_monthly_performance;
--> statement-breakpoint
DROP POLICY IF EXISTS "Users can insert own product performance" ON public.product_monthly_performance;
--> statement-breakpoint
DROP POLICY IF EXISTS "Users can update own product performance" ON public.product_monthly_performance;
--> statement-breakpoint
DROP POLICY IF EXISTS "Users can delete own product performance" ON public.product_monthly_performance;
--> statement-breakpoint
DROP POLICY IF EXISTS "Users can view own fixed costs" ON public.fixed_costs;
--> statement-breakpoint
DROP POLICY IF EXISTS "Users can insert own fixed costs" ON public.fixed_costs;
--> statement-breakpoint
DROP POLICY IF EXISTS "Users can update own fixed costs" ON public.fixed_costs;
--> statement-breakpoint
DROP POLICY IF EXISTS "Users can delete own fixed costs" ON public.fixed_costs;
--> statement-breakpoint
CREATE POLICY "Members can view own companies"
ON public.companies
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()::text
  AND EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = companies.organization_id
      AND om.user_id = auth.uid()::text
  )
);
--> statement-breakpoint
CREATE POLICY "Members can insert own companies"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()::text
  AND EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = companies.organization_id
      AND om.user_id = auth.uid()::text
  )
);
--> statement-breakpoint
CREATE POLICY "Members can update own companies"
ON public.companies
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()::text
  AND EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = companies.organization_id
      AND om.user_id = auth.uid()::text
  )
)
WITH CHECK (
  user_id = auth.uid()::text
  AND EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = companies.organization_id
      AND om.user_id = auth.uid()::text
  )
);
--> statement-breakpoint
CREATE POLICY "Members can delete own companies"
ON public.companies
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()::text
  AND EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = companies.organization_id
      AND om.user_id = auth.uid()::text
  )
);
--> statement-breakpoint
CREATE POLICY "Members can view own product performance"
ON public.product_monthly_performance
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()::text
  AND EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = product_monthly_performance.organization_id
      AND om.user_id = auth.uid()::text
  )
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = product_monthly_performance.company_id
      AND c.organization_id = product_monthly_performance.organization_id
      AND c.user_id = auth.uid()::text
  )
);
--> statement-breakpoint
CREATE POLICY "Members can insert own product performance"
ON public.product_monthly_performance
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()::text
  AND EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = product_monthly_performance.organization_id
      AND om.user_id = auth.uid()::text
  )
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = product_monthly_performance.company_id
      AND c.organization_id = product_monthly_performance.organization_id
      AND c.user_id = auth.uid()::text
  )
);
--> statement-breakpoint
CREATE POLICY "Members can update own product performance"
ON public.product_monthly_performance
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()::text
  AND EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = product_monthly_performance.organization_id
      AND om.user_id = auth.uid()::text
  )
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = product_monthly_performance.company_id
      AND c.organization_id = product_monthly_performance.organization_id
      AND c.user_id = auth.uid()::text
  )
)
WITH CHECK (
  user_id = auth.uid()::text
  AND EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = product_monthly_performance.organization_id
      AND om.user_id = auth.uid()::text
  )
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = product_monthly_performance.company_id
      AND c.organization_id = product_monthly_performance.organization_id
      AND c.user_id = auth.uid()::text
  )
);
--> statement-breakpoint
CREATE POLICY "Members can delete own product performance"
ON public.product_monthly_performance
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()::text
  AND EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = product_monthly_performance.organization_id
      AND om.user_id = auth.uid()::text
  )
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = product_monthly_performance.company_id
      AND c.organization_id = product_monthly_performance.organization_id
      AND c.user_id = auth.uid()::text
  )
);
--> statement-breakpoint
CREATE POLICY "Members can view own fixed costs"
ON public.fixed_costs
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()::text
  AND EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = fixed_costs.organization_id
      AND om.user_id = auth.uid()::text
  )
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = fixed_costs.company_id
      AND c.organization_id = fixed_costs.organization_id
      AND c.user_id = auth.uid()::text
  )
);
--> statement-breakpoint
CREATE POLICY "Members can insert own fixed costs"
ON public.fixed_costs
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()::text
  AND EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = fixed_costs.organization_id
      AND om.user_id = auth.uid()::text
  )
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = fixed_costs.company_id
      AND c.organization_id = fixed_costs.organization_id
      AND c.user_id = auth.uid()::text
  )
);
--> statement-breakpoint
CREATE POLICY "Members can update own fixed costs"
ON public.fixed_costs
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()::text
  AND EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = fixed_costs.organization_id
      AND om.user_id = auth.uid()::text
  )
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = fixed_costs.company_id
      AND c.organization_id = fixed_costs.organization_id
      AND c.user_id = auth.uid()::text
  )
)
WITH CHECK (
  user_id = auth.uid()::text
  AND EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = fixed_costs.organization_id
      AND om.user_id = auth.uid()::text
  )
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = fixed_costs.company_id
      AND c.organization_id = fixed_costs.organization_id
      AND c.user_id = auth.uid()::text
  )
);
--> statement-breakpoint
CREATE POLICY "Members can delete own fixed costs"
ON public.fixed_costs
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()::text
  AND EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = fixed_costs.organization_id
      AND om.user_id = auth.uid()::text
  )
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = fixed_costs.company_id
      AND c.organization_id = fixed_costs.organization_id
      AND c.user_id = auth.uid()::text
  )
);
