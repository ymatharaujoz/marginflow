import { describe, expect, it } from "vitest";
import { readApiEnv } from "./api-env";

describe("readApiEnv", () => {
  it("requires DATABASE_URL", () => {
    expect(() =>
      readApiEnv({
        API_HOST: "127.0.0.1",
        API_PORT: "4000",
        API_DB_POOL_MAX: "5",
        BETTER_AUTH_SECRET: "secret",
        BETTER_AUTH_URL: "http://localhost:4000",
        GOOGLE_CLIENT_ID: "google-client-id",
        GOOGLE_CLIENT_SECRET: "google-client-secret",
        STRIPE_SECRET_KEY: "stripe",
        STRIPE_WEBHOOK_SECRET: "webhook",
        STRIPE_PRICE_MONTHLY: "price_monthly",
        STRIPE_PRICE_ANNUAL: "price_annual",
        NODE_ENV: "test",
        WEB_APP_ORIGIN: "http://localhost:3000",
      }),
    ).toThrow();
  });

  it("requires Better Auth and Google oauth configuration", () => {
    expect(() =>
      readApiEnv({
        API_HOST: "127.0.0.1",
        API_PORT: "4000",
        API_DB_POOL_MAX: "5",
        DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/marginflow",
        NODE_ENV: "test",
        WEB_APP_ORIGIN: "http://localhost:3000",
      }),
    ).toThrow();
  });

  it("parses DATABASE_URL when present", () => {
    const env = readApiEnv({
      API_HOST: "127.0.0.1",
      API_PORT: "4000",
      API_DB_POOL_MAX: "12",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/marginflow",
      BETTER_AUTH_SECRET: "secret",
      BETTER_AUTH_URL: "http://localhost:4000",
      GOOGLE_CLIENT_ID: "google-client-id",
      GOOGLE_CLIENT_SECRET: "google-client-secret",
      STRIPE_SECRET_KEY: "stripe",
      STRIPE_WEBHOOK_SECRET: "webhook",
      STRIPE_PRICE_MONTHLY: "price_monthly",
      STRIPE_PRICE_ANNUAL: "price_annual",
      NODE_ENV: "test",
      WEB_APP_ORIGIN: "http://localhost:3000",
    });

    expect(env.DATABASE_URL).toContain("marginflow");
    expect(env.BETTER_AUTH_URL).toBe("http://localhost:4000");
    expect(env.API_DB_POOL_MAX).toBe(12);
    expect(env.STRIPE_PRICE_MONTHLY).toBe("price_monthly");
    expect(env.STRIPE_PRICE_ANNUAL).toBe("price_annual");
  });

  it("normalizes trusted origins", async () => {
    const { readTrustedOriginList } = await import("./api-env");
    const env = readApiEnv({
      API_HOST: "127.0.0.1",
      API_PORT: "4000",
      API_DB_POOL_MAX: "5",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/marginflow",
      BETTER_AUTH_SECRET: "secret",
      BETTER_AUTH_URL: "http://localhost:4000",
      GOOGLE_CLIENT_ID: "google-client-id",
      GOOGLE_CLIENT_SECRET: "google-client-secret",
      STRIPE_SECRET_KEY: "stripe",
      STRIPE_WEBHOOK_SECRET: "webhook",
      STRIPE_PRICE_MONTHLY: "price_monthly",
      STRIPE_PRICE_ANNUAL: "price_annual",
      NODE_ENV: "test",
      WEB_APP_ORIGIN: "http://localhost:3000",
      AUTH_TRUSTED_ORIGINS: "http://localhost:3000, https://marginflow.app, https://admin.marginflow.app ",
    });

    expect(readTrustedOriginList(env)).toEqual([
      "http://localhost:3000",
      "https://marginflow.app",
      "https://admin.marginflow.app",
    ]);
  });
});
