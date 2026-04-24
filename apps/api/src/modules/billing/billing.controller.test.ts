import { UnauthorizedException } from "@nestjs/common";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { buildApp } from "@/app";
import { AuthService } from "@/modules/auth/auth.service";
import { BillingService } from "./billing.service";
import { EntitlementsService } from "./entitlements.service";

describe("billing controller", () => {
  let app: NestFastifyApplication;
  let authService: AuthService;
  let billingService: BillingService;
  let entitlementsService: EntitlementsService;

  beforeAll(async () => {
    app = await buildApp({
      API_DB_POOL_MAX: 5,
      API_HOST: "127.0.0.1",
      API_PORT: 4000,
      AUTH_TRUSTED_ORIGINS: "http://localhost:3000",
      BETTER_AUTH_SECRET: "secret",
      BETTER_AUTH_URL: "http://localhost:4000",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/marginflow",
      GOOGLE_CLIENT_ID: "google-client-id",
      GOOGLE_CLIENT_SECRET: "google-client-secret",
      NODE_ENV: "test",
      STRIPE_PRICE_ANNUAL: "price_annual",
      STRIPE_PRICE_MONTHLY: "price_monthly",
      STRIPE_SECRET_KEY: "stripe",
      STRIPE_WEBHOOK_SECRET: "webhook",
      WEB_APP_ORIGIN: "http://localhost:3000",
    });
    authService = app.get(AuthService);
    billingService = app.get(BillingService);
    entitlementsService = app.get(EntitlementsService);
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns organization billing snapshot for authenticated requests", async () => {
    vi.spyOn(authService, "requireRequestContext").mockResolvedValueOnce({
      organization: {
        id: "org_123",
        name: "Org",
        role: "owner",
        slug: "org",
      },
      session: {
        expiresAt: new Date("2026-04-22T00:00:00.000Z"),
        id: "session_123",
      },
      user: {
        email: "owner@marginflow.local",
        emailVerified: true,
        id: "user_123",
        image: null,
        name: "Mateus",
      },
    });
    vi.spyOn(entitlementsService, "getBillingSnapshot").mockResolvedValueOnce({
      customer: null,
      entitled: false,
      organizationId: "org_123",
      subscription: null,
    });

    const response = await app.inject({
      method: "GET",
      url: "/billing/subscription",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      data: {
        customer: null,
        entitled: false,
        organizationId: "org_123",
        subscription: null,
      },
      error: null,
    });
  });

  it("creates checkout sessions for authenticated requests", async () => {
    vi.spyOn(authService, "requireRequestContext").mockResolvedValueOnce({
      organization: {
        id: "org_123",
        name: "Org",
        role: "owner",
        slug: "org",
      },
      session: {
        expiresAt: new Date("2026-04-22T00:00:00.000Z"),
        id: "session_123",
      },
      user: {
        email: "owner@marginflow.local",
        emailVerified: true,
        id: "user_123",
        image: null,
        name: "Mateus",
      },
    });
    vi.spyOn(billingService, "createCheckoutSession").mockResolvedValueOnce({
      checkoutUrl: "https://checkout.stripe.test/session",
      sessionId: "cs_123",
    });

    const response = await app.inject({
      method: "POST",
      payload: {
        interval: "monthly",
      },
      url: "/billing/checkout",
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      data: {
        checkoutUrl: "https://checkout.stripe.test/session",
        sessionId: "cs_123",
      },
      error: null,
    });
  });

  it("rejects unauthenticated checkout requests", async () => {
    vi.spyOn(authService, "requireRequestContext").mockRejectedValueOnce(
      new UnauthorizedException("Authentication required."),
    );

    const response = await app.inject({
      method: "POST",
      payload: {
        interval: "monthly",
      },
      url: "/billing/checkout",
    });

    expect(response.statusCode).toBe(401);
  });
});
