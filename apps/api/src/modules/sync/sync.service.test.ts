import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BadRequestException } from "@nestjs/common";
import { FinanceService } from "@/modules/finance/finance.service";
import { SyncPerformanceMaterializerService } from "./sync-performance-materializer.service";
import { SyncService } from "./sync.service";

function createUpdateMock(returnValue: unknown) {
  return vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([returnValue]),
      }),
    }),
  });
}

function createInsertMock(queue: unknown[]) {
  return vi.fn().mockImplementation(() => ({
    values: vi.fn().mockImplementation(() => ({
      onConflictDoUpdate: vi.fn().mockImplementation(() => ({
        returning: vi.fn().mockResolvedValue(queue.shift() ?? []),
      })),
      returning: vi.fn().mockResolvedValue(queue.shift() ?? []),
    })),
  }));
}

function createService(envOverrides: Record<string, unknown> = {}) {
  const db = {
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
    insert: vi.fn(),
    query: {
      marketplaceConnections: {
        findFirst: vi.fn(),
      },
      syncRuns: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    },
    transaction: vi.fn(async (callback: (tx: typeof db) => Promise<unknown>) =>
      callback(db),
    ),
    update: vi.fn(),
  };
  const financeService = {
    materializeOrganizationMetrics: vi.fn(),
  } satisfies Pick<FinanceService, "materializeOrganizationMetrics">;
  const syncPerformanceMaterializer = {
    materializeForSync: vi.fn(),
  } satisfies Pick<SyncPerformanceMaterializerService, "materializeForSync">;
  const service = new SyncService(
    db as never,
    {
      API_DB_POOL_MAX: 5,
      API_HOST: "127.0.0.1",
      API_PORT: 4000,
      BETTER_AUTH_SECRET: "secret",
      BETTER_AUTH_URL: "http://localhost:4000",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/lucreii",
      MERCADOLIVRE_CLIENT_ID: "ml-client-id",
      MERCADOLIVRE_CLIENT_SECRET: "ml-client-secret",
      NODE_ENV: "test",
      STRIPE_PRICE_START_MONTHLY: "price_start_monthly",
      STRIPE_PRICE_START_ANNUAL: "price_start_annual",
      STRIPE_PRICE_PRO_MONTHLY: "price_pro_monthly",
      STRIPE_PRICE_PRO_ANNUAL: "price_pro_annual",
      STRIPE_PRICE_BUSINESS_MONTHLY: "price_business_monthly",
      STRIPE_PRICE_BUSINESS_ANNUAL: "price_business_annual",
      STRIPE_SECRET_KEY: "stripe",
      STRIPE_WEBHOOK_SECRET: "webhook",
      WEB_APP_ORIGIN: "http://localhost:3000",
      SYNC_RELAX_GUARDS: false,
      ...envOverrides,
    } as never,
    financeService as never,
    syncPerformanceMaterializer as never,
  );

  return {
    db,
    financeService,
    syncPerformanceMaterializer,
    service,
  };
}

