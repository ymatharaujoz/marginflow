import { beforeEach, describe, expect, it, vi } from "vitest";
import { IntegrationsService } from "./integrations.service";

function createService() {
  const db = {
    insert: vi.fn(),
    query: {
      marketplaceConnections: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    },
    update: vi.fn(),
  };
  const env = {
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
  };

  return {
    db,
    env,
    service: new IntegrationsService(db as never, env as never),
  };
}

function createUpdateMock(returnValue: unknown) {
  return vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([returnValue]),
      }),
    }),
  });
}

describe("IntegrationsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns provider cards including unavailable providers", async () => {
    const { db, service } = createService();

    db.query.marketplaceConnections.findMany.mockResolvedValue([
      {
        accessToken: "token",
        createdAt: new Date("2026-04-29T10:00:00.000Z"),
        externalAccountId: "123456",
        id: "conn_1",
        lastSyncedAt: new Date("2026-04-29T11:00:00.000Z"),
        metadata: {
          connectedAccountLabel: "SELLER123",
        },
        organizationId: "org_1",
        provider: "mercadolivre",
        refreshToken: "refresh",
        status: "connected",
        tokenExpiresAt: new Date("2026-05-01T10:00:00.000Z"),
        updatedAt: new Date("2026-04-29T10:00:00.000Z"),
      },
    ]);

    await expect(service.listConnections("org_1")).resolves.toEqual([
      expect.objectContaining({
        connectedAccountLabel: "SELLER123",
        displayName: "Mercado Livre",
        provider: "mercadolivre",
        status: "connected",
      }),
      expect.objectContaining({
        connectAvailable: false,
        displayName: "Shopee",
        provider: "shopee",
        status: "unavailable",
      }),
    ]);
  });

  it("creates the Mercado Livre authorization URL for the organization", async () => {
    const { service } = createService();

    await expect(service.createConnectUrl("org_1", "mercadolivre")).resolves.toEqual(
      expect.objectContaining({
        authorizationUrl: expect.stringContaining("https://auth.mercadolivre.com.br/authorization"),
        provider: "mercadolivre",
      }),
    );
  });

  it("disconnects and normalizes the updated provider card", async () => {
    const { db, service } = createService();

    db.query.marketplaceConnections.findFirst.mockResolvedValue({
      accessToken: "token",
      createdAt: new Date("2026-04-29T10:00:00.000Z"),
      externalAccountId: "123456",
      id: "conn_1",
      lastSyncedAt: new Date("2026-04-29T11:00:00.000Z"),
      metadata: {
        connectedAccountLabel: "SELLER123",
      },
      organizationId: "org_1",
      provider: "mercadolivre",
      refreshToken: "refresh",
      status: "connected",
      tokenExpiresAt: new Date("2026-05-01T10:00:00.000Z"),
      updatedAt: new Date("2026-04-29T10:00:00.000Z"),
    });
    db.update = createUpdateMock({
      accessToken: null,
      createdAt: new Date("2026-04-29T10:00:00.000Z"),
      externalAccountId: null,
      id: "conn_1",
      lastSyncedAt: new Date("2026-04-29T11:00:00.000Z"),
      metadata: {
        connectedAccountLabel: null,
      },
      organizationId: "org_1",
      provider: "mercadolivre",
      refreshToken: null,
      status: "disconnected",
      tokenExpiresAt: null,
      updatedAt: new Date("2026-04-29T10:00:00.000Z"),
    });

    await expect(service.disconnectProvider("org_1", "mercadolivre")).resolves.toEqual(
      expect.objectContaining({
        disconnectAvailable: false,
        provider: "mercadolivre",
        status: "disconnected",
      }),
    );
  });
});
