import { ConflictException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IntegrationsService } from "./integrations.service";

function createUpdateMock() {
  return vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  });
}

function createService() {
  const db = {
    insert: vi.fn(),
    query: {
      externalProducts: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      marketplaceConnections: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      products: {
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
  const productsService = {
    createProduct: vi.fn(),
    requireProductAccess: vi.fn(),
  };

  return {
    db,
    env,
    productsService,
    service: new IntegrationsService(db as never, productsService as never, env as never),
  };
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
        authorizationUrl: expect.stringContaining(
          "https://auth.mercadolivre.com.br/authorization",
        ),
        provider: "mercadolivre",
      }),
    );
  });

  it("lists synced products with review metrics and SKU suggestions", async () => {
    const { db, service } = createService();

    db.query.externalProducts.findMany.mockResolvedValue([
      {
        createdAt: new Date("2026-05-01T10:00:00.000Z"),
        externalProductId: "MLB-1",
        id: "external_1",
        linkedProduct: null,
        linkedProductId: null,
        marketplaceConnectionId: "conn_1",
        metadata: {},
        orderItems: [
          {
            createdAt: new Date("2026-05-01T11:00:00.000Z"),
            externalOrder: {
              orderedAt: new Date("2026-05-01T11:00:00.000Z"),
            },
            externalOrderId: "order_1",
            externalProductId: "external_1",
            id: "item_1",
            organizationId: "org_1",
            quantity: 2,
            totalPrice: "42.00",
            unitPrice: "21.00",
            updatedAt: new Date("2026-05-01T11:00:00.000Z"),
          },
        ],
        organizationId: "org_1",
        provider: "mercadolivre",
        reviewStatus: "unreviewed",
        sku: "SKU-42",
        title: "Kit Mercado Livre",
        updatedAt: new Date("2026-05-01T12:00:00.000Z"),
      },
    ]);
    db.query.products.findMany.mockResolvedValue([
      {
        createdAt: new Date("2026-04-29T10:00:00.000Z"),
        id: "product_1",
        isActive: true,
        name: "Kit Catalogo",
        organizationId: "org_1",
        sellingPrice: "30.00",
        sku: "SKU-42",
        updatedAt: new Date("2026-04-29T10:00:00.000Z"),
      },
    ]);

    await expect(service.listSyncedProducts("org_1", "mercadolivre")).resolves.toEqual([
      expect.objectContaining({
        externalProductId: "MLB-1",
        grossRevenue: "42.00",
        orderCount: 1,
        reviewStatus: "unreviewed",
        suggestedMatches: [
          expect.objectContaining({
            productId: "product_1",
            reason: "sku_exact",
          }),
        ],
        unitsSold: 2,
      }),
    ]);
  });

  it("rejects importing a synced product already linked to an existing catalog item", async () => {
    const { db, service } = createService();

    db.query.externalProducts.findFirst.mockResolvedValue({
      createdAt: new Date("2026-05-01T10:00:00.000Z"),
      externalProductId: "MLB-1",
      id: "external_1",
      linkedProduct: {
        createdAt: new Date("2026-04-29T10:00:00.000Z"),
        id: "product_1",
        isActive: true,
        name: "Produto existente",
        organizationId: "org_1",
        sellingPrice: "30.00",
        sku: "SKU-42",
        updatedAt: new Date("2026-04-29T10:00:00.000Z"),
      },
      linkedProductId: "product_1",
      marketplaceConnectionId: "conn_1",
      metadata: {},
      orderItems: [],
      organizationId: "org_1",
      provider: "mercadolivre",
      reviewStatus: "linked_to_existing_product",
      sku: "SKU-42",
      title: "Produto sincronizado",
      updatedAt: new Date("2026-05-01T12:00:00.000Z"),
    });

    await expect(
      service.importSyncedProduct("org_1", "mercadolivre", "MLB-1"),
    ).rejects.toBeInstanceOf(ConflictException);
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
    db.update = vi
      .fn()
      .mockReturnValueOnce({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
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
              },
            ]),
          }),
        }),
      })
      .mockImplementationOnce(createUpdateMock());

    await expect(service.disconnectProvider("org_1", "mercadolivre")).resolves.toEqual(
      expect.objectContaining({
        disconnectAvailable: false,
        provider: "mercadolivre",
        status: "disconnected",
      }),
    );
  });
});
