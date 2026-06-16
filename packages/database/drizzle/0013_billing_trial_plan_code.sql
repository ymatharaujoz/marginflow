ALTER TABLE "billing_trials"
  ADD COLUMN IF NOT EXISTS "plan_code" varchar(64);
