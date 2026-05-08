import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FinanceService } from "@/modules/finance/finance.service";
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
    transaction: vi.fn(async (callback: (tx: typeof db) => Promise<unknown>) => callback(db)),
    update: vi.fn(),
  };
  const financeService = {
    materializeOrganizationMetrics: vi.fn(),
  } satisfies Pick<FinanceService, "materializeOrganizationMetrics">;
  const service = new SyncService(
    db as never,
    {
      API_DB_POOL_MAX: 5,
      API_HOST: "127.0.0.1",
      API_PORT: 4000,
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
      SYNC_RELAX_GUARDS: false,
      ...envOverrides,
    } as never,
    financeService as never,
  );

  return {
    db,
    financeService,
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

  it("blocks the current window after a successful sync already exists", async () => {
    vi.setSystemTime(new Date("2026-05-01T12:30:00.000Z"));
    const { db, service } = createService();

    db.query.marketplaceConnections.findFirst.mockResolvedValue({
      accessToken: "token",
      createdAt: new Date("2026-05-01T11:00:00.000Z"),
      externalAccountId: "seller_123",
      id: "conn_123",
      lastSyncedAt: new Date("2026-05-01T12:05:00.000Z"),
      metadata: {},
      organizationId: "org_123",
      provider: "mercadolivre",
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
        organizationId: "org_123",
        provider: "mercadolivre",
        startedAt: new Date("2026-05-01T12:01:00.000Z"),
        status: "completed",
        updatedAt: new Date("2026-05-01T12:05:00.000Z"),
        windowKey: "2026-05-01:morning",
      });

    const status = await service.getStatus("org_123", "mercadolivre");

    expect(status.availability.canRun).toBe(false);
    expect(status.availability.reason).toBe("window_already_used");
  });

  it("allows the current window again when SYNC_RELAX_GUARDS is enabled outside production", async () => {
    vi.setSystemTime(new Date("2026-05-01T12:30:00.000Z"));
    const { db, service } = createService({ SYNC_RELAX_GUARDS: true, NODE_ENV: "development" });

    db.query.marketplaceConnections.findFirst.mockResolvedValue({
      accessToken: "token",
      createdAt: new Date("2026-05-01T11:00:00.000Z"),
      externalAccountId: "seller_123",
      id: "conn_123",
      lastSyncedAt: new Date("2026-05-01T12:05:00.000Z"),
      metadata: {},
      organizationId: "org_123",
      provider: "mercadolivre",
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
        organizationId: "org_123",
        provider: "mercadolivre",
        startedAt: new Date("2026-05-01T12:01:00.000Z"),
        status: "completed",
        updatedAt: new Date("2026-05-01T12:05:00.000Z"),
        windowKey: "2026-05-01:morning",
      });

    const status = await service.getStatus("org_123", "mercadolivre");

    expect(status.availability.canRun).toBe(true);
    expect(status.availability.reason).toBe("available");
  });

  it("ignores SYNC_RELAX_GUARDS when NODE_ENV is production", async () => {
    vi.setSystemTime(new Date("2026-05-01T12:30:00.000Z"));
    const { db, service } = createService({ SYNC_RELAX_GUARDS: true, NODE_ENV: "production" });

    db.query.marketplaceConnections.findFirst.mockResolvedValue({
      accessToken: "token",
      createdAt: new Date("2026-05-01T11:00:00.000Z"),
      externalAccountId: "seller_123",
      id: "conn_123",
      lastSyncedAt: new Date("2026-05-01T12:05:00.000Z"),
      metadata: {},
      organizationId: "org_123",
      provider: "mercadolivre",
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
        organizationId: "org_123",
        provider: "mercadolivre",
        startedAt: new Date("2026-05-01T12:01:00.000Z"),
        status: "completed",
        updatedAt: new Date("2026-05-01T12:05:00.000Z"),
        windowKey: "2026-05-01:morning",
      });

    const status = await service.getStatus("org_123", "mercadolivre");

    expect(status.availability.canRun).toBe(false);
    expect(status.availability.reason).toBe("window_already_used");
  });

  it("runs a sync, stores imported data, and materializes finance metrics", async () => {
    vi.setSystemTime(new Date("2026-05-01T12:30:00.000Z"));
    const { db, financeService, service } = createService();
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
      organizationId: "org_123",
      provider: "mercadolivre",
      refreshToken: "refresh",
      status: "connected",
      tokenExpiresAt: new Date("2026-05-03T11:00:00.000Z"),
      updatedAt: new Date("2026-05-01T11:00:00.000Z"),
    });
    db.query.syncRuns.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        createdAt: new Date("2026-05-01T12:35:00.000Z"),
        errorSummary: null,
        finishedAt: new Date("2026-05-01T12:35:00.000Z"),
        id: "sync_123",
        marketplaceConnectionId: "conn_123",
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
        windowKey: "2026-05-01:morning",
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
      finishedAt: new Date("2026-05-01T12:35:00.000Z"),
      id: "sync_123",
      marketplaceConnectionId: "conn_123",
      metadata: {
        importCounts: {
          fees: 1,
          items: 1,
          orders: 1,
          products: 1,
        },
      },
      organizationId: "org_123",
      provider: "mercadolivre",
      startedAt: new Date("2026-05-01T12:31:00.000Z"),
      status: "completed",
      updatedAt: new Date("2026-05-01T12:35:00.000Z"),
      windowKey: "2026-05-01:morning",
    });

    const response = await service.runSync("org_123", "mercadolivre");

    expect(provider.syncOrders).toHaveBeenCalledTimes(1);
    expect(financeService.materializeOrganizationMetrics).toHaveBeenCalledWith("org_123");
    expect(response.run.counts.orders).toBe(1);
    expect(response.availability.reason).toBe("window_already_used");
  });

  it("clears non-processing sync history for provider", async () => {
    const { db, service } = createService();
    const where = vi.fn().mockResolvedValue([
      { id: "sync_1" },
      { id: "sync_2" },
    ]);

    db.delete.mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: where,
      }),
    });

    const response = await service.clearHistory("org_123", "mercadolivre");

    expect(db.delete).toHaveBeenCalledTimes(1);
    expect(where).toHaveBeenCalledTimes(1);
    expect(response).toEqual({
      clearedCount: 2,
    });
  });
});
