import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import type { DatabaseClient } from "@marginflow/database";
import type { ApiRuntimeEnv } from "@/common/config/api-env";
import { readTrustedOriginList } from "@/common/config/api-env";

export function buildBetterAuth(db: DatabaseClient, env: ApiRuntimeEnv) {
  return betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: "pg",
    }),
    trustedOrigins: readTrustedOriginList(env),
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    },
  });
}
