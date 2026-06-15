ALTER TABLE "subscriptions"
  ADD COLUMN IF NOT EXISTS "trial_start" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "subscriptions"
  ADD COLUMN IF NOT EXISTS "trial_end" timestamp with time zone;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "billing_trials" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "email" varchar(320) NOT NULL,
  "checkout_session_id" varchar(255),
  "interval" varchar(32),
  "reserved_until" timestamp with time zone,
  "redeemed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "billing_trials_user_id_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "billing_trials_user_id_key"
  ON "billing_trials" USING btree ("user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "billing_trials_email_key"
  ON "billing_trials" USING btree ("email");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "billing_trials_checkout_session_id_key"
  ON "billing_trials" USING btree ("checkout_session_id");
--> statement-breakpoint
INSERT INTO "billing_trials" (
  "user_id",
  "email",
  "checkout_session_id",
  "interval",
  "redeemed_at"
)
SELECT DISTINCT ON (pc.user_id)
  pc.user_id,
  lower(trim(u.email)),
  pc.checkout_session_id,
  pc.interval,
  COALESCE(pc.updated_at, now())
FROM "pending_checkouts" pc
INNER JOIN "user" u ON u.id = pc.user_id
WHERE pc.status IN ('confirmed', 'completed')
ORDER BY pc.user_id, pc.updated_at DESC
ON CONFLICT DO NOTHING;
