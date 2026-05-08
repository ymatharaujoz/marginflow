import { UnauthorizedException } from "@nestjs/common";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { buildApp } from "@/app";
import { AuthService } from "@/modules/auth/auth.service";
import { BillingService } from "@/modules/billing/billing.service";
import { EntitlementsService } from "@/modules/billing/entitlements.service";
import { ProductsService } from "./products.service";

const authContext = {
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
};

describe("costs controller", () => {
  let app: NestFastifyApplication;
  let authService: AuthService;
  let billingService: BillingService;
  let entitlementsService: EntitlementsService;
  let productsService: ProductsService;

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
      SYNC_RELAX_GUARDS: false,
      WEB_APP_ORIGIN: "http://localhost:3000",
    });
    authService = app.get(AuthService);
    billingService = app.get(BillingService);
    entitlementsService = app.get(EntitlementsService);
    productsService = app.get(ProductsService);
    vi.spyOn(billingService, "reconcileOrganizationSubscriptionWithStripe").mockResolvedValue(undefined);
  });

  afterAll(async () => {
    await app.close();
  });

  it("creates product cost entries for authenticated requests", async () => {
    vi.spyOn(authService, "requireRequestContext").mockResolvedValueOnce(authContext);
    vi.spyOn(entitlementsService, "requireActiveEntitlement").mockResolvedValueOnce({
      customer: null,
      entitled: true,
      organizationId: "org_123",
      subscription: null,
    });
    vi.spyOn(productsService, "createProductCost").mockResolvedValueOnce({
      amount: "12.00",
      costType: "base",
      createdAt: "2026-04-28T10:00:00.000Z",
      currency: "BRL",
      effectiveFrom: "2026-04-28",
      id: "cost_1",
      notes: null,
      organizationId: "org_123",
      productId: "product_1",
      updatedAt: "2026-04-28T10:00:00.000Z",
    });

    const response = await app.inject({
      method: "POST",
      payload: {
        amount: "12.00",
        costType: "base",
        currency: "BRL",
        effectiveFrom: "2026-04-28",
        notes: null,
        productId: "550e8400-e29b-41d4-a716-446655440000",
      },
      url: "/costs/products",
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().data).toEqual(expect.objectContaining({ id: "cost_1" }));
  });

  it("rejects invalid ad cost payloads", async () => {
    vi.spyOn(authService, "requireRequestContext").mockResolvedValueOnce(authContext);
    vi.spyOn(entitlementsService, "requireActiveEntitlement").mockResolvedValueOnce({
      customer: null,
      entitled: true,
      organizationId: "org_123",
      subscription: null,
    });

    const response = await app.inject({
      method: "POST",
      payload: {
        amount: "oops",
        channel: "",
        currency: "BRL",
      },
      url: "/costs/ads",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.message).toBe("Request validation failed");
  });

  it("lists manual expenses", async () => {
    vi.spyOn(authService, "requireRequestContext").mockResolvedValueOnce(authContext);
    vi.spyOn(entitlementsService, "requireActiveEntitlement").mockResolvedValueOnce({
      customer: null,
      entitled: true,
      organizationId: "org_123",
      subscription: null,
    });
    vi.spyOn(productsService, "listManualExpenses").mockResolvedValueOnce([
      {
        amount: "40.00",
        category: "rent",
        createdAt: "2026-04-28T10:00:00.000Z",
        currency: "BRL",
        id: "expense_1",
        incurredAt: "2026-04-28",
        notes: "Office rent",
        organizationId: "org_123",
        updatedAt: "2026-04-28T10:00:00.000Z",
      },
    ]);

    const response = await app.inject({
      method: "GET",
      url: "/costs/expenses",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      data: [expect.objectContaining({ id: "expense_1" })],
      error: null,
    });
  });

  it("rejects unauthenticated ad cost updates", async () => {
    vi.spyOn(authService, "requireRequestContext").mockRejectedValueOnce(
      new UnauthorizedException("Authentication required."),
    );

    const response = await app.inject({
      method: "PATCH",
      payload: {
        amount: "10.00",
      },
      url: "/costs/ads/ad_1",
    });

    expect(response.statusCode).toBe(401);
  });
});
