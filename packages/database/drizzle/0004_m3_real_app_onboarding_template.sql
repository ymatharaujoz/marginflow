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
