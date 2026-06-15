import { describe, expect, it } from "vitest";
import { readApiEnv } from "./api-env";

const runtimeUrl =
  "postgresql://postgres.project-ref:runtime-pass@aws-0-us-east-1.pooler.supabase.com:6543/postgres";

describe("readApiEnv", () => {
  it("requires DATABASE_URL", () => {
    expect(() =>
      readApiEnv({
        API_HOST: "127.0.0.1",
        API_PORT: "4000",
        API_DB_POOL_MAX: "5",
        STRIPE_SECRET_KEY: "stripe",
        STRIPE_WEBHOOK_SECRET: "webhook",
        STRIPE_PRICE_MONTHLY: "price_monthly",
        STRIPE_PRICE_ANNUAL: "price_annual",
        NODE_ENV: "test",
        WEB_APP_ORIGIN: "http://localhost:3000",
      }),
    ).toThrow();
  });

  it("parses required internal auth runtime configuration without Google or Better Auth", () => {
    const env = readApiEnv({
      API_HOST: "127.0.0.1",
      API_PORT: "4000",
      API_DB_POOL_MAX: "12",
      API_PUBLIC_BASE_URL: "http://localhost:4000",
      DATABASE_URL: runtimeUrl,
      STRIPE_SECRET_KEY: "stripe",
      STRIPE_WEBHOOK_SECRET: "webhook",
      STRIPE_PRICE_MONTHLY: "price_monthly",
      STRIPE_PRICE_ANNUAL: "price_annual",
      NODE_ENV: "test",
      WEB_APP_ORIGIN: "http://localhost:3000",
    });

    expect(env.DATABASE_URL).toBe(runtimeUrl);
    expect(env.API_PUBLIC_BASE_URL).toBe("http://localhost:4000");
    expect(env.API_DB_POOL_MAX).toBe(12);
    expect(env.AUTH_SESSION_SECRET).toBeUndefined();
    expect(env.BETTER_AUTH_URL).toBeUndefined();
    expect(env.GOOGLE_CLIENT_ID).toBeUndefined();
  });

  it("accepts optional legacy Better Auth and Google config without requiring it", () => {
    const env = readApiEnv({
      API_HOST: "127.0.0.1",
      API_PORT: "4000",
      API_DB_POOL_MAX: "12",
      DATABASE_URL: runtimeUrl,
      BETTER_AUTH_SECRET: "secret",
      BETTER_AUTH_URL: "http://localhost:4000/auth",
      GOOGLE_CLIENT_ID: "google-client-id",
      GOOGLE_CLIENT_SECRET: "google-client-secret",
      STRIPE_SECRET_KEY: "stripe",
      STRIPE_WEBHOOK_SECRET: "webhook",
      STRIPE_PRICE_MONTHLY: "price_monthly",
      STRIPE_PRICE_ANNUAL: "price_annual",
      NODE_ENV: "test",
      WEB_APP_ORIGIN: "http://localhost:3000",
    });

    expect(env.BETTER_AUTH_SECRET).toBe("secret");
    expect(env.BETTER_AUTH_URL).toBe("http://localhost:4000/auth");
    expect(env.GOOGLE_CLIENT_ID).toBe("google-client-id");
  });

  it("accepts optional Mercado Livre oauth configuration", () => {
    const env = readApiEnv({
      API_HOST: "127.0.0.1",
      API_PORT: "4000",
      API_DB_POOL_MAX: "12",
      DATABASE_URL: runtimeUrl,
      MERCADOLIVRE_CLIENT_ID: "ml-client-id",
      MERCADOLIVRE_CLIENT_SECRET: "ml-client-secret",
      MERCADOLIVRE_REDIRECT_URI: "http://localhost:4000/integrations/mercadolivre/callback",
      MERCADOLIVRE_USE_PKCE: "true",
      STRIPE_SECRET_KEY: "stripe",
      STRIPE_WEBHOOK_SECRET: "webhook",
      STRIPE_PRICE_MONTHLY: "price_monthly",
      STRIPE_PRICE_ANNUAL: "price_annual",
      NODE_ENV: "test",
      WEB_APP_ORIGIN: "http://localhost:3000",
    });

    expect(env.MERCADOLIVRE_CLIENT_ID).toBe("ml-client-id");
    expect(env.MERCADOLIVRE_REDIRECT_URI).toBe(
      "http://localhost:4000/integrations/mercadolivre/callback",
    );
    expect(env.MERCADOLIVRE_USE_PKCE).toBe(true);
  });

  it("parses SYNC_RELAX_GUARDS", () => {
    const base = {
      API_HOST: "127.0.0.1",
      API_PORT: "4000",
      API_DB_POOL_MAX: "5",
      DATABASE_URL: runtimeUrl,
      STRIPE_SECRET_KEY: "stripe",
      STRIPE_WEBHOOK_SECRET: "webhook",
      STRIPE_PRICE_MONTHLY: "price_monthly",
      STRIPE_PRICE_ANNUAL: "price_annual",
      NODE_ENV: "test",
      WEB_APP_ORIGIN: "http://localhost:3000",
    } as const;

    expect(readApiEnv({ ...base }).SYNC_RELAX_GUARDS).toBe(false);
    expect(readApiEnv({ ...base, SYNC_RELAX_GUARDS: "true" }).SYNC_RELAX_GUARDS).toBe(true);
    expect(readApiEnv({ ...base, SYNC_RELAX_GUARDS: "1" }).SYNC_RELAX_GUARDS).toBe(true);
    expect(readApiEnv({ ...base, SYNC_RELAX_GUARDS: "false" }).SYNC_RELAX_GUARDS).toBe(false);
  });

  it("normalizes trusted origins", async () => {
    const { readTrustedOriginList } = await import("./api-env");
    const env = readApiEnv({
      API_HOST: "127.0.0.1",
      API_PORT: "4000",
      API_DB_POOL_MAX: "5",
      DATABASE_URL: runtimeUrl,
      STRIPE_SECRET_KEY: "stripe",
      STRIPE_WEBHOOK_SECRET: "webhook",
      STRIPE_PRICE_MONTHLY: "price_monthly",
      STRIPE_PRICE_ANNUAL: "price_annual",
      NODE_ENV: "test",
      WEB_APP_ORIGIN: "http://localhost:3000",
      AUTH_TRUSTED_ORIGINS: "http://localhost:3000, https://lucreii.app, https://admin.lucreii.app ",
    });

    expect(readTrustedOriginList(env)).toEqual([
      "http://localhost:3000",
      "https://lucreii.app",
      "https://admin.lucreii.app",
    ]);
  });

  it("reports warning when Mercado Livre callback host differs from API public host in local flow", async () => {
    const { readMercadoLivreOauthWarnings } = await import("./api-env");
    const env = readApiEnv({
      API_HOST: "127.0.0.1",
      API_PORT: "4000",
      API_DB_POOL_MAX: "5",
      API_PUBLIC_BASE_URL: "http://localhost:4000",
      DATABASE_URL: runtimeUrl,
      MERCADOLIVRE_CLIENT_ID: "ml-client-id",
      MERCADOLIVRE_CLIENT_SECRET: "ml-client-secret",
      MERCADOLIVRE_REDIRECT_URI: "https://demo.ngrok-free.dev/integrations/mercadolivre/callback",
      STRIPE_SECRET_KEY: "stripe",
      STRIPE_WEBHOOK_SECRET: "webhook",
      STRIPE_PRICE_MONTHLY: "price_monthly",
      STRIPE_PRICE_ANNUAL: "price_annual",
      NODE_ENV: "test",
      WEB_APP_ORIGIN: "http://localhost:3000",
    });

    expect(readMercadoLivreOauthWarnings(env)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("callback host"),
        expect.stringContaining("Fluxo local Mercado Livre detectado"),
      ]),
    );
  });
});