describe("SyncService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps Mercado Livre available after a successful sync in the same window", async () => {
    vi.setSystemTime(new Date("2026-05-01T12:30:00.000Z"));
    const { db, service } = createService();

    db.query.marketplaceConnections.findFirst.mockResolvedValue({
      accessToken: "token",
      createdAt: new Date("2026-05-01T11:00:00.000Z"),
      externalAccountId: "seller_123",
      id: "conn_123",
      lastSyncedAt: new Date("2026-05-01T12:05:00.000Z"),
      metadata: {},
      companyId: "company_123",
      organizationId: "org_123",
      provider: "mercadolivre",
      refreshToken: "refresh",
      status: "connected",
      tokenExpiresAt: new Date("2026-07-03T11:00:00.000Z"),
      updatedAt: new Date("2026-05-01T11:00:00.000Z"),
    });
    db.query.syncRuns.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        createdAt: new Date("2026-05-01T12:05:00.000Z"),
        errorSummary: null,
        finishedAt: new Date("2026-05-01T12:05:00.000Z"),
        id: "sync_123",
        marketplaceConnectionId: "conn_123",
        metadata: {},
        companyId: "company_123",
        organizationId: "org_123",
        provider: "mercadolivre",
        startedAt: new Date("2026-05-01T12:01:00.000Z"),
        status: "completed",
        updatedAt: new Date("2026-05-01T12:05:00.000Z"),
        windowKey: "2026-05-01:morning",
      });

    const status = await service.getStatus(
      "org_123",
      "company_123",
      "mercadolivre",
    );

    expect(status.availability.canRun).toBe(true);
    expect(status.availability.reason).toBe("available");
    expect(status.availability.currentWindowKey).toBeNull();
  });

  it("allows the current window again for non-Mercado Livre providers when SYNC_RELAX_GUARDS is enabled outside production", async () => {
    vi.setSystemTime(new Date("2026-05-01T12:30:00.000Z"));
    const { db, service } = createService({
      SYNC_RELAX_GUARDS: true,
      NODE_ENV: "development",
    });
    (service as unknown as { providers: unknown[] }).providers = [
      {
        createAuthorization: vi.fn(),
        disconnect: vi.fn(),
        displayName: "Shopee",
        exchangeCode: vi.fn(),
        isConfigured: () => true,
        provider: "shopee" as const,
        supportsSync: () => true,
        syncOrders: vi.fn(),
      },
    ];

    db.query.marketplaceConnections.findFirst.mockResolvedValue({
      accessToken: "token",
      createdAt: new Date("2026-05-01T11:00:00.000Z"),
      externalAccountId: "seller_123",
      id: "conn_123",
      lastSyncedAt: new Date("2026-05-01T12:05:00.000Z"),
      metadata: {},
      companyId: "company_123",
      organizationId: "org_123",
      provider: "shopee",
      refreshToken: "refresh",
      status: "connected",
      tokenExpiresAt: new Date("2026-05-03T11:00:00.000Z"),
      updatedAt: new Date("2026-05-01T11:00:00.000Z"),
    });
    db.query.syncRuns.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        createdAt: new Date("2026-05-01T12:05:00.000Z"),
        errorSummary: null,
        finishedAt: new Date("2026-05-01T12:05:00.000Z"),
        id: "sync_123",
        marketplaceConnectionId: "conn_123",
        metadata: {},
        companyId: "company_123",
        organizationId: "org_123",
        provider: "shopee",
        startedAt: new Date("2026-05-01T12:01:00.000Z"),
        status: "completed",
        updatedAt: new Date("2026-05-01T12:05:00.000Z"),
        windowKey: "2026-05-01:morning",
      });

    const status = await service.getStatus("org_123", "company_123", "shopee");

    expect(status.availability.canRun).toBe(true);
    expect(status.availability.reason).toBe("available");
  });

  it("keeps Shopee manual sync available without daily windows", async () => {
    vi.setSystemTime(new Date("2026-05-01T12:30:00.000Z"));
    const { db, service } = createService({
      SYNC_RELAX_GUARDS: true,
      NODE_ENV: "production",
    });
    (service as unknown as { providers: unknown[] }).providers = [
      {
        createAuthorization: vi.fn(),
        disconnect: vi.fn(),
        displayName: "Shopee",
        exchangeCode: vi.fn(),
        isConfigured: () => true,
        provider: "shopee" as const,
        supportsSync: () => true,
        syncOrders: vi.fn(),
      },
    ];

    db.query.marketplaceConnections.findFirst.mockResolvedValue({
      accessToken: "token",
      createdAt: new Date("2026-05-01T11:00:00.000Z"),
      externalAccountId: "seller_123",
      id: "conn_123",
      lastSyncedAt: new Date("2026-05-01T12:05:00.000Z"),
      metadata: {},
      companyId: "company_123",
      organizationId: "org_123",
      provider: "shopee",
      refreshToken: "refresh",
      status: "connected",
      tokenExpiresAt: new Date("2026-05-03T11:00:00.000Z"),
      updatedAt: new Date("2026-05-01T11:00:00.000Z"),
    });
    db.query.syncRuns.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        createdAt: new Date("2026-05-01T12:05:00.000Z"),
        errorSummary: null,
        finishedAt: new Date("2026-05-01T12:05:00.000Z"),
        id: "sync_123",
        marketplaceConnectionId: "conn_123",
        metadata: {},
        companyId: "company_123",
        organizationId: "org_123",
        provider: "shopee",
        startedAt: new Date("2026-05-01T12:01:00.000Z"),
        status: "completed",
        updatedAt: new Date("2026-05-01T12:05:00.000Z"),
        windowKey: "2026-05-01:morning",
      });

    const status = await service.getStatus("org_123", "company_123", "shopee");

    expect(status.availability.canRun).toBe(true);
    expect(status.availability.reason).toBe("available");
    expect(status.availability.currentWindowKey).toBeNull();
  });

  it("keeps Shein manual sync available without daily windows", async () => {
    vi.setSystemTime(new Date("2026-05-01T12:30:00.000Z"));
    const { db, service } = createService({
      SYNC_RELAX_GUARDS: true,
      NODE_ENV: "production",
    });
    (service as unknown as { providers: unknown[] }).providers = [
      {
        createAuthorization: vi.fn(),
        disconnect: vi.fn(),
        displayName: "Shein",
        exchangeCode: vi.fn(),
        isConfigured: () => true,
        provider: "shein" as const,
        supportsSync: () => true,
        syncOrders: vi.fn(),
      },
    ];

    db.query.marketplaceConnections.findFirst.mockResolvedValue({
      accessToken: "token",
      createdAt: new Date("2026-05-01T11:00:00.000Z"),
      externalAccountId: "seller_123",
      id: "conn_123",
      lastSyncedAt: new Date("2026-05-01T12:05:00.000Z"),
      metadata: {},
      companyId: "company_123",
      organizationId: "org_123",
      provider: "shein",
      refreshToken: "refresh",
      status: "connected",
      tokenExpiresAt: new Date("2026-05-03T11:00:00.000Z"),
      updatedAt: new Date("2026-05-01T11:00:00.000Z"),
    });
    db.query.syncRuns.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        createdAt: new Date("2026-05-01T12:05:00.000Z"),
        errorSummary: null,
        finishedAt: new Date("2026-05-01T12:05:00.000Z"),
        id: "sync_123",
        marketplaceConnectionId: "conn_123",
        metadata: {},
        companyId: "company_123",
        organizationId: "org_123",
        provider: "shein",
        startedAt: new Date("2026-05-01T12:01:00.000Z"),
        status: "completed",
        updatedAt: new Date("2026-05-01T12:05:00.000Z"),
        windowKey: "2026-05-01:morning",
      });

    const status = await service.getStatus("org_123", "company_123", "shein");

    expect(status.availability.canRun).toBe(true);
    expect(status.availability.reason).toBe("available");
    expect(status.availability.currentWindowKey).toBeNull();
  });

  it("runs a sync, stores imported data, and materializes finance metrics", async () => {
    vi.setSystemTime(new Date("2026-06-22T12:30:00.000Z"));
    const { db, financeService, service, syncPerformanceMaterializer } =
      createService();
    const provider = {
      createAuthorization: vi.fn(),
      disconnect: vi.fn(),
      displayName: "Mercado Livre",
      exchangeCode: vi.fn(),
      isConfigured: () => true,
      provider: "mercadolivre" as const,
      supportsSync: () => true,
      syncOrders: vi.fn().mockResolvedValue({
        cursor: {
          orderedAfter: "2026-05-01T11:45:00.000Z",
        },
        orders: [
          {
            currency: "BRL",
            externalOrderId: "order_1",
            fees: [
              {
                amount: "5.00",
                currency: "BRL",
                feeType: "sale_fee",
                metadata: {},
              },
            ],
            items: [
              {
                externalProductId: "product_ext_1",
                quantity: 2,
                totalPrice: "200.00",
                unitPrice: "100.00",
              },
            ],
            metadata: {},
            orderedAt: "2026-05-01T11:45:00.000Z",
            status: "paid",
            totalAmount: "200.00",
          },
        ],
        products: [
          {
            externalProductId: "product_ext_1",
            metadata: {},
            sku: "SKU-1",
            title: "Product 1",
          },
        ],
      }),
    };

    (service as unknown as { providers: unknown[] }).providers = [provider];
    (
      service as unknown as {
        persistSyncResult: ReturnType<typeof vi.fn>;
      }
    ).persistSyncResult = vi.fn().mockResolvedValue({
      fees: 1,
      items: 1,
      orders: 1,
      products: 1,
    });

    db.query.marketplaceConnections.findFirst.mockResolvedValue({
      accessToken: "token",
      createdAt: new Date("2026-05-01T11:00:00.000Z"),
      externalAccountId: "seller_123",
      id: "conn_123",
      lastSyncedAt: null,
      metadata: {},
      companyId: "company_123",
      organizationId: "org_123",
      provider: "mercadolivre",
      refreshToken: "refresh",
      status: "connected",
      tokenExpiresAt: new Date("2026-07-03T11:00:00.000Z"),
      updatedAt: new Date("2026-05-01T11:00:00.000Z"),
    });
    db.query.syncRuns.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        createdAt: new Date("2026-05-01T12:35:00.000Z"),
        errorSummary: null,
        finishedAt: new Date("2026-05-01T12:35:00.000Z"),
        id: "sync_123",
        marketplaceConnectionId: "conn_123",
        companyId: "company_123",
        metadata: {
          importCounts: {
            fees: 1,
            items: 1,
            orders: 1,
            products: 1,
          },
          resultCursor: {
            orderedAfter: "2026-05-01T11:45:00.000Z",
          },
        },
        organizationId: "org_123",
        provider: "mercadolivre",
        startedAt: new Date("2026-05-01T12:31:00.000Z"),
        status: "completed",
        updatedAt: new Date("2026-05-01T12:35:00.000Z"),
        windowKey: null,
      });
    db.insert = createInsertMock([
      [
        {
          createdAt: new Date("2026-05-01T12:30:00.000Z"),
          errorSummary: null,
          finishedAt: null,
          id: "sync_123",
          marketplaceConnectionId: "conn_123",
          metadata: {},
          companyId: "company_123",
          organizationId: "org_123",
          provider: "mercadolivre",
          startedAt: null,
          status: "pending",
          updatedAt: new Date("2026-05-01T12:30:00.000Z"),
          windowKey: null,
        },
      ],
    ]);
    db.update = createUpdateMock({
      createdAt: new Date("2026-05-01T12:30:00.000Z"),
      errorSummary: null,
      finishedAt: new Date("2026-05-01T12:35:00.000Z"),
      id: "sync_123",
      marketplaceConnectionId: "conn_123",
      companyId: "company_123",
      metadata: {
        importCounts: {
          fees: 1,
          items: 1,
          orders: 1,
          products: 1,
        },
        trigger: {
          manualRange: {
            endAt: "2026-06-20T23:59:59.999Z",
            startAt: "2026-06-10T00:00:00.000Z",
          },
        },
      },
      organizationId: "org_123",
      provider: "mercadolivre",
      startedAt: new Date("2026-05-01T12:31:00.000Z"),
      status: "completed",
      updatedAt: new Date("2026-05-01T12:35:00.000Z"),
      windowKey: null,
    });

    const response = await service.runSync(
      "org_123",
      "company_123",
      "user_123",
      "mercadolivre",
      {
        endDate: "2026-06-20",
        startDate: "2026-06-10",
      },
    );

    expect(provider.syncOrders).toHaveBeenCalledTimes(1);
    expect(provider.syncOrders).toHaveBeenCalledWith(
      expect.objectContaining({
        connection: expect.objectContaining({ id: "conn_123" }),
        mode: "manual_range",
        organizationId: "org_123",
        range: {
          endAt: "2026-06-20T23:59:59.999Z",
          startAt: "2026-06-10T00:00:00.000Z",
        },
      }),
    );
    expect(syncPerformanceMaterializer.materializeForSync).toHaveBeenCalledWith(
      {
        companyId: "company_123",
        organizationId: "org_123",
        providerSlug: "mercadolivre",
        syncRunId: "sync_123",
        userId: "user_123",
      },
    );
    expect(financeService.materializeOrganizationMetrics).toHaveBeenCalledWith(
      "org_123",
      "company_123",
    );
    expect(response.run.counts.orders).toBe(1);
    expect(response.run.origin).toBe("manual");
    expect(response.availability.reason).toBe("available");
    expect(response.run.manualRange).toEqual({
      endAt: "2026-06-20T23:59:59.999Z",
      startAt: "2026-06-10T00:00:00.000Z",
    });
  });

  it("rejects manual ranges where start date is after end date", async () => {
    vi.setSystemTime(new Date("2026-06-22T12:30:00.000Z"));
    const { service } = createService();

    await expect(
      service.runSync("org_123", "company_123", "user_123", "mercadolivre", {
        endDate: "2026-06-10",
        startDate: "2026-06-11",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects manual ranges older than the rolling 30-day window", async () => {
    vi.setSystemTime(new Date("2026-06-22T12:30:00.000Z"));
    const { service } = createService();

    await expect(
      service.runSync("org_123", "company_123", "user_123", "mercadolivre", {
        endDate: "2026-05-22",
        startDate: "2026-05-20",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects manual ranges longer than one month", async () => {
    vi.setSystemTime(new Date("2026-03-01T12:30:00.000Z"));
    const { service } = createService();

    await expect(
      service.runSync("org_123", "company_123", "user_123", "mercadolivre", {
        endDate: "2026-03-01",
        startDate: "2026-01-30",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("keeps an expired Shopee connection available when it can refresh the token", async () => {
    vi.setSystemTime(new Date("2026-06-12T12:30:00.000Z"));
    const { db, service } = createService();
    (service as unknown as { providers: unknown[] }).providers = [
      {
        createAuthorization: vi.fn(),
        disconnect: vi.fn(),
        displayName: "Shopee",
        exchangeCode: vi.fn(),
        isConfigured: () => true,
        provider: "shopee" as const,
        refreshAccessToken: vi.fn(),
        supportsSync: () => true,
        syncOrders: vi.fn(),
      },
    ];
    db.query.marketplaceConnections.findFirst.mockResolvedValue({
      accessToken: "expired-token",
      createdAt: new Date("2026-06-01T10:00:00.000Z"),
      externalAccountId: "987654",
      id: "conn_1",
      lastSyncedAt: null,
      metadata: {},
      companyId: "company_123",
      organizationId: "org_123",
      provider: "shopee",
      refreshToken: "refresh-token",
      status: "connected",
      tokenExpiresAt: new Date("2026-06-12T11:00:00.000Z"),
      updatedAt: new Date("2026-06-01T10:00:00.000Z"),
    });
    db.query.syncRuns.findFirst.mockResolvedValue(null);

    const status = await service.getStatus("org_123", "company_123", "shopee");

    expect(status.availability.canRun).toBe(true);
    expect(status.availability.reason).toBe("available");
  });

  it("fails the sync honestly when performance materialization cannot resolve an active company", async () => {
    vi.setSystemTime(new Date("2026-05-01T12:30:00.000Z"));
    const { db, financeService, service, syncPerformanceMaterializer } =
      createService();
    const provider = {
      createAuthorization: vi.fn(),
      disconnect: vi.fn(),
      displayName: "Mercado Livre",
      exchangeCode: vi.fn(),
      isConfigured: () => true,
      provider: "mercadolivre" as const,
      supportsSync: () => true,
      syncOrders: vi.fn().mockResolvedValue({
        cursor: null,
        orders: [],
        products: [],
      }),
    };

    (service as unknown as { providers: unknown[] }).providers = [provider];
    (
      service as unknown as {
        persistSyncResult: ReturnType<typeof vi.fn>;
      }
    ).persistSyncResult = vi.fn().mockResolvedValue({
      fees: 0,
      items: 0,
      orders: 0,
      products: 0,
    });
    syncPerformanceMaterializer.materializeForSync = vi
      .fn()
      .mockRejectedValue(new BadRequestException("missing active company"));

    db.query.marketplaceConnections.findFirst.mockResolvedValue({
      accessToken: "token",
      createdAt: new Date("2026-05-01T11:00:00.000Z"),
      externalAccountId: "seller_123",
      id: "conn_123",
      lastSyncedAt: null,
      metadata: {},
      companyId: "company_123",
      organizationId: "org_123",
      provider: "mercadolivre",
      refreshToken: "refresh",
      status: "connected",
      tokenExpiresAt: new Date("2026-05-03T11:00:00.000Z"),
      updatedAt: new Date("2026-05-01T11:00:00.000Z"),
    });
    db.query.syncRuns.findFirst.mockResolvedValue(null);
    db.insert = createInsertMock([
      [
        {
          createdAt: new Date("2026-05-01T12:30:00.000Z"),
          errorSummary: null,
          finishedAt: null,
          id: "sync_123",
          marketplaceConnectionId: "conn_123",
          metadata: {},
          companyId: "company_123",
          organizationId: "org_123",
          provider: "mercadolivre",
          startedAt: null,
          status: "pending",
          updatedAt: new Date("2026-05-01T12:30:00.000Z"),
          windowKey: "2026-05-01:morning",
        },
      ],
    ]);
    db.update = createUpdateMock({
      createdAt: new Date("2026-05-01T12:30:00.000Z"),
      errorSummary: null,
      finishedAt: null,
      id: "sync_123",
      marketplaceConnectionId: "conn_123",
      metadata: {},
      companyId: "company_123",
      organizationId: "org_123",
      provider: "mercadolivre",
      startedAt: new Date("2026-05-01T12:31:00.000Z"),
      status: "processing",
      updatedAt: new Date("2026-05-01T12:31:00.000Z"),
      windowKey: "2026-05-01:morning",
    });

    await expect(
      service.runSync("org_123", "company_123", "user_123", "mercadolivre", {
        endDate: "2026-05-20",
        startDate: "2026-05-10",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(
      financeService.materializeOrganizationMetrics,
    ).not.toHaveBeenCalled();
  });

  it("ignores Mercado Livre notifications without user_id", async () => {
    const { service } = createService();

    await expect(
      service.handleMercadoLivreNotification({
        resource: "/orders/123",
        topic: "orders_v2",
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        reason: "missing_user_id",
        status: "ignored",
      }),
    );
  });

  it("marks a pending automatic rerun when a Mercado Livre sync is already processing", async () => {
    const { db, service } = createService();

    db.query.marketplaceConnections.findFirst
      .mockResolvedValueOnce({
        accessToken: "token",
        createdAt: new Date("2026-05-01T11:00:00.000Z"),
        externalAccountId: "seller_123",
        id: "conn_123",
        lastSyncedAt: null,
        metadata: {},
        companyId: "company_123",
        organizationId: "org_123",
        provider: "mercadolivre",
        refreshToken: "refresh",
        status: "connected",
        tokenExpiresAt: new Date("2030-05-03T11:00:00.000Z"),
        updatedAt: new Date("2026-05-01T11:00:00.000Z"),
      })
      .mockResolvedValueOnce({
        accessToken: "token",
        createdAt: new Date("2026-05-01T11:00:00.000Z"),
        externalAccountId: "seller_123",
        id: "conn_123",
        lastSyncedAt: null,
        metadata: {},
        companyId: "company_123",
        organizationId: "org_123",
        provider: "mercadolivre",
        refreshToken: "refresh",
        status: "connected",
        tokenExpiresAt: new Date("2030-05-03T11:00:00.000Z"),
        updatedAt: new Date("2026-05-01T11:00:00.000Z"),
      });
    db.query.syncRuns.findFirst.mockResolvedValueOnce({
      createdAt: new Date("2026-05-01T12:05:00.000Z"),
      errorSummary: null,
      finishedAt: null,
      id: "sync_processing",
      marketplaceConnectionId: "conn_123",
      metadata: {},
      companyId: "company_123",
      organizationId: "org_123",
      provider: "mercadolivre",
      startedAt: new Date("2026-05-01T12:01:00.000Z"),
      status: "processing",
      updatedAt: new Date("2026-05-01T12:05:00.000Z"),
      windowKey: null,
    });
    db.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });

    await expect(
      service.handleMercadoLivreNotification({
        resource: "/orders/123",
        topic: "orders_v2",
        userId: "seller_123",
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        reason: "active_run_pending_rerun",
        status: "rerun_marked",
      }),
    );

    expect(db.update).toHaveBeenCalledTimes(1);
  });

  it("links variant order items to matching external products during persistence", async () => {
    const { db, service } = createService();
    const insertedOrderItems: Array<Record<string, unknown>> = [];
    const externalProductRows = [{ id: "ext_prod_variant" }];
    const externalOrderRows = [{ id: "ext_order_1" }];

    db.insert = vi.fn().mockImplementation(() => ({
      values: vi.fn().mockImplementation((value) => {
        if (
          value &&
          typeof value === "object" &&
          "externalProductId" in value &&
          (value as { externalProductId?: unknown }).externalProductId ===
            "MLB123:456"
        ) {
          return {
            onConflictDoUpdate: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue(externalProductRows),
            }),
          };
        }

        if (
          value &&
          typeof value === "object" &&
          "externalOrderId" in value &&
          (value as { externalOrderId?: unknown }).externalOrderId === "order_1"
        ) {
          return {
            onConflictDoUpdate: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue(externalOrderRows),
            }),
          };
        }

        insertedOrderItems.push(value as Record<string, unknown>);
        return {
          returning: vi.fn().mockResolvedValue([]),
        };
      }),
    }));

    await (
      service as unknown as {
        persistSyncResult: (input: {
          companyId: string;
          connection: { id: string };
          organizationId: string;
          providerSlug: "mercadolivre";
          syncResult: {
            orders: Array<{
              currency: string;
              externalOrderId: string;
              fees: unknown[];
              items: Array<{
                externalProductId: string;
                metadata: { variationId: string };
                quantity: number;
                totalPrice: string;
                unitPrice: string;
                variationId: string;
              }>;
              metadata: {};
              orderedAt: string;
              status: string;
              totalAmount: string;
            }>;
            products: Array<{
              externalProductId: string;
              metadata: { itemId: string; variationId: string };
              sku: string;
              title: string;
            }>;
          };
          syncRunId: string;
        }) => Promise<unknown>;
      }
    ).persistSyncResult({
      companyId: "company_1",
      connection: { id: "conn_1" },
      organizationId: "org_1",
      providerSlug: "mercadolivre",
      syncResult: {
        orders: [
          {
            currency: "BRL",
            externalOrderId: "order_1",
            fees: [],
            items: [
              {
                externalProductId: "MLB123:456",
                metadata: { variationId: "456" },
                quantity: 1,
                totalPrice: "100.00",
                unitPrice: "100.00",
                variationId: "456",
              },
            ],
            metadata: {},
            orderedAt: "2026-05-01T10:00:00.000Z",
            status: "paid",
            totalAmount: "100.00",
          },
        ],
        products: [
          {
            externalProductId: "MLB123:456",
            metadata: { itemId: "MLB123", variationId: "456" },
            sku: "SKU-RED",
            title: "Camiseta Vermelha",
          },
        ],
      },
      syncRunId: "sync_1",
    });

    expect(insertedOrderItems).toEqual([
      expect.objectContaining({
        externalOrderId: "ext_order_1",
        externalProductId: "ext_prod_variant",
        quantity: 1,
      }),
    ]);
  });

  it("preserves previously imported fallback sku when order sync payload has null sku", async () => {
    const { db, service } = createService();
    let externalProductConflictSet: Record<string, unknown> | null = null;

    db.insert = vi.fn().mockImplementation(() => ({
      values: vi.fn().mockImplementation((value) => {
        if (
          value &&
          typeof value === "object" &&
          "externalProductId" in value &&
          (value as { externalProductId?: unknown }).externalProductId ===
            "MLB123:456"
        ) {
          return {
            onConflictDoUpdate: vi.fn().mockImplementation((payload) => {
              externalProductConflictSet = (
                payload as { set: Record<string, unknown> }
              ).set;
              return {
                returning: vi
                  .fn()
                  .mockResolvedValue([{ id: "ext_prod_variant" }]),
              };
            }),
          };
        }

        if (
          value &&
          typeof value === "object" &&
          "externalOrderId" in value &&
          (value as { externalOrderId?: unknown }).externalOrderId === "order_1"
        ) {
          return {
            onConflictDoUpdate: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ id: "ext_order_1" }]),
            }),
          };
        }

        return {
          returning: vi.fn().mockResolvedValue([]),
        };
      }),
    }));

    await (
      service as unknown as {
        persistSyncResult: (input: {
          companyId: string;
          connection: { id: string };
          organizationId: string;
          providerSlug: "mercadolivre";
          syncResult: {
            orders: Array<{
              currency: string;
              externalOrderId: string;
              fees: unknown[];
              items: Array<{
                externalProductId: string;
                quantity: number;
                totalPrice: string;
                unitPrice: string;
              }>;
              metadata: {};
              orderedAt: string;
              status: string;
              totalAmount: string;
            }>;
            products: Array<{
              externalProductId: string;
              metadata: { itemId: string; variationId: string };
              sku: null;
              title: null;
            }>;
          };
          syncRunId: string;
        }) => Promise<unknown>;
      }
    ).persistSyncResult({
      companyId: "company_1",
      connection: { id: "conn_1" },
      organizationId: "org_1",
      providerSlug: "mercadolivre",
      syncResult: {
        orders: [
          {
            currency: "BRL",
            externalOrderId: "order_1",
            fees: [],
            items: [
              {
                externalProductId: "MLB123:456",
                quantity: 1,
                totalPrice: "100.00",
                unitPrice: "100.00",
              },
            ],
            metadata: {},
            orderedAt: "2026-05-01T10:00:00.000Z",
            status: "paid",
            totalAmount: "100.00",
          },
        ],
        products: [
          {
            externalProductId: "MLB123:456",
            metadata: { itemId: "MLB123", variationId: "456" },
            sku: null,
            title: null,
          },
        ],
      },
      syncRunId: "sync_1",
    });

    expect(externalProductConflictSet).not.toBeNull();
    expect(externalProductConflictSet).not.toHaveProperty("sku");
    expect(externalProductConflictSet).not.toHaveProperty("title");
  });
});
