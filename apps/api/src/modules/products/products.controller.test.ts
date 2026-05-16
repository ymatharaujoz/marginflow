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

  it("creates manual products with initial finance inputs", async () => {
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
    vi.spyOn(productsService, "createManualProduct").mockResolvedValueOnce({
      performance: {
        advertisingCost: "15.00",
        channel: "mercadolivre",
        commissionRate: "0.000000",
        companyId: "11111111-1111-4111-8111-111111111111",
        createdAt: "2026-05-14T10:00:00.000Z",
        id: "perf_1",
        packagingCost: "3.00",
        productName: "Kit Mercado Livre",
        referenceMonth: "2026-05-01",
        returnsQuantity: 0,
        salePrice: "149.90",
        salesQuantity: 0,
        shippingFee: "0.00",
        sku: "ML-001",
        taxRate: "0.120000",
        unitCost: "80.00",
        updatedAt: "2026-05-14T10:00:00.000Z",
      },
      product: {
        createdAt: "2026-05-14T10:00:00.000Z",
        id: "product_1",
        isActive: true,
        name: "Kit Mercado Livre",
        organizationId: "org_123",
        sellingPrice: "149.90",
        sku: "ML-001",
        updatedAt: "2026-05-14T10:00:00.000Z",
      },
      productCost: {
        amount: "80.00",
        costType: "base",
        createdAt: "2026-05-14T10:00:00.000Z",
        currency: "BRL",
        effectiveFrom: "2026-05-01",
        id: "cost_1",
        notes: "Cadastro manual inicial",
        organizationId: "org_123",
        productId: "product_1",
        updatedAt: "2026-05-14T10:00:00.000Z",
      },
    });

    const response = await app.inject({
      method: "POST",
      payload: {
        initialFinance: {
          advertisingCost: "15.00",
          packagingCost: "3.00",
          taxRate: "0.120000",
          unitCost: "80.00",
        },
        product: {
          isActive: true,
          name: "Kit Mercado Livre",
          sellingPrice: "149.90",
          sku: "ML-001",
        },
        scope: {
          channel: "mercadolivre",
          companyId: "11111111-1111-4111-8111-111111111111",
          referenceMonth: "2026-05-01",
        },
      },
      url: "/products/manual",
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      data: expect.objectContaining({
        performance: expect.objectContaining({
          channel: "mercadolivre",
          taxRate: "0.120000",
        }),
        product: expect.objectContaining({
          id: "product_1",
          sku: "ML-001",
        }),
      }),
      error: null,
    });
  });

  it("returns the protected analytics snapshot for authenticated requests", async () => {
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
    vi.spyOn(productsService, "getAnalyticsSnapshot").mockResolvedValueOnce({
      adCosts: [],
      catalogStats: {
        activeProducts: 1,
        archivedProducts: 0,
        pendingSyncProducts: 1,
        productsWithCost: 1,
        productsWithoutCost: 0,
        syncedProductsTotal: 1,
        totalAdCosts: 1,
        totalManualExpenses: 0,
        totalProducts: 1,
        totalProductCosts: 1,
      },
      dataGaps: [],
      financialState: "ready",
      manualExpenses: [],
      mercadoLivreSyncStatus: {
        activeRun: null,
        availability: {
          canRun: true,
          currentWindowKey: "2026-05-13-morning",
          currentWindowLabel: "Manha",
          currentWindowSlot: "morning",
          lastSuccessfulSyncAt: null,
          message: "Sync is available for the current daily window.",
          nextAvailableAt: "2026-05-13T09:00:00.000Z",
          provider: "mercadolivre",
          reason: "available",
        },
        lastCompletedRun: null,
      },
      monthlyPerformanceRows: [
        {
          advertisingCost: "10.00",
          channel: "mercadolivre",
          commissionRate: "0.100000",
          packagingCost: "0.00",
          productName: "Notebook",
          referenceMonth: "2026-05-01",
          returnsQuantity: 0,
          salePrice: "100.00",
          salesQuantity: 2,
          shippingFee: "0.00",
          sku: "NB-1",
          taxRate: "0.000000",
          unitCost: "80.00",
        },
      ],
      productCosts: [],
      productRows: [
        {
          actualRoas: "12.00",
          adSpend: "10.00",
          channel: "mercadolivre",
          contributionMargin: "90.00",
          dataSource: "monthly_performance",
          grossProfit: "100.00",
          hasCost: true,
          hasLinkedMarketplaceSignal: true,
          hasSalesSignal: true,
          insufficientReasons: [],
          isActive: true,
          margin: "50.00",
          marketplaceCommission: "20.00",
          minimumRoas: "2.22",
          name: "Notebook",
          netSales: 2,
          packagingCost: "0.00",
          productCost: "80.00",
          productId: "product_1",
          revenue: "200.00",
          returns: 0,
          roi: "125.00",
          salePrice: "100.00",
          sales: 2,
          shippingCost: "0.00",
          sku: "NB-1",
          taxAmount: "0.00",
          totalProfit: "90.00",
          unitProfit: "45.00",
        },
      ],
      products: [],
      scope: {
        companyId: "11111111-1111-4111-8111-111111111111",
        companyRequired: false,
        referenceMonth: "2026-05-01",
      },
      syncedProducts: [
        {
          externalProductId: "MLB-1",
          fixedFee: "0.00",
          grossRevenue: "200.00",
          id: "external_1",
          lastOrderedAt: "2026-05-01T11:00:00.000Z",
          latestUnitPrice: "100.00",
          linkedProduct: {
            id: "product_1",
            isActive: true,
            name: "Notebook",
            sku: "NB-1",
          },
          orderCount: 1,
          provider: "mercadolivre",
          reviewStatus: "linked_to_existing_product",
          sku: "NB-1",
          marketplaceCommission: "20.00",
          netMarketplaceTake: "32.00",
          shippingCost: "12.00",
          suggestedMatches: [],
          title: "Notebook",
          unitsSold: 2,
        },
      ],
    });

    const response = await app.inject({
      method: "GET",
      url: "/products/analytics",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      data: expect.objectContaining({
        catalogStats: expect.objectContaining({
          pendingSyncProducts: 1,
          totalProducts: 1,
        }),
        dataGaps: [],
        financialState: "ready",
        mercadoLivreSyncStatus: expect.objectContaining({
          availability: expect.objectContaining({
            provider: "mercadolivre",
            reason: "available",
          }),
        }),
        monthlyPerformanceRows: [
          expect.objectContaining({
            channel: "mercadolivre",
            productName: "Notebook",
            referenceMonth: "2026-05-01",
            sku: "NB-1",
          }),
        ],
        productRows: [
          expect.objectContaining({
            actualRoas: "12.00",
            insufficientReasons: [],
            name: "Notebook",
            productId: "product_1",
          }),
        ],
        syncedProducts: [
          expect.objectContaining({
            externalProductId: "MLB-1",
            marketplaceCommission: "20.00",
            reviewStatus: "linked_to_existing_product",
            shippingCost: "12.00",
          }),
        ],
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

  it("rejects invalid manual product company payloads", async () => {
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
        initialFinance: {
          advertisingCost: "15.00",
          packagingCost: "3.00",
          taxRate: "0.120000",
          unitCost: "80.00",
        },
        product: {
          isActive: true,
          name: "Kit Mercado Livre",
          sellingPrice: "149.90",
          sku: "ML-001",
        },
        scope: {
          channel: "mercadolivre",
          companyId: "",
          referenceMonth: "2026-05-01",
        },
      },
      url: "/products/manual",
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
