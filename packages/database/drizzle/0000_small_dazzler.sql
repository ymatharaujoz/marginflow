CREATE TABLE "ad_costs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"product_id" uuid,
	"channel" varchar(64) DEFAULT 'manual' NOT NULL,
	"amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"currency" varchar(8) DEFAULT 'BRL' NOT NULL,
	"spent_at" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" varchar(255) NOT NULL,
	"provider_id" varchar(64) NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"provider" varchar(32) DEFAULT 'stripe' NOT NULL,
	"external_customer_id" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"metric_date" date NOT NULL,
	"gross_revenue" numeric(14, 2) DEFAULT '0' NOT NULL,
	"net_revenue" numeric(14, 2) DEFAULT '0' NOT NULL,
	"net_profit" numeric(14, 2) DEFAULT '0' NOT NULL,
	"orders_count" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "external_fees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"external_order_id" uuid,
	"provider" varchar(32) NOT NULL,
	"fee_type" varchar(64) NOT NULL,
	"amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"currency" varchar(8) DEFAULT 'BRL' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "external_order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"external_order_id" uuid NOT NULL,
	"external_product_id" uuid,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_price" numeric(14, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "external_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"marketplace_connection_id" uuid,
	"sync_run_id" uuid,
	"provider" varchar(32) NOT NULL,
	"external_order_id" varchar(255) NOT NULL,
	"status" varchar(32) DEFAULT 'imported' NOT NULL,
	"currency" varchar(8) DEFAULT 'BRL' NOT NULL,
	"ordered_at" timestamp with time zone,
	"total_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "external_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"marketplace_connection_id" uuid,
	"provider" varchar(32) NOT NULL,
	"external_product_id" varchar(255) NOT NULL,
	"sku" varchar(128),
	"title" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "manual_expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"category" varchar(64) DEFAULT 'general' NOT NULL,
	"amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"currency" varchar(8) DEFAULT 'BRL' NOT NULL,
	"incurred_at" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"provider" varchar(32) NOT NULL,
	"status" varchar(32) DEFAULT 'disconnected' NOT NULL,
	"external_account_id" varchar(255),
	"access_token" text,
	"refresh_token" text,
	"token_expires_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(32) DEFAULT 'owner' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"timezone" varchar(64) DEFAULT 'America/Sao_Paulo' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_costs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"cost_type" varchar(32) DEFAULT 'base' NOT NULL,
	"amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"currency" varchar(8) DEFAULT 'BRL' NOT NULL,
	"effective_from" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"product_id" uuid,
	"metric_date" date NOT NULL,
	"units_sold" integer DEFAULT 0 NOT NULL,
	"gross_revenue" numeric(14, 2) DEFAULT '0' NOT NULL,
	"net_profit" numeric(14, 2) DEFAULT '0' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"sku" varchar(128),
	"selling_price" numeric(14, 2) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" varchar(64),
	"user_agent" text,
	"user_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"subscription_id" uuid,
	"provider" varchar(32) DEFAULT 'stripe' NOT NULL,
	"event_type" varchar(128) NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"billing_customer_id" uuid,
	"provider" varchar(32) DEFAULT 'stripe' NOT NULL,
	"external_subscription_id" varchar(255),
	"plan_code" varchar(64) NOT NULL,
	"status" varchar(32) DEFAULT 'inactive' NOT NULL,
	"interval" varchar(32) DEFAULT 'monthly' NOT NULL,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"marketplace_connection_id" uuid,
	"provider" varchar(32) NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"window_key" varchar(64),
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"error_summary" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(320) NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" varchar(255) NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ad_costs" ADD CONSTRAINT "ad_costs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_costs" ADD CONSTRAINT "ad_costs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_customers" ADD CONSTRAINT "billing_customers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_metrics" ADD CONSTRAINT "daily_metrics_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_fees" ADD CONSTRAINT "external_fees_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_fees" ADD CONSTRAINT "external_fees_external_order_id_external_orders_id_fk" FOREIGN KEY ("external_order_id") REFERENCES "public"."external_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_order_items" ADD CONSTRAINT "external_order_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_order_items" ADD CONSTRAINT "external_order_items_external_order_id_external_orders_id_fk" FOREIGN KEY ("external_order_id") REFERENCES "public"."external_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_order_items" ADD CONSTRAINT "external_order_items_external_product_id_external_products_id_fk" FOREIGN KEY ("external_product_id") REFERENCES "public"."external_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_orders" ADD CONSTRAINT "external_orders_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_orders" ADD CONSTRAINT "external_orders_marketplace_connection_id_marketplace_connections_id_fk" FOREIGN KEY ("marketplace_connection_id") REFERENCES "public"."marketplace_connections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_orders" ADD CONSTRAINT "external_orders_sync_run_id_sync_runs_id_fk" FOREIGN KEY ("sync_run_id") REFERENCES "public"."sync_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_products" ADD CONSTRAINT "external_products_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_products" ADD CONSTRAINT "external_products_marketplace_connection_id_marketplace_connections_id_fk" FOREIGN KEY ("marketplace_connection_id") REFERENCES "public"."marketplace_connections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_expenses" ADD CONSTRAINT "manual_expenses_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_connections" ADD CONSTRAINT "marketplace_connections_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_costs" ADD CONSTRAINT "product_costs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_costs" ADD CONSTRAINT "product_costs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_metrics" ADD CONSTRAINT "product_metrics_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_metrics" ADD CONSTRAINT "product_metrics_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_billing_customer_id_billing_customers_id_fk" FOREIGN KEY ("billing_customer_id") REFERENCES "public"."billing_customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_runs" ADD CONSTRAINT "sync_runs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_runs" ADD CONSTRAINT "sync_runs_marketplace_connection_id_marketplace_connections_id_fk" FOREIGN KEY ("marketplace_connection_id") REFERENCES "public"."marketplace_connections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ad_costs_organization_id_idx" ON "ad_costs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "account_provider_account_key" ON "account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "billing_customers_organization_id_idx" ON "billing_customers" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_customers_provider_external_id_key" ON "billing_customers" USING btree ("provider","external_customer_id");--> statement-breakpoint
CREATE INDEX "daily_metrics_organization_id_idx" ON "daily_metrics" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_metrics_org_date_key" ON "daily_metrics" USING btree ("organization_id","metric_date");--> statement-breakpoint
CREATE INDEX "external_fees_organization_id_idx" ON "external_fees" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "external_order_items_organization_id_idx" ON "external_order_items" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "external_orders_organization_id_idx" ON "external_orders" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "external_orders_org_provider_external_key" ON "external_orders" USING btree ("organization_id","provider","external_order_id");--> statement-breakpoint
CREATE INDEX "external_products_organization_id_idx" ON "external_products" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "external_products_org_provider_external_key" ON "external_products" USING btree ("organization_id","provider","external_product_id");--> statement-breakpoint
CREATE INDEX "manual_expenses_organization_id_idx" ON "manual_expenses" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "marketplace_connections_organization_id_idx" ON "marketplace_connections" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "marketplace_connections_org_provider_idx" ON "marketplace_connections" USING btree ("organization_id","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "marketplace_connections_org_provider_key" ON "marketplace_connections" USING btree ("organization_id","provider");--> statement-breakpoint
CREATE INDEX "organization_members_organization_id_idx" ON "organization_members" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_members_user_org_key" ON "organization_members" USING btree ("user_id","organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "product_costs_organization_id_idx" ON "product_costs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "product_metrics_organization_id_idx" ON "product_metrics" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "product_metrics_org_date_idx" ON "product_metrics" USING btree ("organization_id","metric_date");--> statement-breakpoint
CREATE INDEX "products_organization_id_idx" ON "products" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "products_org_active_idx" ON "products" USING btree ("organization_id","is_active");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "session_token_key" ON "session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "subscription_events_organization_id_idx" ON "subscription_events" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "subscriptions_organization_id_idx" ON "subscriptions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "subscriptions_organization_status_idx" ON "subscriptions" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "sync_runs_organization_id_idx" ON "sync_runs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "sync_runs_org_provider_created_idx" ON "sync_runs" USING btree ("organization_id","provider","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_key" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");
