import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { buildApp } from "@/app";

describe("health endpoint", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await buildApp({
      API_DB_POOL_MAX: 5,
      API_HOST: "127.0.0.1",
      API_PORT: 4000,
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
      SYNC_RELAX_GUARDS: false,
      WEB_APP_ORIGIN: "http://localhost:3000",
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns api health payload", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      data: expect.objectContaining({
        corsOrigin: "http://localhost:3000",
        service: "marginflow-api",
        status: "ok",
      }),
      error: null,
    });
  });

  it("allows configured web origin via cors", async () => {
    const response = await app.inject({
      method: "OPTIONS",
      url: "/health",
      headers: {
        origin: "http://localhost:3000",
        "access-control-request-method": "GET",
      },
    });

    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("allows extra trusted origins via cors", async () => {
    await app.close();
    app = await buildApp({
      API_DB_POOL_MAX: 5,
      API_HOST: "127.0.0.1",
      API_PORT: 4000,
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
      SYNC_RELAX_GUARDS: false,
      WEB_APP_ORIGIN: "http://localhost:3000",
      AUTH_TRUSTED_ORIGINS: "https://admin.marginflow.app",
    });

    const response = await app.inject({
      method: "OPTIONS",
      url: "/health",
      headers: {
        origin: "https://admin.marginflow.app",
        "access-control-request-method": "GET",
      },
    });

    expect(response.headers["access-control-allow-origin"]).toBe("https://admin.marginflow.app");
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
  });
});
