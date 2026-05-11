CREATE TABLE IF NOT EXISTS "pending_checkouts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "organization_id" uuid,
  "checkout_session_id" varchar(255) NOT NULL,
  "stripe_customer_id" varchar(255),
  "stripe_subscription_id" varchar(255),
  "plan_code" varchar(64) NOT NULL,
  "interval" varchar(32) DEFAULT 'monthly' NOT NULL,
  "status" varchar(32) DEFAULT 'created' NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "pending_checkouts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "pending_checkouts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action
);

CREATE INDEX IF NOT EXISTS "pending_checkouts_user_id_idx" ON "pending_checkouts" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "pending_checkouts_org_id_idx" ON "pending_checkouts" USING btree ("organization_id");
CREATE INDEX IF NOT EXISTS "pending_checkouts_user_status_idx" ON "pending_checkouts" USING btree ("user_id","status");
CREATE UNIQUE INDEX IF NOT EXISTS "pending_checkouts_checkout_session_id_key" ON "pending_checkouts" USING btree ("checkout_session_id");

DO $$
DECLARE
  template_org_id uuid;
BEGIN
  INSERT INTO public.organizations (
    id,
    name,
    slug,
    timezone
  )
  VALUES (
    '00000000-0000-0000-0000-000000000401',
    'Workspace Template Dev',
    'workspace-template-dev',
    'America/Sao_Paulo'
  )
  ON CONFLICT ("slug") DO NOTHING;

  SELECT id INTO template_org_id
  FROM public.organizations
  WHERE slug = 'workspace-template-dev'
  LIMIT 1;

  INSERT INTO public.marketplace_connections (
    id,
    organization_id,
    provider,
    status,
    external_account_id,
    metadata
  )
  VALUES (
    '00000000-0000-0000-0000-000000000402',
    template_org_id,
    'mercadolivre',
    'disconnected',
    'template-mercadolivre-store',
    jsonb_build_object('connectedAccountLabel', 'Conta template')
  )
  ON CONFLICT ("organization_id","provider") DO UPDATE
  SET
    status = EXCLUDED.status,
    access_token = NULL,
    refresh_token = NULL,
    token_expires_at = NULL,
    metadata = EXCLUDED.metadata,
    updated_at = now();

  INSERT INTO public.products (
    id,
    organization_id,
    name,
    sku,
    selling_price,
    is_active
  )
  VALUES
    ('00000000-0000-0000-0000-000000000411', template_org_id, 'Kit Etiquetas Premium', 'TPL-001', '149.90', true),
    ('00000000-0000-0000-0000-000000000412', template_org_id, 'Organizador Modular', 'TPL-002', '189.50', true),
    ('00000000-0000-0000-0000-000000000413', template_org_id, 'Suporte Compacto', 'TPL-003', '89.90', true)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.product_costs (
    id,
    organization_id,
    product_id,
    cost_type,
    amount,
    currency,
    effective_from,
    notes
  )
  VALUES
    ('00000000-0000-0000-0000-000000000421', template_org_id, '00000000-0000-0000-0000-000000000411', 'base', '42.80', 'BRL', '2026-05-01', 'Custo base template'),
    ('00000000-0000-0000-0000-000000000422', template_org_id, '00000000-0000-0000-0000-000000000412', 'base', '67.10', 'BRL', '2026-05-01', 'Custo base template'),
    ('00000000-0000-0000-0000-000000000423', template_org_id, '00000000-0000-0000-0000-000000000413', 'base', '25.40', 'BRL', '2026-05-01', 'Custo base template')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.external_products (
    id,
    organization_id,
    marketplace_connection_id,
    provider,
    external_product_id,
    sku,
    title,
    linked_product_id,
    review_status,
    metadata
  )
  VALUES
    ('00000000-0000-0000-0000-000000000431', template_org_id, '00000000-0000-0000-0000-000000000402', 'mercadolivre', 'MLB-TPL-001', 'TPL-001', 'Kit Etiquetas Premium - ML', '00000000-0000-0000-0000-000000000411', 'linked_to_existing_product', '{}'::jsonb),
    ('00000000-0000-0000-0000-000000000432', template_org_id, '00000000-0000-0000-0000-000000000402', 'mercadolivre', 'MLB-TPL-002', 'TPL-002', 'Organizador Modular - ML', '00000000-0000-0000-0000-000000000412', 'linked_to_existing_product', '{}'::jsonb)
  ON CONFLICT ("organization_id","provider","external_product_id") DO NOTHING;

  INSERT INTO public.external_orders (
    id,
    organization_id,
    marketplace_connection_id,
    sync_run_id,
    provider,
    external_order_id,
    status,
    currency,
    ordered_at,
    total_amount,
    metadata
  )
  VALUES
    ('00000000-0000-0000-0000-000000000441', template_org_id, '00000000-0000-0000-0000-000000000402', NULL, 'mercadolivre', 'MLB-ORDER-001', 'imported', 'BRL', '2026-05-02T13:20:00.000Z', '299.80', '{}'::jsonb),
    ('00000000-0000-0000-0000-000000000442', template_org_id, '00000000-0000-0000-0000-000000000402', NULL, 'mercadolivre', 'MLB-ORDER-002', 'imported', 'BRL', '2026-05-05T15:10:00.000Z', '189.50', '{}'::jsonb),
    ('00000000-0000-0000-0000-000000000443', template_org_id, '00000000-0000-0000-0000-000000000402', NULL, 'mercadolivre', 'MLB-ORDER-003', 'imported', 'BRL', '2026-05-07T18:40:00.000Z', '179.80', '{}'::jsonb)
  ON CONFLICT ("organization_id","provider","external_order_id") DO NOTHING;

  INSERT INTO public.external_order_items (
    id,
    organization_id,
    external_order_id,
    external_product_id,
    quantity,
    unit_price,
    total_price
  )
  VALUES
    ('00000000-0000-0000-0000-000000000451', template_org_id, '00000000-0000-0000-0000-000000000441', '00000000-0000-0000-0000-000000000431', 2, '149.90', '299.80'),
    ('00000000-0000-0000-0000-000000000452', template_org_id, '00000000-0000-0000-0000-000000000442', '00000000-0000-0000-0000-000000000432', 1, '189.50', '189.50'),
    ('00000000-0000-0000-0000-000000000453', template_org_id, '00000000-0000-0000-0000-000000000443', '00000000-0000-0000-0000-000000000431', 1, '149.90', '149.90'),
    ('00000000-0000-0000-0000-000000000454', template_org_id, '00000000-0000-0000-0000-000000000443', '00000000-0000-0000-0000-000000000432', 1, '29.90', '29.90')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.external_fees (
    id,
    organization_id,
    external_order_id,
    provider,
    fee_type,
    amount,
    currency,
    metadata
  )
  VALUES
    ('00000000-0000-0000-0000-000000000461', template_org_id, '00000000-0000-0000-0000-000000000441', 'mercadolivre', 'commission', '47.97', 'BRL', '{}'::jsonb),
    ('00000000-0000-0000-0000-000000000462', template_org_id, '00000000-0000-0000-0000-000000000442', 'mercadolivre', 'commission', '30.32', 'BRL', '{}'::jsonb),
    ('00000000-0000-0000-0000-000000000463', template_org_id, '00000000-0000-0000-0000-000000000443', 'mercadolivre', 'commission', '28.77', 'BRL', '{}'::jsonb)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.ad_costs (
    id,
    organization_id,
    product_id,
    channel,
    amount,
    currency,
    spent_at,
    notes
  )
  VALUES
    ('00000000-0000-0000-0000-000000000471', template_org_id, '00000000-0000-0000-0000-000000000411', 'mercadolivre', '34.90', 'BRL', '2026-05-03', 'Campanha template'),
    ('00000000-0000-0000-0000-000000000472', template_org_id, '00000000-0000-0000-0000-000000000412', 'mercadolivre', '21.50', 'BRL', '2026-05-06', 'Campanha template')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.manual_expenses (
    id,
    organization_id,
    category,
    amount,
    currency,
    incurred_at,
    notes
  )
  VALUES
    ('00000000-0000-0000-0000-000000000481', template_org_id, 'operacional', '120.00', 'BRL', '2026-05-04', 'Despesa fixa template')
  ON CONFLICT DO NOTHING;
END $$;
