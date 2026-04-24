import { z } from "zod";

const apiEnvSchema = z.object({
  API_HOST: z.string().min(1).default("0.0.0.0"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  API_DB_POOL_MAX: z.coerce.number().int().positive().max(50).default(10),
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.string().url(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  WEB_APP_ORIGIN: z.string().url().default("http://localhost:3000"),
  AUTH_TRUSTED_ORIGINS: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_PRICE_MONTHLY: z.string().min(1),
  STRIPE_PRICE_ANNUAL: z.string().min(1),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type ApiRuntimeEnv = z.infer<typeof apiEnvSchema>;

export function readApiEnv(
  source: Record<string, string | undefined> = process.env,
): ApiRuntimeEnv {
  return apiEnvSchema.parse({
    API_HOST: source.API_HOST,
    API_PORT: source.API_PORT,
    API_DB_POOL_MAX: source.API_DB_POOL_MAX,
    DATABASE_URL: source.DATABASE_URL,
    BETTER_AUTH_SECRET: source.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: source.BETTER_AUTH_URL ?? source.NEXT_PUBLIC_API_BASE_URL,
    GOOGLE_CLIENT_ID: source.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: source.GOOGLE_CLIENT_SECRET,
    WEB_APP_ORIGIN: source.WEB_APP_ORIGIN ?? source.NEXT_PUBLIC_APP_URL,
    AUTH_TRUSTED_ORIGINS: source.AUTH_TRUSTED_ORIGINS,
    STRIPE_SECRET_KEY: source.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: source.STRIPE_WEBHOOK_SECRET,
    STRIPE_PRICE_MONTHLY: source.STRIPE_PRICE_MONTHLY,
    STRIPE_PRICE_ANNUAL: source.STRIPE_PRICE_ANNUAL,
    NODE_ENV: source.NODE_ENV,
  });
}

export function readTrustedOriginList(env: ApiRuntimeEnv) {
  const configuredOrigins = env.AUTH_TRUSTED_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return Array.from(new Set([env.WEB_APP_ORIGIN, ...(configuredOrigins ?? [])]));
}
