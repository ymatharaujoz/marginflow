import { z } from "zod";

function emptyToUndef(value: unknown): unknown {
  if (typeof value === "string" && value.trim() === "") return undefined;
  return value;
}

function parseEnvBool(value: unknown): boolean {
  if (value === undefined || value === null || value === "") {
    return false;
  }

  const normalized = String(value).trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

const apiEnvSchema = z.object({
  API_HOST: z.string().min(1).default("0.0.0.0"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  API_DB_POOL_MAX: z.coerce.number().int().positive().max(50).default(10),
  API_PUBLIC_BASE_URL: z.string().url().optional(),
  DATABASE_URL: z.string().url(),
  AUTH_SESSION_SECRET: z.string().min(1).optional(),
  BETTER_AUTH_SECRET: z.string().min(1).optional(),
  BETTER_AUTH_URL: z.string().url().optional(),
  BETTER_AUTH_API_KEY: z.preprocess(emptyToUndef, z.string().min(1).optional()),
  MERCADOLIVRE_CLIENT_ID: z.preprocess(emptyToUndef, z.string().min(1).optional()),
  MERCADOLIVRE_CLIENT_SECRET: z.preprocess(emptyToUndef, z.string().min(1).optional()),
  MERCADOLIVRE_REDIRECT_URI: z.preprocess(emptyToUndef, z.string().url().optional()),
  MERCADOLIVRE_USE_PKCE: z.preprocess(parseEnvBool, z.boolean()).optional(),
  SHOPEE_PARTNER_ID: z.preprocess(emptyToUndef, z.coerce.number().int().positive().optional()),
  SHOPEE_PARTNER_KEY: z.preprocess(emptyToUndef, z.string().min(1).optional()),
  SHOPEE_REDIRECT_URI: z.preprocess(emptyToUndef, z.string().url().optional()),
  SHOPEE_WEBHOOK_URL: z.preprocess(emptyToUndef, z.string().url().optional()),
  SHEIN_APP_ID: z.preprocess(emptyToUndef, z.string().min(1).optional()),
  SHEIN_APP_SECRET: z.preprocess(emptyToUndef, z.string().min(1).optional()),
  SHEIN_AUTHORIZATION_URL: z.preprocess(emptyToUndef, z.string().url().optional()),
  SHEIN_API_BASE_URL: z.preprocess(emptyToUndef, z.string().url().optional()),
  SHEIN_REDIRECT_URI: z.preprocess(emptyToUndef, z.string().url().optional()),
  SHEIN_WEBHOOK_URL: z.preprocess(emptyToUndef, z.string().url().optional()),
  WEB_APP_ORIGIN: z.string().url().default("http://localhost:3000"),
  AUTH_TRUSTED_ORIGINS: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_PRICE_START_MONTHLY: z.string().min(1),
  STRIPE_PRICE_START_ANNUAL: z.string().min(1),
  STRIPE_PRICE_PRO_MONTHLY: z.string().min(1),
  STRIPE_PRICE_PRO_ANNUAL: z.string().min(1),
  STRIPE_PRICE_BUSINESS_MONTHLY: z.string().min(1),
  STRIPE_PRICE_BUSINESS_ANNUAL: z.string().min(1),
  STRIPE_PRICE_MONTHLY: z.string().min(1).optional(),
  STRIPE_PRICE_ANNUAL: z.string().min(1).optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  /**
   * When true (never honored when `NODE_ENV` is `production`), sync skips overnight closure and
   * “window already used” blocks so integrations can be exercised without waiting on São Paulo windows.
   */
  SYNC_RELAX_GUARDS: z.preprocess(parseEnvBool, z.boolean()).default(false),
});

export type ApiRuntimeEnv = z.infer<typeof apiEnvSchema>;

export function readApiEnv(
  source: Record<string, string | undefined> = process.env,
): ApiRuntimeEnv {
  return apiEnvSchema.parse({
    API_HOST: source.API_HOST,
    API_PORT: source.API_PORT ?? source.PORT,
    API_DB_POOL_MAX: source.API_DB_POOL_MAX,
    API_PUBLIC_BASE_URL: source.API_PUBLIC_BASE_URL,
    DATABASE_URL: source.DATABASE_URL,
    AUTH_SESSION_SECRET: source.AUTH_SESSION_SECRET,
    BETTER_AUTH_SECRET: source.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: source.BETTER_AUTH_URL,
    BETTER_AUTH_API_KEY: source.BETTER_AUTH_API_KEY,
    MERCADOLIVRE_CLIENT_ID: source.MERCADOLIVRE_CLIENT_ID,
    MERCADOLIVRE_CLIENT_SECRET: source.MERCADOLIVRE_CLIENT_SECRET,
    MERCADOLIVRE_REDIRECT_URI: source.MERCADOLIVRE_REDIRECT_URI,
    MERCADOLIVRE_USE_PKCE: source.MERCADOLIVRE_USE_PKCE,
    SHOPEE_PARTNER_ID: source.SHOPEE_PARTNER_ID,
    SHOPEE_PARTNER_KEY: source.SHOPEE_PARTNER_KEY,
    SHOPEE_REDIRECT_URI: source.SHOPEE_REDIRECT_URI,
    SHOPEE_WEBHOOK_URL: source.SHOPEE_WEBHOOK_URL,
    SHEIN_APP_ID: source.SHEIN_APP_ID,
    SHEIN_APP_SECRET: source.SHEIN_APP_SECRET,
    SHEIN_AUTHORIZATION_URL: source.SHEIN_AUTHORIZATION_URL,
    SHEIN_API_BASE_URL: source.SHEIN_API_BASE_URL,
    SHEIN_REDIRECT_URI: source.SHEIN_REDIRECT_URI,
    SHEIN_WEBHOOK_URL: source.SHEIN_WEBHOOK_URL,
    WEB_APP_ORIGIN: source.WEB_APP_ORIGIN,
    AUTH_TRUSTED_ORIGINS: source.AUTH_TRUSTED_ORIGINS,
    STRIPE_SECRET_KEY: source.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: source.STRIPE_WEBHOOK_SECRET,
    STRIPE_PRICE_START_MONTHLY: source.STRIPE_PRICE_START_MONTHLY,
    STRIPE_PRICE_START_ANNUAL: source.STRIPE_PRICE_START_ANNUAL,
    STRIPE_PRICE_PRO_MONTHLY: source.STRIPE_PRICE_PRO_MONTHLY,
    STRIPE_PRICE_PRO_ANNUAL: source.STRIPE_PRICE_PRO_ANNUAL,
    STRIPE_PRICE_BUSINESS_MONTHLY: source.STRIPE_PRICE_BUSINESS_MONTHLY,
    STRIPE_PRICE_BUSINESS_ANNUAL: source.STRIPE_PRICE_BUSINESS_ANNUAL,
    STRIPE_PRICE_MONTHLY: source.STRIPE_PRICE_MONTHLY,
    STRIPE_PRICE_ANNUAL: source.STRIPE_PRICE_ANNUAL,
    NODE_ENV: source.NODE_ENV,
    SYNC_RELAX_GUARDS: source.SYNC_RELAX_GUARDS,
  });
}

export function readTrustedOriginList(env: ApiRuntimeEnv) {
  const configuredOrigins = env.AUTH_TRUSTED_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return Array.from(new Set([env.WEB_APP_ORIGIN, ...(configuredOrigins ?? [])]));
}

export function readMercadoLivreOauthWarnings(env: ApiRuntimeEnv) {
  if (!env.MERCADOLIVRE_CLIENT_ID || !env.MERCADOLIVRE_CLIENT_SECRET) {
    return [];
  }

  const warnings: string[] = [];
  const callbackUrl = new URL(
    env.MERCADOLIVRE_REDIRECT_URI ??
      `${(env.API_PUBLIC_BASE_URL ?? env.BETTER_AUTH_URL ?? "http://localhost:4000").replace(/\/$/, "")}/integrations/mercadolivre/callback`,
  );
  const apiUrl = new URL(env.API_PUBLIC_BASE_URL ?? env.BETTER_AUTH_URL ?? "http://localhost:4000");
  const webUrl = new URL(env.WEB_APP_ORIGIN);

  if (callbackUrl.host !== apiUrl.host) {
    warnings.push(
      `Mercado Livre callback host (${callbackUrl.host}) difere do host publico da API (${apiUrl.host}). Isso so funciona se esse host publico encaminhar para esta API.`,
    );
  }

  if (
    (webUrl.hostname === "localhost" || webUrl.hostname === "127.0.0.1") &&
    callbackUrl.hostname !== "localhost" &&
    callbackUrl.hostname !== "127.0.0.1"
  ) {
    warnings.push(
      "Fluxo local Mercado Livre detectado: web em localhost com callback publico. Verifique se o dominio do tunnel aponta para a API local e se a mesma callback esta cadastrada no app do Mercado Livre.",
    );
  }

  return warnings;
}
