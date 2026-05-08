import { UnauthorizedException } from "@nestjs/common";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { buildApp } from "@/app";
import { AuthService } from "@/modules/auth/auth.service";
import { BillingService } from "@/modules/billing/billing.service";
import { EntitlementsService } from "@/modules/billing/entitlements.service";
import { ProductsService } from "./products.service";

describe("products controller", () => {
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

  it("lists products for authenticated requests", async () => {
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
    vi.spyOn(entitlementsService, "requireActiveEntitlement").mockResolvedValueOnce({
      customer: null,
      entitled: true,
      organizationId: "org_123",
      subscription: null,
    });
    vi.spyOn(productsService, "listProducts").mockResolvedValueOnce([
      {
        createdAt: "2026-04-28T10:00:00.000Z",
        id: "product_1",
        isActive: true,
        latestCost: null,
        name: "Notebook",
        organizationId: "org_123",
        sellingPrice: "120.00",
        sku: "NB-1",
        updatedAt: "2026-04-28T10:00:00.000Z",
      },
    ]);

    const response = await app.inject({
      method: "GET",
      url: "/products",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      data: [
        expect.objectContaining({
          id: "product_1",
          latestCost: null,
          name: "Notebook",
        }),
      ],
      error: null,
    });
  });

  it("creates products for authenticated requests", async () => {
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
    vi.spyOn(entitlementsService, "requireActiveEntitlement").mockResolvedValueOnce({
      customer: null,
      entitled: true,
      organizationId: "org_123",
      subscription: null,
    });
    vi.spyOn(productsService, "createProduct").mockResolvedValueOnce({
      createdAt: "2026-04-28T10:00:00.000Z",
      id: "product_1",
      isActive: true,
      name: "Notebook",
      organizationId: "org_123",
      sellingPrice: "120.00",
      sku: "NB-1",
      updatedAt: "2026-04-28T10:00:00.000Z",
    });

    const response = await app.inject({
      method: "POST",
      payload: {
        isActive: true,
        name: "Notebook",
        sellingPrice: "120.00",
        sku: "NB-1",
      },
      url: "/products",
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      data: expect.objectContaining({
        id: "product_1",
        name: "Notebook",
      }),
      error: null,
    });
  });

  it("rejects invalid product payloads", async () => {
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
    vi.spyOn(entitlementsService, "requireActiveEntitlement").mockResolvedValueOnce({
      customer: null,
      entitled: true,
      organizationId: "org_123",
      subscription: null,
    });

    const response = await app.inject({
      method: "POST",
      payload: {
        isActive: true,
        name: "",
        sellingPrice: "abc",
        sku: "NB-1",
      },
      url: "/products",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.message).toBe("Request validation failed");
  });

  it("rejects unauthenticated product updates", async () => {
    vi.spyOn(authService, "requireRequestContext").mockRejectedValueOnce(
      new UnauthorizedException("Authentication required."),
    );

    const response = await app.inject({
      method: "PATCH",
      payload: {
        isActive: false,
      },
      url: "/products/product_1",
    });

    expect(response.statusCode).toBe(401);
  });
});
