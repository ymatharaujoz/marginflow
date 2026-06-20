import { ConflictException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSignedIntegrationState } from "./integration-state";
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
      productImages: {
        findMany: vi.fn(),
      },
    },
    select: vi.fn(),
    update: vi.fn(),
    transaction: vi.fn(),
  };
  const env = {
    API_DB_POOL_MAX: 5,
    API_HOST: "127.0.0.1",
    API_PORT: 4000,
    BETTER_AUTH_SECRET: "secret",
    BETTER_AUTH_URL: "http://localhost:4000",
    DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/lucreii",
    MERCADOLIVRE_CLIENT_ID: "ml-client-id",
    MERCADOLIVRE_CLIENT_SECRET: "ml-client-secret",
    MERCADOLIVRE_USE_PKCE: false,
    NODE_ENV: "test",
    STRIPE_PRICE_START_MONTHLY: "price_start_monthly",
    STRIPE_PRICE_START_ANNUAL: "price_start_annual",
    STRIPE_PRICE_PRO_MONTHLY: "price_pro_monthly",
    STRIPE_PRICE_PRO_ANNUAL: "price_pro_annual",
    STRIPE_PRICE_BUSINESS_MONTHLY: "price_business_monthly",
    STRIPE_PRICE_BUSINESS_ANNUAL: "price_business_annual",
    STRIPE_SECRET_KEY: "stripe",
    STRIPE_WEBHOOK_SECRET: "webhook",
    SYNC_RELAX_GUARDS: false,
    WEB_APP_ORIGIN: "http://localhost:3000",
  };
  const productsService = {
    assertCatalogImportAllowed: vi.fn(),
    createProduct: vi.fn(),
    requireProductAccess: vi.fn(),
  };
  const syncService = {
    handleMercadoLivreNotification: vi.fn(),
  };

  return {
    db,
    env,
    productsService,
    syncService,
    service: new IntegrationsService(
      db as never,
      productsService as never,
      syncService as never,
      env as never,
    ),
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
        tokenExpiresAt: new Date("2030-05-01T10:00:00.000Z"),
        updatedAt: new Date("2026-04-29T10:00:00.000Z"),
      },
    ]);

    await expect(service.listConnections("org_1", "company_1")).resolves.toEqual([
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

  it("imports Mercado Livre catalog products and their image gallery", async () => {
    const { db, productsService, service } = createService();
    const remoteProduct = {
      externalProductId: "MLB1",
      images: [
        "https://http2.mlstatic.com/one.jpg",
        "https://http2.mlstatic.com/two.jpg",
      ],
      isActive: true,
      metadata: { itemId: "MLB1", variationId: null },
      sellingPrice: "59.90",
      sku: "SKU-1",
      title: "Produto Mercado Livre",
    };
    (service as unknown as { providers: unknown[] }).providers = [
      {
        displayName: "Mercado Livre",
        importCatalog: vi.fn().mockResolvedValue([remoteProduct]),
        provider: "mercadolivre",
      },
    ];
    db.query.marketplaceConnections.findFirst.mockResolvedValue({
      accessToken: "token",
      externalAccountId: "seller-1",
      id: "connection-1",
      organizationId: "org-1",
      provider: "mercadolivre",
      status: "connected",
      tokenExpiresAt: null,
    });
    db.query.products.findMany.mockResolvedValue([]);
    db.query.externalProducts.findMany.mockResolvedValue([]);
    db.query.productImages.findMany.mockResolvedValue([]);

    const insertedProduct = {
      createdAt: new Date("2026-06-15T10:00:00.000Z"),
      id: "product-1",
      isActive: true,
      name: remoteProduct.title,
      organizationId: "org-1",
      sellingPrice: remoteProduct.sellingPrice,
      sku: remoteProduct.sku,
      updatedAt: new Date("2026-06-15T10:00:00.000Z"),
    };
    const tx = {
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
      insert: vi
        .fn()
        .mockReturnValueOnce({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([insertedProduct]),
          }),
        })
        .mockReturnValueOnce({
          values: vi.fn().mockReturnValue({
            onConflictDoUpdate: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ id: "external-1" }]),
            }),
          }),
        })
        .mockReturnValueOnce({
          values: vi.fn().mockResolvedValue(undefined),
        }),
      update: vi.fn(),
    };
    db.transaction.mockImplementation(
      async (callback: (transaction: typeof tx) => unknown) => callback(tx),
    );

    await expect(
      service.importMercadoLivreCatalog({
        companyId: "company-1",
        organizationId: "org-1",
        userId: "user-1",
      }),
    ).resolves.toEqual({
      conflicts: [],
      created: 1,
      errors: [],
      found: 1,
      unchanged: 0,
      updated: 0,
    });
    expect(productsService.assertCatalogImportAllowed).toHaveBeenCalledWith({
      companyId: "company-1",
      organizationId: "org-1",
      userId: "user-1",
    });
    expect(tx.insert).toHaveBeenCalledTimes(3);
  });

  it("reports duplicate internal SKUs as conflicts without writing", async () => {
    const { db, service } = createService();
    (service as unknown as { providers: unknown[] }).providers = [
      {
        displayName: "Mercado Livre",
        importCatalog: vi.fn().mockResolvedValue([
          {
            externalProductId: "MLB1",
            images: [],
            isActive: true,
            metadata: {},
            sellingPrice: "59.90",
            sku: "DUPLICATE",
            title: "Produto",
          },
        ]),
        provider: "mercadolivre",
      },
    ];
    db.query.marketplaceConnections.findFirst.mockResolvedValue({
      accessToken: "token",
      externalAccountId: "seller-1",
      status: "connected",
    });
    db.query.products.findMany.mockResolvedValue([
      { id: "product-1", sku: "duplicate", images: [] },
      { id: "product-2", sku: "DUPLICATE", images: [] },
    ]);
    db.query.externalProducts.findMany.mockResolvedValue([]);
    db.query.productImages.findMany.mockResolvedValue([]);

    const result = await service.importMercadoLivreCatalog({
      companyId: "company-1",
      organizationId: "org-1",
      userId: "user-1",
    });

    expect(result.conflicts).toEqual([
      {
        externalProductId: "MLB1",
        message: 'SKU "DUPLICATE" corresponde a mais de um produto interno',
        sku: "DUPLICATE",
      },
    ]);
    expect(result.created).toBe(0);
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("keeps a repeated catalog import unchanged without replacing images", async () => {
    const { db, service } = createService();
    const catalogProduct = {
      externalProductId: "MLB1",
      images: ["https://http2.mlstatic.com/one.jpg"],
      isActive: true,
      metadata: { itemId: "MLB1", variationId: null },
      sellingPrice: "59.90",
      sku: "SKU-1",
      title: "Produto",
    };
    (service as unknown as { providers: unknown[] }).providers = [
      {
        displayName: "Mercado Livre",
        importCatalog: vi.fn().mockResolvedValue([catalogProduct]),
        provider: "mercadolivre",
      },
    ];
    db.query.marketplaceConnections.findFirst.mockResolvedValue({
      accessToken: "token",
      externalAccountId: "seller-1",
      id: "connection-1",
      status: "connected",
      tokenExpiresAt: null,
    });
    db.query.products.findMany.mockResolvedValue([
      {
        id: "product-1",
        isActive: true,
        name: "Produto",
        sellingPrice: "59.90",
        sku: "SKU-1",
      },
    ]);
    db.query.externalProducts.findMany.mockResolvedValue([
      {
        externalProductId: "MLB1",
        linkedProductId: "product-1",
      },
    ]);
    db.query.productImages.findMany.mockResolvedValue([
      {
        position: 0,
        productId: "product-1",
        source: "mercadolivre",
        url: "https://http2.mlstatic.com/one.jpg",
      },
    ]);
    const tx = {
      delete: vi.fn(),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: "external-1" }]),
          }),
        }),
      }),
      update: vi.fn(),
    };
    db.transaction.mockImplementation(
      async (callback: (transaction: typeof tx) => unknown) => callback(tx),
    );

    const result = await service.importMercadoLivreCatalog({
      companyId: "company-1",
      organizationId: "org-1",
      userId: "user-1",
    });

    expect(result.unchanged).toBe(1);
    expect(result.created).toBe(0);
    expect(result.updated).toBe(0);
    expect(tx.update).not.toHaveBeenCalled();
    expect(tx.delete).not.toHaveBeenCalled();
  });

  it("creates the Mercado Livre authorization URL for the organization", async () => {
    const { service } = createService();

    await expect(
      service.createConnectUrl("org_1", "company_1", "mercadolivre"),
    ).resolves.toEqual(
      expect.objectContaining({
        authorizationUrl: expect.stringContaining(
          "https://auth.mercadolivre.com.br/authorization",
        ),
        provider: "mercadolivre",
      }),
    );
  });

  it("returns actionable callback error when PKCE mode is enabled without verifier metadata", async () => {
    const { env, service } = createService();
    env.MERCADOLIVRE_USE_PKCE = true;

    const expiredOrMissingVerifierState = createSignedIntegrationState(
      {
        companyId: "company_1",
        organizationId: "org_1",
        provider: "mercadolivre",
      },
      env.BETTER_AUTH_SECRET,
    );

    await expect(
      service.handleMercadoLivreCallback({
        code: "auth-code",
        state: expiredOrMissingVerifierState,
      }),
    ).resolves.toContain("message=");
  });

  it("logs Mercado Livre callback code when provider returns one", async () => {
    const { service } = createService();
    const loggerSpy = vi.spyOn(service["logger"], "log");

    await service.handleMercadoLivreCallback({
      code: "TG-abc123",
      state: "invalid-state",
    });

    expect(loggerSpy).toHaveBeenCalledWith(
      expect.stringContaining("code=TG-abc123"),
    );
  });

  it("auto-links synced products to catalog products when SKU matches", async () => {
    const { db, service } = createService();
    db.update = createUpdateMock();

    db.select
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([
              {
                createdAt: new Date("2026-05-01T10:00:00.000Z"),
                externalProductId: "MLB-1",
                id: "external_1",
                linkedProductId: null,
                marketplaceConnectionId: "conn_1",
                metadata: {},
                organizationId: "org_1",
                provider: "mercadolivre",
                reviewStatus: "unreviewed",
                sku: "SKU-42",
                title: "Kit Mercado Livre",
                updatedAt: new Date("2026-05-01T12:00:00.000Z"),
              },
            ]),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              {
                externalOrder: {
                  id: "order_1",
                  orderedAt: new Date("2026-05-01T11:00:00.000Z"),
                },
                orderItem: {
                  createdAt: new Date("2026-05-01T11:00:00.000Z"),
                  externalOrderId: "order_1",
                  externalProductId: "external_1",
                  id: "item_1",
                  organizationId: "org_1",
                  quantity: 2,
                  totalPrice: "42.00",
                  unitPrice: "21.00",
                  updatedAt: new Date("2026-05-01T11:00:00.000Z"),
                },
              },
            ]),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              amount: "14.00",
              createdAt: new Date("2026-05-01T11:00:00.000Z"),
              currency: "BRL",
              externalOrderId: "order_1",
              feeType: "marketplace_commission",
              id: "fee_1",
              metadata: {},
              organizationId: "org_1",
              provider: "mercadolivre",
              updatedAt: new Date("2026-05-01T11:00:00.000Z"),
            },
            {
              amount: "4.00",
              createdAt: new Date("2026-05-01T11:00:00.000Z"),
              currency: "BRL",
              externalOrderId: "order_1",
              feeType: "fixed_fee",
              id: "fee_2",
              metadata: {},
              organizationId: "org_1",
              provider: "mercadolivre",
              updatedAt: new Date("2026-05-01T11:00:00.000Z"),
            },
            {
              amount: "8.00",
              createdAt: new Date("2026-05-01T11:00:00.000Z"),
              currency: "BRL",
              externalOrderId: "order_1",
              feeType: "shipping_cost",
              id: "fee_3",
              metadata: {},
              organizationId: "org_1",
              provider: "mercadolivre",
              updatedAt: new Date("2026-05-01T11:00:00.000Z"),
            },
          ]),
        }),
      });
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

    await expect(
      service.listSyncedProducts("org_1", "company_1", "mercadolivre"),
    ).resolves.toEqual([
      expect.objectContaining({
        externalProductId: "MLB-1",
        fixedFee: "4.00",
        grossRevenue: "42.00",
        marketplaceCommission: "14.00",
        netMarketplaceTake: "26.00",
        orderCount: 1,
        shippingCost: "8.00",
        linkedProduct: expect.objectContaining({
          id: "product_1",
          sku: "SKU-42",
        }),
        reviewStatus: "linked_to_existing_product",
        suggestedMatches: [],
        unitsSold: 2,
      }),
    ]);
    expect(db.update).toHaveBeenCalledTimes(1);
  });

  it("does not auto-link synced products to products from another company", async () => {
    const { db, service } = createService();
    db.update = createUpdateMock();

    db.select
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([
              {
                createdAt: new Date("2026-05-01T10:00:00.000Z"),
                externalProductId: "MLB-1",
                id: "external_1",
                linkedProductId: null,
                marketplaceConnectionId: "conn_1",
                metadata: {},
                organizationId: "org_1",
                companyId: "company_1",
                provider: "mercadolivre",
                reviewStatus: "unreviewed",
                sku: "SKU-42",
                title: "Kit Mercado Livre",
                updatedAt: new Date("2026-05-01T12:00:00.000Z"),
              },
            ]),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
    db.query.products.findMany.mockResolvedValue([]);

    await expect(
      service.listSyncedProducts("org_1", "company_1", "mercadolivre"),
    ).resolves.toEqual([
      expect.objectContaining({
        externalProductId: "MLB-1",
        linkedProduct: null,
        reviewStatus: "unreviewed",
      }),
    ]);
    expect(db.query.products.findMany).toHaveBeenCalledOnce();
    expect(db.update).not.toHaveBeenCalled();
  });

  it("keeps synced products in review when more than one internal product shares the same SKU", async () => {
    const { db, service } = createService();
    db.update = createUpdateMock();

    db.select
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([
              {
                createdAt: new Date("2026-05-01T10:00:00.000Z"),
                externalProductId: "MLB-2",
                id: "external_2",
                linkedProductId: null,
                marketplaceConnectionId: "conn_1",
                metadata: {},
                organizationId: "org_1",
                provider: "mercadolivre",
                reviewStatus: "unreviewed",
                sku: "SKU-DUP",
                title: "Produto com SKU duplicado",
                updatedAt: new Date("2026-05-01T12:00:00.000Z"),
              },
            ]),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
    db.query.products.findMany.mockResolvedValue([
      {
        createdAt: new Date("2026-04-29T10:00:00.000Z"),
        id: "product_1",
        isActive: true,
        name: "Produto A",
        organizationId: "org_1",
        sellingPrice: "30.00",
        sku: "SKU-DUP",
        updatedAt: new Date("2026-04-29T10:00:00.000Z"),
      },
      {
        createdAt: new Date("2026-04-29T10:00:00.000Z"),
        id: "product_2",
        isActive: true,
        name: "Produto B",
        organizationId: "org_1",
        sellingPrice: "45.00",
        sku: "SKU-DUP",
        updatedAt: new Date("2026-04-29T10:00:00.000Z"),
      },
    ]);

    await expect(
      service.listSyncedProducts("org_1", "company_1", "mercadolivre"),
    ).resolves.toEqual([
      expect.objectContaining({
        externalProductId: "MLB-2",
        linkedProduct: null,
        reviewStatus: "unreviewed",
        suggestedMatches: [
          expect.objectContaining({
            productId: "product_1",
            sku: "SKU-DUP",
          }),
          expect.objectContaining({
            productId: "product_2",
            sku: "SKU-DUP",
          }),
        ],
      }),
    ]);
    expect(db.update).not.toHaveBeenCalled();
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
      service.importSyncedProduct("org_1", "company_1", "mercadolivre", "MLB-1"),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("creates synced products with the selected company scope", async () => {
    const { db, productsService, service } = createService();

    db.query.externalProducts.findFirst.mockResolvedValue({
      createdAt: new Date("2026-05-01T10:00:00.000Z"),
      externalProductId: "MLB-2",
      id: "external_2",
      linkedProductId: null,
      marketplaceConnectionId: "conn_1",
      metadata: {},
      orderItems: [],
      organizationId: "org_1",
      provider: "mercadolivre",
      reviewStatus: "unreviewed",
      sku: "SKU-99",
      title: "Produto novo",
      updatedAt: new Date("2026-05-01T12:00:00.000Z"),
    });
    productsService.createProduct.mockResolvedValue({
      id: "product_2",
    });
    vi
      .spyOn(
        service as unknown as {
          buildSyncedProductActionResult: (...args: unknown[]) => Promise<unknown>;
        },
        "buildSyncedProductActionResult",
      )
      .mockResolvedValue({
        message: "Produto sincronizado importado para o catálogo",
      } as never);
    db.update = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });

    await expect(
      service.importSyncedProduct("org_1", "company_1", "mercadolivre", "MLB-2"),
    ).resolves.toEqual(
      expect.objectContaining({
        message: "Produto sincronizado importado para o catálogo",
      }),
    );
    expect(productsService.createProduct).toHaveBeenCalledWith(
      {
        organizationId: "org_1",
        selectedCompanyId: "company_1",
        userId: "",
      },
      {
        isActive: true,
        name: "Produto novo",
        sellingPrice: "0.00",
        sku: "SKU-99",
      },
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
      tokenExpiresAt: new Date("2030-05-01T10:00:00.000Z"),
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

    await expect(
      service.disconnectProvider("org_1", "company_1", "mercadolivre"),
    ).resolves.toEqual(
      expect.objectContaining({
        disconnectAvailable: false,
        provider: "mercadolivre",
        status: "disconnected",
      }),
    );
  });

  it("delegates Mercado Livre notifications to the sync service", async () => {
    const { service, syncService } = createService();

    syncService.handleMercadoLivreNotification.mockResolvedValue({
      accepted: true,
      reason: "started",
      status: "started",
      summary: {
        applicationId: "123",
        attempts: 1,
        notificationId: "notif_1",
        resource: "/orders/1",
        sent: "2026-06-08T12:00:00.000Z",
        topic: "orders_v2",
        userId: "456",
      },
    });

    await expect(
      service.handleMercadoLivreNotification({
        _id: "notif_1",
        application_id: 123,
        attempts: 1,
        resource: "/orders/1",
        sent: "2026-06-08T12:00:00.000Z",
        topic: "orders_v2",
        user_id: 456,
      }),
    ).resolves.toEqual(expect.objectContaining({ status: "started" }));
  });

  it("logs route, notification summary, and ignore reason for ignored Mercado Livre notifications", async () => {
    const { service, syncService } = createService();
    const loggerSpy = vi.spyOn(service["logger"], "log");

    syncService.handleMercadoLivreNotification.mockResolvedValue({
      accepted: true,
      reason: "connection_not_found",
      status: "ignored",
      summary: {
        applicationId: "123",
        attempts: 1,
        notificationId: "notif_1",
        resource: "/orders/1",
        sent: "2026-06-08T12:00:00.000Z",
        topic: "orders_v2",
        userId: "456",
      },
    });

    await expect(
      service.handleMercadoLivreNotification(
        {
          _id: "notif_1",
          application_id: 123,
          attempts: 1,
          resource: "/orders/1",
          sent: "2026-06-08T12:00:00.000Z",
          topic: "orders_v2",
          user_id: 456,
        },
        "/integrations/mercadolivre/notifications",
      ),
    ).resolves.toEqual(expect.objectContaining({ status: "ignored" }));

    expect(loggerSpy).toHaveBeenCalledWith(
      expect.stringContaining("route=/integrations/mercadolivre/notifications"),
    );
    expect(loggerSpy).toHaveBeenCalledWith(
      expect.stringContaining("reason=connection_not_found"),
    );
    expect(loggerSpy).toHaveBeenCalledWith(
      expect.stringContaining("topic=orders_v2"),
    );
    expect(loggerSpy).toHaveBeenCalledWith(
      expect.stringContaining("resource=/orders/1"),
    );
    expect(loggerSpy).toHaveBeenCalledWith(
      expect.stringContaining("userId=456"),
    );
  });
});
