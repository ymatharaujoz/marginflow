import { HttpException, UnauthorizedException } from "@nestjs/common";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { buildApp } from "@/app";
import { AuthService } from "@/modules/auth/auth.service";
import { BillingService } from "@/modules/billing/billing.service";
import { EntitlementsService } from "@/modules/billing/entitlements.service";
import { DashboardService } from "./dashboard.service";

describe("dashboard controller", () => {
  let app: NestFastifyApplication;
  let authService: AuthService;
  let billingService: BillingService;
  let entitlementsService: EntitlementsService;
  let dashboardService: DashboardService;

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
    dashboardService = app.get(DashboardService);
    vi.spyOn(billingService, "reconcileOrganizationSubscriptionWithStripe").mockResolvedValue(undefined);
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns dashboard summary for authenticated entitled requests", async () => {
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
    vi.spyOn(dashboardService, "readSummary").mockResolvedValueOnce({
      cards: [],
      summary: {
        breakEvenRevenue: "0.00",
        breakEvenUnits: "0.00",
        contributionMargin: "0.00",
        grossMarginPercent: "0.00",
        grossRevenue: "0.00",
        netProfit: "0.00",
        netRevenue: "0.00",
        ordersCount: 0,
        totalAdCosts: "0.00",
        totalCogs: "0.00",
        totalFees: "0.00",
        totalManualExpenses: "0.00",
        unitsSold: 0,
      },
    });

    const response = await app.inject({
      method: "GET",
      url: "/dashboard/summary",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      data: expect.objectContaining({
        cards: [],
      }),
      error: null,
    });
  });

  it("returns chart, recent sync, and profitability payloads for authenticated entitled requests", async () => {
    vi.spyOn(authService, "requireRequestContext").mockResolvedValue({
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
    vi.spyOn(entitlementsService, "requireActiveEntitlement").mockResolvedValue({
      customer: null,
      entitled: true,
      organizationId: "org_123",
      subscription: null,
    });
    vi.spyOn(dashboardService, "readCharts").mockResolvedValueOnce({
      channels: [],
      daily: [],
    });
    vi.spyOn(dashboardService, "readRecentSync").mockResolvedValueOnce({
      activeRun: null,
      availability: {
        canRun: true,
        currentWindowKey: "2026-05-01:morning",
        currentWindowLabel: "Morning",
        currentWindowSlot: "morning",
        lastSuccessfulSyncAt: null,
        message: "Sync is available for the current daily window.",
        nextAvailableAt: "2026-05-01T15:00:00.000Z",
        provider: "mercadolivre",
        reason: "available",
      },
      lastCompletedRun: null,
    });
    vi.spyOn(dashboardService, "readProfitability").mockResolvedValueOnce({
      channels: [],
      products: [],
    });

    const [chartsResponse, recentSyncResponse, profitabilityResponse] = await Promise.all([
      app.inject({
        method: "GET",
        url: "/dashboard/charts",
      }),
      app.inject({
        method: "GET",
        url: "/dashboard/recent-sync",
      }),
      app.inject({
        method: "GET",
        url: "/dashboard/profitability",
      }),
    ]);

    expect(chartsResponse.statusCode).toBe(200);
    expect(recentSyncResponse.statusCode).toBe(200);
    expect(profitabilityResponse.statusCode).toBe(200);
  });

  it("rejects unauthenticated requests", async () => {
    vi.spyOn(authService, "requireRequestContext").mockRejectedValueOnce(
      new UnauthorizedException("Authentication required."),
    );

    const response = await app.inject({
      method: "GET",
      url: "/dashboard/summary",
    });

    expect(response.statusCode).toBe(401);
  });

  it("rejects non-entitled requests", async () => {
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
    vi.spyOn(entitlementsService, "requireActiveEntitlement").mockRejectedValueOnce(
      new HttpException("Active subscription required.", 402),
    );

    const response = await app.inject({
      method: "GET",
      url: "/dashboard/summary",
    });

    expect(response.statusCode).toBe(402);
  });
});
