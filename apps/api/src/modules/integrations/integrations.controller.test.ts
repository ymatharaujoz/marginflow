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
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/lucreii",
      MERCADOLIVRE_CLIENT_ID: "ml-client-id",
      MERCADOLIVRE_CLIENT_SECRET: "ml-client-secret",
      NODE_ENV: "test",
      SYNC_RELAX_GUARDS: false,
      STRIPE_PRICE_START_MONTHLY: "price_start_monthly",
      STRIPE_PRICE_START_ANNUAL: "price_start_annual",
      STRIPE_PRICE_PRO_MONTHLY: "price_pro_monthly",
      STRIPE_PRICE_PRO_ANNUAL: "price_pro_annual",
      STRIPE_PRICE_BUSINESS_MONTHLY: "price_business_monthly",
      STRIPE_PRICE_BUSINESS_ANNUAL: "price_business_annual",
      STRIPE_SECRET_KEY: "stripe",
      STRIPE_WEBHOOK_SECRET: "webhook",
      WEB_APP_ORIGIN: "http://localhost:3000",
    });
    authService = app.get(AuthService);
    billingService = app.get(BillingService);
    entitlementsService = app.get(EntitlementsService);
    integrationsService = app.get(IntegrationsService);
    vi.spyOn(
      billingService,
      "reconcileOrganizationSubscriptionWithStripe",
    ).mockResolvedValue(undefined);
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
      selectedCompanyId: "company_123",
      session: {
        expiresAt: new Date("2026-04-22T00:00:00.000Z"),
        id: "session_123",
      },
      user: {
        email: "owner@lucreii.local",
        emailVerified: true,
        id: "user_123",
        image: null,
        name: "Mateus",
      },
    });
    vi.spyOn(
      entitlementsService,
      "requireActiveEntitlement",
    ).mockResolvedValueOnce({
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
      selectedCompanyId: "company_123",
      session: {
        expiresAt: new Date("2026-04-22T00:00:00.000Z"),
        id: "session_123",
      },
      user: {
        email: "owner@lucreii.local",
        emailVerified: true,
        id: "user_123",
        image: null,
        name: "Mateus",
      },
    });
    vi.spyOn(
      entitlementsService,
      "requireActiveEntitlement",
    ).mockResolvedValueOnce({
      customer: null,
      entitled: true,
      organizationId: "org_123",
      subscription: null,
    });
    vi.spyOn(integrationsService, "createConnectUrl").mockResolvedValueOnce({
      authorizationUrl:
        "https://auth.mercadolivre.com.br/authorization?state=abc",
      provider: "mercadolivre",
    });

    const response = await app.inject({
      method: "POST",
      url: "/integrations/mercadolivre/connect",
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      data: {
        authorizationUrl:
          "https://auth.mercadolivre.com.br/authorization?state=abc",
        provider: "mercadolivre",
      },
      error: null,
    });
  });

  it("returns the Shopee connect URL", async () => {
    vi.spyOn(authService, "requireRequestContext").mockResolvedValueOnce({
      organization: { id: "org_123", name: "Org", role: "owner", slug: "org" },
      selectedCompanyId: "company_123",
      session: {
        expiresAt: new Date("2026-07-22T00:00:00.000Z"),
        id: "session_123",
      },
      user: {
        email: "owner@lucreii.local",
        emailVerified: true,
        id: "user_123",
        image: null,
        name: "Mateus",
      },
    });
    vi.spyOn(
      entitlementsService,
      "requireActiveEntitlement",
    ).mockResolvedValueOnce({
      customer: null,
      entitled: true,
      organizationId: "org_123",
      subscription: null,
    });
    vi.spyOn(integrationsService, "createConnectUrl").mockResolvedValueOnce({
      authorizationUrl:
        "https://partner.shopeemobile.com/api/v2/shop/auth_partner",
      provider: "shopee",
    });

    const response = await app.inject({
      method: "POST",
      url: "/integrations/shopee/connect",
    });

    expect(response.statusCode).toBe(201);
    expect(integrationsService.createConnectUrl).toHaveBeenCalledWith(
      "org_123",
      "company_123",
      "shopee",
    );
  });

  it("redirects callback requests back to the app surface", async () => {
    vi.spyOn(
      integrationsService,
      "handleMercadoLivreCallback",
    ).mockResolvedValueOnce(
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

  it("redirects Shopee callback requests back to the app surface", async () => {
    vi.spyOn(integrationsService, "handleShopeeCallback").mockResolvedValueOnce(
      "http://localhost:3000/app/integrations?provider=shopee&status=success",
    );

    const response = await app.inject({
      method: "GET",
      url: "/integrations/shopee/callback?code=abc&shop_id=987654&state=signed",
    });

    expect(response.statusCode).toBe(302);
    expect(integrationsService.handleShopeeCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "abc",
        shop_id: "987654",
        state: "signed",
      }),
    );
  });

  it("accepts Shopee order push notifications without authentication", async () => {
    vi.spyOn(
      integrationsService,
      "handleShopeeNotification",
    ).mockResolvedValueOnce({
      accepted: true,
      reason: "started",
      status: "started",
    } as never);

    const response = await app.inject({
      headers: { authorization: "signed-push" },
      method: "POST",
      payload: {
        code: 3,
        data: { ordersn: "ORDER-1", status: "READY_TO_SHIP" },
        shop_id: 987654,
        timestamp: 1718184000,
      },
      url: "/integrations/shopee/webhook",
    });

    expect(response.statusCode).toBe(201);
    expect(integrationsService.handleShopeeNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        authorization: "signed-push",
        rawBody: expect.any(Buffer),
      }),
    );
  });

  it("accepts Mercado Livre webhook notifications without authentication", async () => {
    vi.spyOn(
      integrationsService,
      "handleMercadoLivreNotification",
    ).mockResolvedValueOnce({
      accepted: true,
      reason: "started",
      status: "started",
      summary: {
        applicationId: "123",
        attempts: 1,
        notificationId: "notif_1",
        resource: "/orders/200",
        sent: "2026-06-08T12:00:00.000Z",
        topic: "orders_v2",
        userId: "456",
      },
    });

    const response = await app.inject({
      method: "POST",
      payload: {
        _id: "notif_1",
        application_id: 123,
        attempts: 1,
        resource: "/orders/200",
        sent: "2026-06-08T12:00:00.000Z",
        topic: "orders_v2",
        user_id: 456,
      },
      url: "/integrations/mercadolivre/webhook",
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      data: expect.objectContaining({
        accepted: true,
        status: "started",
      }),
      error: null,
    });
  });

  it("accepts Mercado Livre notification alias requests without authentication", async () => {
    vi.spyOn(
      integrationsService,
      "handleMercadoLivreNotification",
    ).mockResolvedValueOnce({
      accepted: true,
      reason: "started",
      status: "started",
      summary: {
        applicationId: "123",
        attempts: 1,
        notificationId: "notif_2",
        resource: "/orders/201",
        sent: "2026-06-08T12:01:00.000Z",
        topic: "orders_v2",
        userId: "456",
      },
    });

    const response = await app.inject({
      method: "POST",
      payload: {
        _id: "notif_2",
        application_id: 123,
        attempts: 1,
        resource: "/orders/201",
        sent: "2026-06-08T12:01:00.000Z",
        topic: "orders_v2",
        user_id: 456,
      },
      url: "/integrations/mercadolivre/notifications",
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      data: expect.objectContaining({
        accepted: true,
        status: "started",
      }),
      error: null,
    });
  });

  it("lists synced Mercado Livre products for authenticated entitled requests", async () => {
    vi.spyOn(authService, "requireRequestContext").mockResolvedValueOnce({
      organization: {
        id: "org_123",
        name: "Org",
        role: "owner",
        slug: "org",
      },
      selectedCompanyId: "company_123",
      session: {
        expiresAt: new Date("2026-04-22T00:00:00.000Z"),
        id: "session_123",
      },
      user: {
        email: "owner@lucreii.local",
        emailVerified: true,
        id: "user_123",
        image: null,
        name: "Mateus",
      },
    });
    vi.spyOn(
      entitlementsService,
      "requireActiveEntitlement",
    ).mockResolvedValueOnce({
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
      data: [
        expect.objectContaining({
          externalProductId: "MLB-1",
          reviewStatus: "unreviewed",
        }),
      ],
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

  it("imports the connected Mercado Livre catalog", async () => {
    vi.spyOn(authService, "requireRequestContext").mockResolvedValueOnce({
      organization: {
        id: "org_123",
        name: "Lucreii",
        role: "owner",
        slug: "lucreii",
      },
      selectedCompanyId: "company_123",
      session: {
        expiresAt: new Date("2026-06-16T10:00:00.000Z"),
        id: "session_123",
      },
      user: {
        email: "owner@lucreii.local",
        emailVerified: true,
        id: "user_123",
        image: null,
        name: "Mateus",
      },
    });
    vi.spyOn(
      entitlementsService,
      "requireActiveEntitlement",
    ).mockResolvedValueOnce({
      customer: null,
      entitled: true,
      organizationId: "org_123",
      subscription: null,
    });
    vi.spyOn(
      integrationsService,
      "importMarketplaceCatalog",
    ).mockResolvedValueOnce({
      conflicts: [],
      created: 2,
      errors: [],
      found: 3,
      unchanged: 0,
      updated: 1,
    });

    const response = await app.inject({
      method: "POST",
      url: "/integrations/mercadolivre/catalog/import",
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      data: {
        conflicts: [],
        created: 2,
        errors: [],
        found: 3,
        unchanged: 0,
        updated: 1,
      },
      error: null,
    });
    expect(integrationsService.importMarketplaceCatalog).toHaveBeenCalledWith({
      companyId: "company_123",
      organizationId: "org_123",
      providerSlug: "mercadolivre",
      userId: "user_123",
    });
  });

  it("imports the connected Shopee catalog", async () => {
    vi.spyOn(authService, "requireRequestContext").mockResolvedValueOnce({
      organization: {
        id: "org_123",
        name: "Lucreii",
        role: "owner",
        slug: "lucreii",
      },
      selectedCompanyId: "company_123",
      session: {
        expiresAt: new Date("2026-06-21T10:00:00.000Z"),
        id: "session_123",
      },
      user: {
        email: "owner@lucreii.local",
        emailVerified: true,
        id: "user_123",
        image: null,
        name: "Mateus",
      },
    });
    vi.spyOn(
      entitlementsService,
      "requireActiveEntitlement",
    ).mockResolvedValueOnce({
      customer: null,
      entitled: true,
      organizationId: "org_123",
      subscription: null,
    });
    vi.spyOn(
      integrationsService,
      "importMarketplaceCatalog",
    ).mockResolvedValueOnce({
      conflicts: [],
      created: 1,
      errors: [],
      found: 1,
      unchanged: 0,
      updated: 0,
    });

    const response = await app.inject({
      method: "POST",
      url: "/integrations/shopee/catalog/import",
    });

    expect(response.statusCode).toBe(201);
    expect(integrationsService.importMarketplaceCatalog).toHaveBeenCalledWith({
      companyId: "company_123",
      organizationId: "org_123",
      providerSlug: "shopee",
      userId: "user_123",
    });
  });

  it("imports the connected Shein catalog", async () => {
    vi.spyOn(authService, "requireRequestContext").mockResolvedValueOnce({
      organization: {
        id: "org_123",
        name: "Lucreii",
        role: "owner",
        slug: "lucreii",
      },
      selectedCompanyId: "company_123",
      session: {
        expiresAt: new Date("2026-06-21T10:00:00.000Z"),
        id: "session_123",
      },
      user: {
        email: "owner@lucreii.local",
        emailVerified: true,
        id: "user_123",
        image: null,
        name: "Mateus",
      },
    });
    vi.spyOn(
      entitlementsService,
      "requireActiveEntitlement",
    ).mockResolvedValueOnce({
      customer: null,
      entitled: true,
      organizationId: "org_123",
      subscription: null,
    });
    vi.spyOn(
      integrationsService,
      "importMarketplaceCatalog",
    ).mockResolvedValueOnce({
      conflicts: [],
      created: 1,
      errors: [],
      found: 1,
      unchanged: 0,
      updated: 0,
    });

    const response = await app.inject({
      method: "POST",
      url: "/integrations/shein/catalog/import",
    });

    expect(response.statusCode).toBe(201);
    expect(integrationsService.importMarketplaceCatalog).toHaveBeenCalledWith({
      companyId: "company_123",
      organizationId: "org_123",
      providerSlug: "shein",
      userId: "user_123",
    });
  });
});
