import { UnauthorizedException } from "@nestjs/common";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { buildApp } from "@/app";
import { AuthService } from "@/modules/auth/auth.service";
import { BillingService } from "@/modules/billing/billing.service";
import { EntitlementsService } from "@/modules/billing/entitlements.service";
import { IntegrationsService } from "./integrations.service";

describe("integrations controller", () => {
  let app: NestFastifyApplication;
  let authService: AuthService;
  let billingService: BillingService;
  let entitlementsService: EntitlementsService;
  let integrationsService: IntegrationsService;

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
      MERCADOLIVRE_CLIENT_ID: "ml-client-id",
      MERCADOLIVRE_CLIENT_SECRET: "ml-client-secret",
      NODE_ENV: "test",
      SYNC_RELAX_GUARDS: false,
      STRIPE_PRICE_ANNUAL: "price_annual",
      STRIPE_PRICE_MONTHLY: "price_monthly",
      STRIPE_SECRET_KEY: "stripe",
      STRIPE_WEBHOOK_SECRET: "webhook",
      WEB_APP_ORIGIN: "http://localhost:3000",
    });
    authService = app.get(AuthService);
    billingService = app.get(BillingService);
    entitlementsService = app.get(EntitlementsService);
    integrationsService = app.get(IntegrationsService);
    vi.spyOn(billingService, "reconcileOrganizationSubscriptionWithStripe").mockResolvedValue(undefined);
  });

  afterAll(async () => {
    await app.close();
  });

  it("lists integrations for authenticated entitled requests", async () => {
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
    vi.spyOn(integrationsService, "listConnections").mockResolvedValueOnce([
      {
        connectAvailable: true,
        connectLabel: "Conectar conta",
        connectedAccountId: null,
        connectedAccountLabel: null,
        disconnectAvailable: false,
        disconnectLabel: null,
        displayName: "Mercado Livre",
        lastSyncedAt: null,
        provider: "mercadolivre",
        status: "disconnected",
        statusMessage: "Nenhuma conta do marketplace está conectada ainda",
        tokenExpiresAt: null,
      },
    ]);

    const response = await app.inject({
      method: "GET",
      url: "/integrations",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      data: [expect.objectContaining({ provider: "mercadolivre" })],
      error: null,
    });
  });

  it("returns the Mercado Livre connect URL", async () => {
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
    vi.spyOn(integrationsService, "createConnectUrl").mockResolvedValueOnce({
      authorizationUrl: "https://auth.mercadolivre.com.br/authorization?state=abc",
      provider: "mercadolivre",
    });

    const response = await app.inject({
      method: "POST",
      url: "/integrations/mercadolivre/connect",
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      data: {
        authorizationUrl: "https://auth.mercadolivre.com.br/authorization?state=abc",
        provider: "mercadolivre",
      },
      error: null,
    });
  });

  it("redirects callback requests back to the app surface", async () => {
    vi.spyOn(integrationsService, "handleMercadoLivreCallback").mockResolvedValueOnce(
      "http://localhost:3000/app/integrations?provider=mercadolivre&status=success",
    );

    const response = await app.inject({
      method: "GET",
      url: "/integrations/mercadolivre/callback?code=abc&state=signed",
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe(
      "http://localhost:3000/app/integrations?provider=mercadolivre&status=success",
    );
  });

  it("lists synced Mercado Livre products for authenticated entitled requests", async () => {
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
    vi.spyOn(integrationsService, "listSyncedProducts").mockResolvedValueOnce([
      {
        externalProductId: "MLB-1",
        fixedFee: "2.00",
        grossRevenue: "42.00",
        id: "external_1",
        lastOrderedAt: "2026-05-01T11:00:00.000Z",
        latestUnitPrice: "21.00",
        linkedProduct: null,
        marketplaceCommission: "10.00",
        netMarketplaceTake: "17.00",
        orderCount: 1,
        provider: "mercadolivre",
        reviewStatus: "unreviewed",
        sku: "SKU-42",
        shippingCost: "13.00",
        suggestedMatches: [],
        title: "Kit Mercado Livre",
        unitsSold: 2,
      },
    ]);

    const response = await app.inject({
      method: "GET",
      url: "/integrations/mercadolivre/products",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      data: [expect.objectContaining({ externalProductId: "MLB-1", reviewStatus: "unreviewed" })],
      error: null,
    });
  });

  it("rejects unauthenticated disconnect requests", async () => {
    vi.spyOn(authService, "requireRequestContext").mockRejectedValueOnce(
      new UnauthorizedException("Authentication required."),
    );

    const response = await app.inject({
      method: "POST",
      url: "/integrations/mercadolivre/disconnect",
    });

    expect(response.statusCode).toBe(401);
  });
});
