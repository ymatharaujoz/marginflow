import { UnauthorizedException } from "@nestjs/common";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { buildApp } from "@/app";
import { AuthService } from "@/modules/auth/auth.service";
import { BillingService } from "@/modules/billing/billing.service";
import { EntitlementsService } from "@/modules/billing/entitlements.service";
import { SyncService } from "./sync.service";

describe("sync controller", () => {
  let app: NestFastifyApplication;
  let authService: AuthService;
  let billingService: BillingService;
  let entitlementsService: EntitlementsService;
  let syncService: SyncService;

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
      STRIPE_PRICE_ANNUAL: "price_annual",
      STRIPE_PRICE_MONTHLY: "price_monthly",
      STRIPE_SECRET_KEY: "stripe",
      STRIPE_WEBHOOK_SECRET: "webhook",
      WEB_APP_ORIGIN: "http://localhost:3000",
    });
    authService = app.get(AuthService);
    billingService = app.get(BillingService);
    entitlementsService = app.get(EntitlementsService);
    syncService = app.get(SyncService);
    vi.spyOn(billingService, "reconcileOrganizationSubscriptionWithStripe").mockResolvedValue(undefined);
  });

  afterAll(async () => {
    await app.close();
  });

  function mockEntitledContext() {
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
  }

  it("returns provider sync status", async () => {
    mockEntitledContext();
    vi.spyOn(syncService, "getStatus").mockResolvedValueOnce({
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

    const response = await app.inject({
      method: "GET",
      url: "/sync/status?provider=mercadolivre",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      data: expect.objectContaining({
        availability: expect.objectContaining({
          provider: "mercadolivre",
        }),
      }),
      error: null,
    });
  });

  it("returns sync history", async () => {
    mockEntitledContext();
    vi.spyOn(syncService, "getHistory").mockResolvedValueOnce([
      {
        counts: {
          fees: 1,
          items: 2,
          orders: 1,
          products: 1,
        },
        createdAt: "2026-05-01T12:00:00.000Z",
        cursor: {
          orderedAfter: "2026-05-01T11:00:00.000Z",
        },
        errorSummary: null,
        finishedAt: "2026-05-01T12:05:00.000Z",
        id: "sync_123",
        provider: "mercadolivre",
        startedAt: "2026-05-01T12:01:00.000Z",
        status: "completed",
        updatedAt: "2026-05-01T12:05:00.000Z",
        windowKey: "2026-05-01:morning",
      },
    ]);

    const response = await app.inject({
      method: "GET",
      url: "/sync/history?provider=mercadolivre",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      data: [expect.objectContaining({ id: "sync_123" })],
      error: null,
    });
  });

  it("runs sync for authenticated entitled requests", async () => {
    mockEntitledContext();
    vi.spyOn(syncService, "runSync").mockResolvedValueOnce({
      availability: {
        canRun: false,
        currentWindowKey: "2026-05-01:morning",
        currentWindowLabel: "Morning",
        currentWindowSlot: "morning",
        lastSuccessfulSyncAt: "2026-05-01T12:05:00.000Z",
        message: "This daily sync window was already used. Wait for the next window to open.",
        nextAvailableAt: "2026-05-01T15:00:00.000Z",
        provider: "mercadolivre",
        reason: "window_already_used",
      },
      run: {
        counts: {
          fees: 1,
          items: 2,
          orders: 1,
          products: 1,
        },
        createdAt: "2026-05-01T12:00:00.000Z",
        cursor: {
          orderedAfter: "2026-05-01T11:00:00.000Z",
        },
        errorSummary: null,
        finishedAt: "2026-05-01T12:05:00.000Z",
        id: "sync_123",
        provider: "mercadolivre",
        startedAt: "2026-05-01T12:01:00.000Z",
        status: "completed",
        updatedAt: "2026-05-01T12:05:00.000Z",
        windowKey: "2026-05-01:morning",
      },
    });

    const response = await app.inject({
      method: "POST",
      payload: {
        provider: "mercadolivre",
      },
      url: "/sync/run",
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      data: expect.objectContaining({
        run: expect.objectContaining({ id: "sync_123" }),
      }),
      error: null,
    });
  });

  it("rejects unauthenticated sync requests", async () => {
    vi.spyOn(authService, "requireRequestContext").mockRejectedValueOnce(
      new UnauthorizedException("Authentication required."),
    );

    const response = await app.inject({
      method: "POST",
      payload: {
        provider: "mercadolivre",
      },
      url: "/sync/run",
    });

    expect(response.statusCode).toBe(401);
  });
});
