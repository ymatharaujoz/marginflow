import type { ApiResponse } from "@marginflow/types";
import { databasePackage } from "@marginflow/database";
import { domainModule } from "@marginflow/domain";
import { validateServerEnv } from "@marginflow/validation/env";

const serverEnv = validateServerEnv({
  DATABASE_URL: "https://db.marginflow.local",
  BETTER_AUTH_SECRET: "secret",
  GOOGLE_CLIENT_ID: "google-client-id",
  GOOGLE_CLIENT_SECRET: "google-client-secret",
  STRIPE_SECRET_KEY: "stripe-secret",
  STRIPE_WEBHOOK_SECRET: "stripe-webhook-secret",
  SUPABASE_URL: "https://marginflow.supabase.co",
  SUPABASE_ANON_KEY: "anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
});

const response: ApiResponse<{ modules: string[] }> = {
  data: {
    modules: [domainModule.name, databasePackage.name],
  },
  error: null,
};

export const apiStub = {
  response,
  serverEnv,
  workspace: "api",
} as const;
