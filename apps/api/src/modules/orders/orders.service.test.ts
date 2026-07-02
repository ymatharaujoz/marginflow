import { afterEach, describe, expect, it, vi } from "vitest";
import { read, utils } from "xlsx";
import { OrdersService } from "./orders.service";

describe("OrdersService", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("backfills Mercado Livre sale id on order details when metadata is still missing", async () => {
    const updateWhereMock = vi.fn().mockResolvedValue([]);
    const updateSetMock = vi.fn().mockReturnValue({
      where: updateWhereMock,
    });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [
            {
              operation_id: 2000013674359901,
              order_id: 2000017085667456,
            },
          ],
        }),
        {
          headers: { "content-type": "application/json" },
          status: 200,
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.100000",
          }),
        },
        externalOrders: {
          findFirst: vi.fn().mockResolvedValue({
            id: "order_row_1",
            companyId: "company_123",
            createdAt: new Date("2026-06-24T12:00:00.000Z"),
            currency: "BRL",
            externalOrderId: "2000017085667456",
            marketplaceConnectionId: "conn_1",
            metadata: {},
            orderedAt: new Date("2026-06-24T10:15:00.000Z"),
            organizationId: "org_123",
            provider: "mercadolivre",
            status: "paid",
            syncRunId: null,
            updatedAt: new Date("2026-06-24T12:00:00.000Z"),
            totalAmount: "200.00",
            items: [],
            fees: [],
          }),
        },
        marketplaceConnections: {
          findMany: vi.fn().mockResolvedValue([
            {
              accessToken: "token_123",
              companyId: "company_123",
              externalAccountId: "seller_1",
              id: "conn_1",
              metadata: {},
              organizationId: "org_123",
              provider: "mercadolivre",
              refreshToken: null,
              status: "connected",
              tokenExpiresAt: new Date("2030-01-01T00:00:00.000Z"),
            },
          ]),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      },
      update: vi.fn().mockReturnValue({
        set: updateSetMock,
      }),
    };

    const service = new OrdersService(db as never, {
      API_DB_POOL_MAX: 5,
      API_HOST: "127.0.0.1",
      API_PORT: 4000,
      BETTER_AUTH_SECRET: "secret",
      BETTER_AUTH_URL: "http://localhost:4000",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/lucreii",
      MERCADOLIVRE_CLIENT_ID: "ml-client-id",
      MERCADOLIVRE_CLIENT_SECRET: "ml-client-secret",
      MERCADOLIVRE_REDIRECT_URI:
        "http://localhost:4000/integrations/mercadolivre/callback",
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
    });

    const result = await service.getOrderDetails(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      "order_row_1",
    );

    expect(result.order.displayOrderId).toBe("2000013674359901");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(updateSetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          operationId: "2000013674359901",
        }),
      }),
    );
  });

  it("refreshes an expired Mercado Livre token before backfilling the sale id", async () => {
    const updateWhereMock = vi.fn().mockResolvedValue([]);
    const updateSetMock = vi.fn().mockReturnValue({
      where: updateWhereMock,
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: "refreshed-token",
            expires_in: 21600,
            refresh_token: "refresh-2",
            token_type: "bearer",
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            results: [
              {
                operation_id: 2000013674359901,
                order_id: 2000017085667456,
              },
            ],
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.100000",
          }),
        },
        externalOrders: {
          findFirst: vi.fn().mockResolvedValue({
            id: "order_row_1",
            companyId: "company_123",
            createdAt: new Date("2026-06-24T12:00:00.000Z"),
            currency: "BRL",
            externalOrderId: "2000017085667456",
            marketplaceConnectionId: "conn_1",
            metadata: {},
            orderedAt: new Date("2026-06-24T10:15:00.000Z"),
            organizationId: "org_123",
            provider: "mercadolivre",
            status: "paid",
            syncRunId: null,
            updatedAt: new Date("2026-06-24T12:00:00.000Z"),
            totalAmount: "200.00",
            items: [],
            fees: [],
          }),
        },
        marketplaceConnections: {
          findMany: vi.fn().mockResolvedValue([
            {
              accessToken: "expired-token",
              companyId: "company_123",
              externalAccountId: "seller_1",
              id: "conn_1",
              metadata: {},
              organizationId: "org_123",
              provider: "mercadolivre",
              refreshToken: "refresh-1",
              status: "connected",
              tokenExpiresAt: new Date("2020-01-01T00:00:00.000Z"),
            },
          ]),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      },
      update: vi.fn().mockReturnValue({
        set: updateSetMock,
      }),
    };

    const service = new OrdersService(db as never, {
      API_DB_POOL_MAX: 5,
      API_HOST: "127.0.0.1",
      API_PORT: 4000,
      BETTER_AUTH_SECRET: "secret",
      BETTER_AUTH_URL: "http://localhost:4000",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/lucreii",
      MERCADOLIVRE_CLIENT_ID: "ml-client-id",
      MERCADOLIVRE_CLIENT_SECRET: "ml-client-secret",
      MERCADOLIVRE_REDIRECT_URI:
        "http://localhost:4000/integrations/mercadolivre/callback",
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
    });

    const result = await service.getOrderDetails(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      "order_row_1",
    );

    expect(result.order.displayOrderId).toBe("2000013674359901");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/oauth/token");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain(
      "/billing/integration/periods/",
    );
  });

  it("backfills Mercado Livre sale id when billing details require pagination", async () => {
    const updateWhereMock = vi.fn().mockResolvedValue([]);
    const updateSetMock = vi.fn().mockReturnValue({
      where: updateWhereMock,
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            last_id: "cursor-1",
            limit: 1000,
            offset: 0,
            results: [],
            total: 1001,
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            last_id: "cursor-2",
            limit: 1000,
            offset: 1000,
            results: [
              {
                operation_id: 2000013674359901,
                order_id: 2000017085667456,
              },
            ],
            total: 1001,
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            limit: 1000,
            offset: 1001,
            results: [],
            total: 1001,
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.100000",
          }),
        },
        externalOrders: {
          findFirst: vi.fn().mockResolvedValue({
            id: "order_row_1",
            companyId: "company_123",
            createdAt: new Date("2026-06-24T12:00:00.000Z"),
            currency: "BRL",
            externalOrderId: "2000017085667456",
            marketplaceConnectionId: "conn_1",
            metadata: {},
            orderedAt: new Date("2026-06-24T10:15:00.000Z"),
            organizationId: "org_123",
            provider: "mercadolivre",
            status: "paid",
            syncRunId: null,
            updatedAt: new Date("2026-06-24T12:00:00.000Z"),
            totalAmount: "200.00",
            items: [],
            fees: [],
          }),
        },
        marketplaceConnections: {
          findMany: vi.fn().mockResolvedValue([
            {
              accessToken: "token_123",
              companyId: "company_123",
              externalAccountId: "seller_1",
              id: "conn_1",
              metadata: {},
              organizationId: "org_123",
              provider: "mercadolivre",
              refreshToken: null,
              status: "connected",
              tokenExpiresAt: new Date("2030-01-01T00:00:00.000Z"),
            },
          ]),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      },
      update: vi.fn().mockReturnValue({
        set: updateSetMock,
      }),
    };

    const service = new OrdersService(db as never, {
      API_DB_POOL_MAX: 5,
      API_HOST: "127.0.0.1",
      API_PORT: 4000,
      BETTER_AUTH_SECRET: "secret",
      BETTER_AUTH_URL: "http://localhost:4000",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/lucreii",
      MERCADOLIVRE_CLIENT_ID: "ml-client-id",
      MERCADOLIVRE_CLIENT_SECRET: "ml-client-secret",
      MERCADOLIVRE_REDIRECT_URI:
        "http://localhost:4000/integrations/mercadolivre/callback",
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
    });

    const result = await service.getOrderDetails(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      "order_row_1",
    );

    expect(result.order.displayOrderId).toBe("2000013674359901");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("from_id=cursor-1");
  });

  it("backfills Mercado Livre sale id when billing returns multiple rows for the same order_id", async () => {
    const updateWhereMock = vi.fn().mockResolvedValue([]);
    const updateSetMock = vi.fn().mockReturnValue({
      where: updateWhereMock,
    });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          limit: 1000,
          offset: 0,
          results: [
            {
              order_id: 2000017085667456,
            },
            {
              operation_id: 2000013674359901,
              order_id: 2000017085667456,
            },
          ],
          total: 2,
        }),
        {
          headers: { "content-type": "application/json" },
          status: 200,
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.100000",
          }),
        },
        externalOrders: {
          findFirst: vi.fn().mockResolvedValue({
            id: "order_row_1",
            companyId: "company_123",
            createdAt: new Date("2026-06-24T12:00:00.000Z"),
            currency: "BRL",
            externalOrderId: "2000017085667456",
            marketplaceConnectionId: "conn_1",
            metadata: {},
            orderedAt: new Date("2026-06-24T10:15:00.000Z"),
            organizationId: "org_123",
            provider: "mercadolivre",
            status: "paid",
            syncRunId: null,
            updatedAt: new Date("2026-06-24T12:00:00.000Z"),
            totalAmount: "200.00",
            items: [],
            fees: [],
          }),
        },
        marketplaceConnections: {
          findMany: vi.fn().mockResolvedValue([
            {
              accessToken: "token_123",
              companyId: "company_123",
              externalAccountId: "seller_1",
              id: "conn_1",
              metadata: {},
              organizationId: "org_123",
              provider: "mercadolivre",
              refreshToken: null,
              status: "connected",
              tokenExpiresAt: new Date("2030-01-01T00:00:00.000Z"),
            },
          ]),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      },
      update: vi.fn().mockReturnValue({
        set: updateSetMock,
      }),
    };

    const service = new OrdersService(db as never, {
      API_DB_POOL_MAX: 5,
      API_HOST: "127.0.0.1",
      API_PORT: 4000,
      BETTER_AUTH_SECRET: "secret",
      BETTER_AUTH_URL: "http://localhost:4000",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/lucreii",
      MERCADOLIVRE_CLIENT_ID: "ml-client-id",
      MERCADOLIVRE_CLIENT_SECRET: "ml-client-secret",
      MERCADOLIVRE_REDIRECT_URI:
        "http://localhost:4000/integrations/mercadolivre/callback",
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
    });

    const result = await service.getOrderDetails(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      "order_row_1",
    );

    expect(result.order.displayOrderId).toBe("2000013674359901");
    expect(updateSetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          operationId: "2000013674359901",
        }),
      }),
    );
  });

  it("prefers linked catalog sku over external marketplace sku in order details", async () => {
    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.100000",
          }),
        },
        externalOrders: {
          findFirst: vi.fn().mockResolvedValue({
            id: "order_row_1",
            companyId: "company_123",
            createdAt: new Date("2026-06-24T12:00:00.000Z"),
            currency: "BRL",
            externalOrderId: "2000017085667456",
            marketplaceConnectionId: "conn_1",
            metadata: {},
            orderedAt: new Date("2026-06-24T10:15:00.000Z"),
            organizationId: "org_123",
            provider: "mercadolivre",
            status: "paid",
            syncRunId: null,
            updatedAt: new Date("2026-06-24T12:00:00.000Z"),
            totalAmount: "120.00",
            items: [
              {
                id: "item_1",
                quantity: 1,
                totalPrice: "120.00",
                unitPrice: "120.00",
                externalProduct: {
                  id: "ext_prod_1",
                  linkedProductId: "product_1",
                  sku: "ML-9238238958323",
                  title: "Produto 1",
                },
              },
            ],
            fees: [],
          }),
        },
        marketplaceConnections: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([
            {
              financeDefaults: {
                packagingCost: "0.00",
              },
              id: "product_1",
              images: [],
              name: "Produto 1",
              productCosts: [
                {
                  amount: "50.00",
                  createdAt: new Date("2026-06-01T00:00:00.000Z"),
                  effectiveFrom: new Date("2026-06-01T00:00:00.000Z"),
                },
              ],
              sku: "CALCAPRETA39",
            },
          ]),
        },
      },
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      }),
    };

    const service = new OrdersService(db as never, {
      API_DB_POOL_MAX: 5,
      API_HOST: "127.0.0.1",
      API_PORT: 4000,
      BETTER_AUTH_SECRET: "secret",
      BETTER_AUTH_URL: "http://localhost:4000",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/lucreii",
      MERCADOLIVRE_CLIENT_ID: "ml-client-id",
      MERCADOLIVRE_CLIENT_SECRET: "ml-client-secret",
      MERCADOLIVRE_REDIRECT_URI:
        "http://localhost:4000/integrations/mercadolivre/callback",
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
    });

    const result = await service.getOrderDetails(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      "order_row_1",
    );

    expect(result.order.skus).toEqual(["CALCAPRETA39"]);
    expect(result.items).toEqual([
      expect.objectContaining({
        linkedProductId: "product_1",
        sku: "CALCAPRETA39",
      }),
    ]);
  });

  it("refreshes Mercado Livre sale id when stored operationId is incorrectly equal to externalOrderId", async () => {
    const updateWhereMock = vi.fn().mockResolvedValue([]);
    const updateSetMock = vi.fn().mockReturnValue({
      where: updateWhereMock,
    });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          limit: 1000,
          offset: 0,
          results: [
            {
              order_id: 2000017085667456,
            },
            {
              operation_id: 2000013674359901,
              order_id: 2000017085667456,
            },
          ],
          total: 2,
        }),
        {
          headers: { "content-type": "application/json" },
          status: 200,
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.100000",
          }),
        },
        externalOrders: {
          findFirst: vi.fn().mockResolvedValue({
            id: "order_row_1",
            companyId: "company_123",
            createdAt: new Date("2026-06-24T12:00:00.000Z"),
            currency: "BRL",
            externalOrderId: "2000017085667456",
            marketplaceConnectionId: "conn_1",
            metadata: {
              operationId: "2000017085667456",
            },
            orderedAt: new Date("2026-06-24T10:15:00.000Z"),
            organizationId: "org_123",
            provider: "mercadolivre",
            status: "paid",
            syncRunId: null,
            updatedAt: new Date("2026-06-24T12:00:00.000Z"),
            totalAmount: "200.00",
            items: [],
            fees: [],
          }),
        },
        marketplaceConnections: {
          findMany: vi.fn().mockResolvedValue([
            {
              accessToken: "token_123",
              companyId: "company_123",
              externalAccountId: "seller_1",
              id: "conn_1",
              metadata: {},
              organizationId: "org_123",
              provider: "mercadolivre",
              refreshToken: null,
              status: "connected",
              tokenExpiresAt: new Date("2030-01-01T00:00:00.000Z"),
            },
          ]),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      },
      update: vi.fn().mockReturnValue({
        set: updateSetMock,
      }),
    };

    const service = new OrdersService(db as never, {
      API_DB_POOL_MAX: 5,
      API_HOST: "127.0.0.1",
      API_PORT: 4000,
      BETTER_AUTH_SECRET: "secret",
      BETTER_AUTH_URL: "http://localhost:4000",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/lucreii",
      MERCADOLIVRE_CLIENT_ID: "ml-client-id",
      MERCADOLIVRE_CLIENT_SECRET: "ml-client-secret",
      MERCADOLIVRE_REDIRECT_URI:
        "http://localhost:4000/integrations/mercadolivre/callback",
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
    });

    const result = await service.getOrderDetails(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      "order_row_1",
    );

    expect(result.order.displayOrderId).toBe("2000013674359901");
    expect(updateSetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          operationId: "2000013674359901",
        }),
      }),
    );
  });

  it("prefers Mercado Livre operation_id as displayed order id", async () => {
    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.100000",
          }),
        },
        externalOrders: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "order_row_1",
              companyId: "company_123",
              createdAt: new Date("2026-06-20T12:00:00.000Z"),
              currency: "BRL",
              externalOrderId: "MLB-ORDER-1001",
              metadata: {
                operationId: "MLB-SALE-9001",
              },
              orderedAt: new Date("2026-06-20T10:15:00.000Z"),
              organizationId: "org_123",
              provider: "mercadolivre",
              status: "paid",
              syncRunId: null,
              updatedAt: new Date("2026-06-20T12:00:00.000Z"),
              totalAmount: "200.00",
              items: [],
              fees: [],
            },
          ]),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      },
    };

    const service = new OrdersService(db as never);
    const result = await service.listOrders(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      {},
    );

    expect(result.items[0]).toEqual(
      expect.objectContaining({
        displayOrderId: "MLB-SALE-9001",
        orderId: "MLB-ORDER-1001",
      }),
    );
  });

  it("persists composition overrides and recalculates derived metrics", async () => {
    const updateSetMock = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: "order_row_1",
          },
        ]),
      }),
    });
    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.120000",
          }),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([
            {
              financeDefaults: {
                packagingCost: "4.00",
              },
              id: "product_1",
              images: [],
              name: "Produto 1",
              productCosts: [
                {
                  amount: "21.50",
                  createdAt: new Date("2026-06-01T00:00:00.000Z"),
                  effectiveFrom: new Date("2026-06-01T00:00:00.000Z"),
                },
              ],
            },
          ]),
        },
        externalOrders: {
          findFirst: vi
            .fn()
            .mockResolvedValueOnce({
              id: "order_row_1",
              companyId: "company_123",
              createdAt: new Date("2026-06-20T12:00:00.000Z"),
              currency: "BRL",
              externalOrderId: "MLB-1001",
              metadata: {},
              orderedAt: new Date("2026-06-20T10:15:00.000Z"),
              organizationId: "org_123",
              provider: "mercadolivre",
              status: "paid",
              syncRunId: null,
              updatedAt: new Date("2026-06-20T12:00:00.000Z"),
              totalAmount: "200.00",
              items: [
                {
                  id: "item_1",
                  quantity: 2,
                  totalPrice: "120.00",
                  unitPrice: "60.00",
                  externalProduct: {
                    id: "ext_prod_1",
                    linkedProductId: "product_1",
                    sku: "SKU-1",
                    title: "Produto 1",
                  },
                },
              ],
              fees: [
                {
                  amount: "20.00",
                  feeType: "shipping_cost",
                  id: "fee_ship",
                  metadata: {},
                },
                {
                  amount: "3.00",
                  feeType: "fixed_fee",
                  id: "fee_fixed",
                  metadata: {},
                },
                {
                  amount: "10.00",
                  feeType: "marketplace_commission",
                  id: "fee_commission",
                  metadata: {},
                },
              ],
            })
            .mockResolvedValueOnce({
              id: "order_row_1",
              companyId: "company_123",
              createdAt: new Date("2026-06-20T12:00:00.000Z"),
              currency: "BRL",
              externalOrderId: "MLB-1001",
              metadata: {
                compositionOverrides: {
                  marketplaceCommissionAmount: "15.00",
                  packagingCostAmount: "12.00",
                  productCostAmount: "80.00",
                  refundBonusAmount: "5.00",
                  shippingOrFixedFeeAmount: "30.00",
                },
              },
              orderedAt: new Date("2026-06-20T10:15:00.000Z"),
              organizationId: "org_123",
              provider: "mercadolivre",
              status: "paid",
              syncRunId: null,
              updatedAt: new Date("2026-06-20T12:00:00.000Z"),
              totalAmount: "200.00",
              items: [
                {
                  id: "item_1",
                  quantity: 2,
                  totalPrice: "120.00",
                  unitPrice: "60.00",
                  externalProduct: {
                    id: "ext_prod_1",
                    linkedProductId: "product_1",
                    sku: "SKU-1",
                    title: "Produto 1",
                  },
                },
              ],
              fees: [
                {
                  amount: "20.00",
                  feeType: "shipping_cost",
                  id: "fee_ship",
                  metadata: {},
                },
                {
                  amount: "3.00",
                  feeType: "fixed_fee",
                  id: "fee_fixed",
                  metadata: {},
                },
                {
                  amount: "10.00",
                  feeType: "marketplace_commission",
                  id: "fee_commission",
                  metadata: {},
                },
              ],
            }),
        },
      },
      update: vi.fn().mockReturnValue({
        set: updateSetMock,
      }),
    };

    const service = new OrdersService(db as never);
    const result = await service.updateOrderComposition(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      "order_row_1",
      {
        marketplaceCommissionAmount: "15.00",
        packagingCostAmount: "12.00",
        productCostAmount: "80.00",
        refundBonusAmount: "5.00",
        shippingOrFixedFeeAmount: "30.00",
      },
    );

    expect(updateSetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          compositionOverrides: {
            marketplaceCommissionAmount: "15.00",
            packagingCostAmount: "12.00",
            productCostAmount: "80.00",
            refundBonusAmount: "5.00",
            shippingOrFixedFeeAmount: "30.00",
          },
        }),
      }),
    );
    expect(result.composition).toEqual(
      expect.objectContaining({
        marketplaceCommissionAmount: "15.00",
        packagingCostAmount: "12.00",
        productCostAmount: "80.00",
        refundBonusAmount: "5.00",
        shippingOrFixedFeeAmount: "30.00",
        taxAmount: "24.00",
      }),
    );
    expect(result.order).toEqual(
      expect.objectContaining({
        contributionMarginPercent: "22.00",
        totalProfitAmount: "44.00",
      }),
    );
  });

  it("lists only orders from selected company and derives table totals", async () => {
    const db = {
      query: {
        products: {
          findMany: vi.fn().mockResolvedValue([
            {
              financeDefaults: {
                packagingCost: "4.00",
              },
              id: "product_1",
              images: [],
              name: "Produto 1",
              productCosts: [
                {
                  amount: "21.50",
                  createdAt: new Date("2026-06-01T00:00:00.000Z"),
                  effectiveFrom: new Date("2026-06-01T00:00:00.000Z"),
                },
              ],
            },
          ]),
        },
        externalOrders: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "order_row_1",
              companyId: "company_123",
              createdAt: new Date("2026-06-20T12:00:00.000Z"),
              currency: "BRL",
              externalOrderId: "MLB-1001",
              metadata: {},
              orderedAt: new Date("2026-06-20T10:15:00.000Z"),
              organizationId: "org_123",
              provider: "mercadolivre",
              status: "paid",
              syncRunId: null,
              updatedAt: new Date("2026-06-20T12:00:00.000Z"),
              totalAmount: "200.00",
              items: [
                {
                  id: "item_1",
                  quantity: 2,
                  totalPrice: "120.00",
                  unitPrice: "60.00",
                  externalProduct: {
                    id: "ext_prod_1",
                    linkedProductId: "product_1",
                    sku: "SKU-1",
                    title: "Produto 1",
                  },
                },
                {
                  id: "item_2",
                  quantity: 1,
                  totalPrice: "80.00",
                  unitPrice: "80.00",
                  externalProduct: {
                    id: "ext_prod_2",
                    linkedProductId: null,
                    sku: "SKU-2",
                    title: "Produto 2",
                  },
                },
              ],
              fees: [
                {
                  amount: "20.00",
                  feeType: "shipping_cost",
                  id: "fee_ship",
                  metadata: {},
                },
                {
                  amount: "3.00",
                  feeType: "fixed_fee",
                  id: "fee_fixed",
                  metadata: {},
                },
                {
                  amount: "10.00",
                  feeType: "marketplace_commission",
                  id: "fee_commission",
                  metadata: {},
                },
              ],
            },
          ]),
        },
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.120000",
          }),
        },
      },
    };

    const service = new OrdersService(db as never);

    await expect(
      service.listOrders(
        {
          organizationId: "org_123",
          selectedCompanyId: "company_123",
          userId: "user_123",
        },
        {
          page: 1,
          pageSize: 10,
          provider: undefined,
          search: undefined,
          status: undefined,
        },
      ),
    ).resolves.toEqual({
      summary: {
        averageMargin: "0.5800",
        grossProfit: "116.0000",
        grossRevenue: "200.0000",
        ordersCount: 1,
        unitsSold: 3,
      },
      availableStatuses: expect.arrayContaining([
        { label: "Pagamento pendente", value: "confirmed" },
        { label: "Pagamento aprovado", value: "paid" },
        { label: "Cancelado", value: "cancelled" },
      ]),
        items: [
          expect.objectContaining({
            contributionMarginPercent: null,
            fixedCostAmount: "3.00",
            itemsSold: 3,
            orderId: "MLB-1001",
            shippingAmount: "20.00",
            sourceStatus: "paid",
            tariffAmount: "10.00",
            status: "paid",
            statusLabel: "Pagamento aprovado",
            totalFees: "33.00",
            totalProfitAmount: null,
            totalWithFees: "200.00",
            totalWithoutFees: "167.00",
          }),
        ],
      page: 1,
      pageSize: 10,
      totalItems: 1,
      totalPages: 1,
    });
  });

  it("returns order detail with products table rows", async () => {
    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.120000",
          }),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "product_1",
              name: "Produto Pai",
              financeDefaults: {
                packagingCost: "4.00",
              },
              images: [
                {
                  position: 1,
                  url: "https://cdn.example.com/product-1-secondary.jpg",
                },
                {
                  position: 0,
                  url: "https://cdn.example.com/product-1-cover.jpg",
                },
              ],
              productCosts: [
                {
                  amount: "21.50",
                  createdAt: new Date("2026-06-01T00:00:00.000Z"),
                  effectiveFrom: new Date("2026-06-01T00:00:00.000Z"),
                },
              ],
            },
          ]),
        },
        externalOrders: {
          findFirst: vi.fn().mockResolvedValue({
            id: "order_row_1",
            companyId: "company_123",
            createdAt: new Date("2026-06-20T12:00:00.000Z"),
            currency: "BRL",
            externalOrderId: "SHP-1001",
            metadata: {},
            orderedAt: new Date("2026-06-20T10:15:00.000Z"),
            organizationId: "org_123",
            provider: "shopee",
            status: "completed",
            syncRunId: null,
            updatedAt: new Date("2026-06-20T12:00:00.000Z"),
            totalAmount: "200.00",
            items: [
              {
                id: "item_1",
                quantity: 2,
                totalPrice: "120.00",
                unitPrice: "60.00",
                externalProduct: {
                  id: "ext_prod_1",
                  linkedProductId: "product_1",
                  externalProductId: "MLB123:VAR1",
                  linkedProduct: {
                    id: "product_1",
                    name: "Produto Pai",
                  },
                  metadata: {
                    itemId: "MLB123",
                    variationId: "VAR1",
                },
                provider: "mercadolivre",
                sku: "SKU-1",
                title: "Cor: Azul",
              },
              },
              {
                id: "item_2",
                quantity: 1,
                totalPrice: "80.00",
                unitPrice: "80.00",
                externalProduct: {
                  id: "ext_prod_2",
                  linkedProductId: null,
                  externalProductId: "EXT-2",
                  linkedProduct: null,
                  metadata: {},
                  provider: "shopee",
                  sku: "SKU-2",
                  title: "Produto 2",
                },
              },
            ],
            fees: [
              {
                amount: "20.00",
                feeType: "shipping_cost",
                id: "fee_ship",
                metadata: {},
              },
              {
                amount: "3.00",
                feeType: "fixed_fee",
                id: "fee_fixed",
                metadata: {},
              },
            ],
          }),
        },
      },
    };

    const service = new OrdersService(db as never);

    await expect(
      service.getOrderDetails(
        {
          organizationId: "org_123",
          selectedCompanyId: "company_123",
          userId: "user_123",
        },
        "order_row_1",
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        composition: {
          hasIncompleteCostData: true,
          marketplaceCommissionAmount: "0.00",
          missingCostItemsCount: 1,
          missingLinkedItemsCount: 1,
          netRevenueAmount: "177.00",
          packagingCostAmount: "8.00",
          productCostAmount: "43.00",
          refundBonusAmount: "0.00",
          revenueAmount: "200.00",
          shippingOrFixedFeeAmount: "23.00",
          taxAmount: "24.00",
          taxRateDefault: "0.120000",
        },
        items: expect.arrayContaining([
          expect.objectContaining({
            channel: "shopee",
            contributionMarginPercent: "46.00",
            displayName: "Cor: Azul | Produto Pai",
            imageUrl: "https://cdn.example.com/product-1-cover.jpg",
            netRevenueAmount: "106.20",
            orderedAt: "2026-06-20T10:15:00.000Z",
            productName: "Cor: Azul",
            quantity: 2,
            sku: "SKU-1",
            totalProfitAmount: "55.20",
            totalPrice: "120.00",
            unitPrice: "60.00",
          }),
          expect.objectContaining({
            channel: "shopee",
            contributionMarginPercent: null,
            netRevenueAmount: "70.80",
            totalProfitAmount: null,
          }),
        ]),
        order: expect.objectContaining({
          contributionMarginPercent: null,
          sourceStatus: "completed",
          tariffAmount: "0.00",
          orderId: "SHP-1001",
          provider: "shopee",
          status: "paid",
          statusLabel: "Pagamento aprovado",
          totalProfitAmount: null,
        }),
      }),
    );
  });

  it("rates fees proportionally across multiple items in order details", async () => {
    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.120000",
          }),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "product_1",
              financeDefaults: {
                packagingCost: "5.00",
              },
              images: [],
              name: "Produto A",
              productCosts: [
                {
                  amount: "50.00",
                  createdAt: new Date("2026-06-01T00:00:00.000Z"),
                  effectiveFrom: new Date("2026-06-01T00:00:00.000Z"),
                },
              ],
            },
            {
              id: "product_2",
              financeDefaults: {
                packagingCost: "1.00",
              },
              images: [],
              name: "Produto B",
              productCosts: [
                {
                  amount: "10.00",
                  createdAt: new Date("2026-06-01T00:00:00.000Z"),
                  effectiveFrom: new Date("2026-06-01T00:00:00.000Z"),
                },
              ],
            },
          ]),
        },
        externalOrders: {
          findFirst: vi.fn().mockResolvedValue({
            id: "order_row_2",
            companyId: "company_123",
            createdAt: new Date("2026-06-20T12:00:00.000Z"),
            currency: "BRL",
            externalOrderId: "MLB-2001",
            metadata: {},
            orderedAt: new Date("2026-06-20T10:15:00.000Z"),
            organizationId: "org_123",
            provider: "mercadolivre",
            status: "paid",
            syncRunId: null,
            updatedAt: new Date("2026-06-20T12:00:00.000Z"),
            totalAmount: "200.00",
            items: [
              {
                id: "item_1",
                quantity: 1,
                totalPrice: "150.00",
                unitPrice: "150.00",
                externalProduct: {
                  id: "ext_prod_1",
                  linkedProductId: "product_1",
                  externalProductId: "MLB-A",
                  linkedProduct: {
                    id: "product_1",
                    name: "Produto A",
                  },
                  metadata: {},
                  provider: "mercadolivre",
                  sku: "SKU-A",
                  title: "Produto A",
                },
              },
              {
                id: "item_2",
                quantity: 1,
                totalPrice: "50.00",
                unitPrice: "50.00",
                externalProduct: {
                  id: "ext_prod_2",
                  linkedProductId: "product_2",
                  externalProductId: "MLB-B",
                  linkedProduct: {
                    id: "product_2",
                    name: "Produto B",
                  },
                  metadata: {},
                  provider: "mercadolivre",
                  sku: "SKU-B",
                  title: "Produto B",
                },
              },
            ],
            fees: [
              {
                amount: "20.00",
                feeType: "shipping_cost",
                id: "fee_ship",
                metadata: {},
              },
              {
                amount: "10.00",
                feeType: "fixed_fee",
                id: "fee_fixed",
                metadata: {},
              },
              {
                amount: "40.00",
                feeType: "marketplace_commission",
                id: "fee_commission",
                metadata: {},
              },
            ],
          }),
        },
      },
    };

    const service = new OrdersService(db as never);

    await expect(
      service.getOrderDetails(
        {
          organizationId: "org_123",
          selectedCompanyId: "company_123",
          userId: "user_123",
        },
        "order_row_2",
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            contributionMarginPercent: "28.33",
            netRevenueAmount: "97.50",
            totalProfitAmount: "42.50",
          }),
          expect.objectContaining({
            contributionMarginPercent: "43.00",
            netRevenueAmount: "32.50",
            totalProfitAmount: "21.50",
          }),
        ],
      }),
    );
  });

  it("adds refund bonus to order composition and proportional item net revenue", async () => {
    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.120000",
          }),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "product_1",
              financeDefaults: {
                packagingCost: "5.00",
              },
              images: [],
              name: "Produto A",
              productCosts: [
                {
                  amount: "50.00",
                  createdAt: new Date("2026-06-01T00:00:00.000Z"),
                  effectiveFrom: new Date("2026-06-01T00:00:00.000Z"),
                },
              ],
            },
            {
              id: "product_2",
              financeDefaults: {
                packagingCost: "1.00",
              },
              images: [],
              name: "Produto B",
              productCosts: [
                {
                  amount: "10.00",
                  createdAt: new Date("2026-06-01T00:00:00.000Z"),
                  effectiveFrom: new Date("2026-06-01T00:00:00.000Z"),
                },
              ],
            },
          ]),
        },
        externalOrders: {
          findFirst: vi.fn().mockResolvedValue({
            id: "order_row_2",
            companyId: "company_123",
            createdAt: new Date("2026-06-20T12:00:00.000Z"),
            currency: "BRL",
            externalOrderId: "MLB-2001",
            metadata: {},
            orderedAt: new Date("2026-06-20T10:15:00.000Z"),
            organizationId: "org_123",
            provider: "mercadolivre",
            status: "paid",
            syncRunId: null,
            updatedAt: new Date("2026-06-20T12:00:00.000Z"),
            totalAmount: "200.00",
            items: [
              {
                id: "item_1",
                quantity: 1,
                totalPrice: "150.00",
                unitPrice: "150.00",
                externalProduct: {
                  id: "ext_prod_1",
                  linkedProductId: "product_1",
                  externalProductId: "MLB-A",
                  linkedProduct: {
                    id: "product_1",
                    name: "Produto A",
                  },
                  metadata: {},
                  provider: "mercadolivre",
                  sku: "SKU-A",
                  title: "Produto A",
                },
              },
              {
                id: "item_2",
                quantity: 1,
                totalPrice: "50.00",
                unitPrice: "50.00",
                externalProduct: {
                  id: "ext_prod_2",
                  linkedProductId: "product_2",
                  externalProductId: "MLB-B",
                  linkedProduct: {
                    id: "product_2",
                    name: "Produto B",
                  },
                  metadata: {},
                  provider: "mercadolivre",
                  sku: "SKU-B",
                  title: "Produto B",
                },
              },
            ],
            fees: [
              {
                amount: "20.00",
                feeType: "shipping_cost",
                id: "fee_ship",
                metadata: {},
              },
              {
                amount: "10.00",
                feeType: "fixed_fee",
                id: "fee_fixed",
                metadata: {},
              },
              {
                amount: "40.00",
                feeType: "marketplace_commission",
                id: "fee_commission",
                metadata: {},
              },
              {
                amount: "4.00",
                feeType: "refund_bonus",
                id: "fee_refund_bonus",
                metadata: {},
              },
            ],
          }),
        },
      },
    };

    const service = new OrdersService(db as never);

    await expect(
      service.getOrderDetails(
        {
          organizationId: "org_123",
          selectedCompanyId: "company_123",
          userId: "user_123",
        },
        "order_row_2",
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        composition: expect.objectContaining({
          netRevenueAmount: "134.00",
          refundBonusAmount: "4.00",
        }),
        items: [
          expect.objectContaining({
            contributionMarginPercent: "30.33",
            netRevenueAmount: "100.50",
            totalProfitAmount: "45.50",
          }),
          expect.objectContaining({
            contributionMarginPercent: "45.00",
            netRevenueAmount: "33.50",
            totalProfitAmount: "22.50",
          }),
        ],
      }),
    );
  });

  it("formats negative contribution margin percent as valid decimal string", async () => {
    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.120000",
          }),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "product_1",
              financeDefaults: {
                packagingCost: "2.50",
              },
              images: [],
              name: "Cor: Transparente",
              productCosts: [
                {
                  amount: "20.00",
                  createdAt: new Date("2026-06-01T00:00:00.000Z"),
                  effectiveFrom: new Date("2026-06-01T00:00:00.000Z"),
                },
              ],
            },
          ]),
        },
        externalOrders: {
          findFirst: vi.fn().mockResolvedValue({
            id: "order_row_neg",
            companyId: "company_123",
            createdAt: new Date("2026-06-24T04:00:31.954Z"),
            currency: "BRL",
            externalOrderId: "2000017026965252",
            metadata: {},
            orderedAt: new Date("2026-06-20T02:55:39.000Z"),
            organizationId: "org_123",
            provider: "mercadolivre",
            status: "paid",
            syncRunId: null,
            updatedAt: new Date("2026-06-24T04:00:31.954Z"),
            totalAmount: "29.90",
            items: [
              {
                id: "item_neg",
                quantity: 1,
                totalPrice: "29.90",
                unitPrice: "29.90",
                externalProduct: {
                  externalProductId: "MLBNEG:VAR1",
                  id: "ext_prod_neg",
                  linkedProductId: "product_1",
                  linkedProduct: {
                    id: "product_1",
                    name: "Cor: Transparente",
                  },
                  metadata: {
                    itemId: "MLBNEG",
                    variationId: "VAR1",
                  },
                  provider: "mercadolivre",
                  sku: "ACESSORIO-TRANSPARENTE",
                  title: "Acessório De Unha - Não Ofertar",
                },
              },
            ],
            fees: [
              {
                amount: "3.89",
                feeType: "marketplace_commission",
                id: "fee_commission",
                metadata: {},
              },
              {
                amount: "6.65",
                feeType: "fixed_fee",
                id: "fee_fixed",
                metadata: {},
              },
            ],
          }),
        },
      },
    };

    const service = new OrdersService(db as never);

    await expect(
      service.getOrderDetails(
        {
          organizationId: "org_123",
          selectedCompanyId: "company_123",
          userId: "user_123",
        },
        "order_row_neg",
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            displayName: "Acessório De Unha - Não Ofertar | Cor: Transparente",
            contributionMarginPercent: "-10.50",
            netRevenueAmount: "19.36",
            totalProfitAmount: "-3.14",
          }),
        ],
      }),
    );
  });

  it("maps MELI statuses canonically and preserves raw status", async () => {
    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.100000",
          }),
        },
        externalOrders: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "order_row_1",
              companyId: "company_123",
              createdAt: new Date("2026-06-20T12:00:00.000Z"),
              currency: "BRL",
              externalOrderId: "MLB-1002",
              metadata: {},
              orderedAt: new Date("2026-06-20T10:15:00.000Z"),
              organizationId: "org_123",
              provider: "mercadolivre",
              status: "payment_in_process",
              syncRunId: null,
              updatedAt: new Date("2026-06-20T12:00:00.000Z"),
              totalAmount: "200.00",
              items: [],
              fees: [],
            },
          ]),
        },
      },
    };

    const service = new OrdersService(db as never);
    const result = await service.listOrders(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      {},
    );

    expect(result.items[0]).toEqual(
      expect.objectContaining({
        sourceStatus: "payment_in_process",
        status: "payment_in_process",
        statusLabel: "Pagamento em processamento",
      }),
    );
  });

  it("filters orders by inclusive ordered date range before pagination", async () => {
    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.100000",
          }),
        },
        externalOrders: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "order_row_1",
              companyId: "company_123",
              createdAt: new Date("2026-06-20T12:00:00.000Z"),
              currency: "BRL",
              externalOrderId: "MLB-1001",
              metadata: {},
              orderedAt: new Date("2026-06-20T10:15:00.000Z"),
              organizationId: "org_123",
              provider: "mercadolivre",
              status: "paid",
              syncRunId: null,
              updatedAt: new Date("2026-06-20T12:00:00.000Z"),
              totalAmount: "200.00",
              items: [],
              fees: [],
            },
            {
              id: "order_row_2",
              companyId: "company_123",
              createdAt: new Date("2026-07-02T12:00:00.000Z"),
              currency: "BRL",
              externalOrderId: "MLB-1002",
              metadata: {},
              orderedAt: new Date("2026-07-02T10:15:00.000Z"),
              organizationId: "org_123",
              provider: "mercadolivre",
              status: "paid",
              syncRunId: null,
              updatedAt: new Date("2026-07-02T12:00:00.000Z"),
              totalAmount: "150.00",
              items: [],
              fees: [],
            },
          ]),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      },
    };

    const service = new OrdersService(db as never);
    const result = await service.listOrders(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      {
        orderedFrom: "2026-06-01",
        orderedTo: "2026-06-30",
        page: 1,
        pageSize: 10,
      },
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.orderId).toBe("MLB-1001");
    expect(result.totalItems).toBe(1);
  });

  it("derives order-level profit and contribution margin from aggregated composition", async () => {
    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.120000",
          }),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([
            {
              financeDefaults: {
                packagingCost: "4.00",
              },
              id: "product_1",
              images: [],
              name: "Produto 1",
              productCosts: [
                {
                  amount: "21.50",
                  createdAt: new Date("2026-06-01T00:00:00.000Z"),
                  effectiveFrom: new Date("2026-06-01T00:00:00.000Z"),
                },
              ],
            },
          ]),
        },
        externalOrders: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "order_row_1",
              companyId: "company_123",
              createdAt: new Date("2026-06-20T12:00:00.000Z"),
              currency: "BRL",
              externalOrderId: "MLB-1001",
              metadata: {},
              orderedAt: new Date("2026-06-20T10:15:00.000Z"),
              organizationId: "org_123",
              provider: "mercadolivre",
              status: "paid",
              syncRunId: null,
              updatedAt: new Date("2026-06-20T12:00:00.000Z"),
              totalAmount: "200.00",
              items: [
                {
                  id: "item_1",
                  quantity: 2,
                  totalPrice: "120.00",
                  unitPrice: "60.00",
                  externalProduct: {
                    id: "ext_prod_1",
                    linkedProductId: "product_1",
                    sku: "SKU-1",
                    title: "Produto 1",
                  },
                },
              ],
              fees: [
                {
                  amount: "20.00",
                  feeType: "shipping_cost",
                  id: "fee_ship",
                  metadata: {},
                },
                {
                  amount: "3.00",
                  feeType: "fixed_fee",
                  id: "fee_fixed",
                  metadata: {},
                },
                {
                  amount: "10.00",
                  feeType: "marketplace_commission",
                  id: "fee_commission",
                  metadata: {},
                },
              ],
            },
          ]),
        },
      },
    };

    const service = new OrdersService(db as never);
    const result = await service.listOrders(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      {
        page: 1,
        pageSize: 10,
      },
    );

    expect(result.items[0]).toEqual(
      expect.objectContaining({
        contributionMarginPercent: "46.00",
        totalProfitAmount: "92.00",
      }),
    );
  });

  it("returns second page of orders instead of repeating first page", async () => {
    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.100000",
          }),
        },
        externalOrders: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "order_row_1",
              companyId: "company_123",
              createdAt: new Date("2026-06-20T12:00:00.000Z"),
              currency: "BRL",
              externalOrderId: "MLB-1001",
              metadata: {},
              orderedAt: new Date("2026-06-20T10:15:00.000Z"),
              organizationId: "org_123",
              provider: "mercadolivre",
              status: "paid",
              syncRunId: null,
              updatedAt: new Date("2026-06-20T12:00:00.000Z"),
              totalAmount: "200.00",
              items: [],
              fees: [],
            },
            {
              id: "order_row_2",
              companyId: "company_123",
              createdAt: new Date("2026-06-21T12:00:00.000Z"),
              currency: "BRL",
              externalOrderId: "MLB-1002",
              metadata: {},
              orderedAt: new Date("2026-06-21T10:15:00.000Z"),
              organizationId: "org_123",
              provider: "mercadolivre",
              status: "paid",
              syncRunId: null,
              updatedAt: new Date("2026-06-21T12:00:00.000Z"),
              totalAmount: "150.00",
              items: [],
              fees: [],
            },
          ]),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      },
    };

    const service = new OrdersService(db as never);
    const result = await service.listOrders(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      {
        page: 2,
        pageSize: 1,
      },
    );

    expect(result.page).toBe(2);
    expect(result.totalPages).toBe(2);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.orderId).toBe("MLB-1001");
  });

  it("aggregates unique order skus on list rows", async () => {
    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.120000",
          }),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        externalOrders: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "order_row_1",
              companyId: "company_123",
              createdAt: new Date("2026-06-20T12:00:00.000Z"),
              currency: "BRL",
              externalOrderId: "MLB-1001",
              metadata: {},
              orderedAt: new Date("2026-06-20T10:15:00.000Z"),
              organizationId: "org_123",
              provider: "mercadolivre",
              status: "paid",
              syncRunId: null,
              updatedAt: new Date("2026-06-20T12:00:00.000Z"),
              totalAmount: "200.00",
              items: [
                {
                  id: "item_1",
                  quantity: 1,
                  totalPrice: "120.00",
                  unitPrice: "120.00",
                  externalProduct: {
                    id: "ext_prod_1",
                    linkedProductId: null,
                    sku: "SKU-1",
                    title: "Produto 1",
                  },
                },
                {
                  id: "item_2",
                  quantity: 1,
                  totalPrice: "80.00",
                  unitPrice: "80.00",
                  externalProduct: {
                    id: "ext_prod_2",
                    linkedProductId: null,
                    sku: "SKU-1",
                    title: "Produto 2",
                  },
                },
                {
                  id: "item_3",
                  quantity: 1,
                  totalPrice: "40.00",
                  unitPrice: "40.00",
                  externalProduct: {
                    id: "ext_prod_3",
                    linkedProductId: null,
                    sku: "SKU-2",
                    title: "Produto 3",
                  },
                },
              ],
              fees: [],
            },
          ]),
        },
      },
    };

    const service = new OrdersService(db as never);
    const result = await service.listOrders(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      {},
    );

    expect(result.items[0]?.skus).toEqual(["SKU-1", "SKU-2"]);
  });

  it("exports filtered orders as xlsx rows and restricts export to selected ids", async () => {
    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.120000",
          }),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        externalOrders: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "order_row_1",
              companyId: "company_123",
              createdAt: new Date("2026-06-20T12:00:00.000Z"),
              currency: "BRL",
              externalOrderId: "MLB-1001",
              metadata: { operationId: "MLB-SALE-9001" },
              orderedAt: new Date("2026-06-20T10:15:00.000Z"),
              organizationId: "org_123",
              provider: "mercadolivre",
              status: "paid",
              syncRunId: null,
              updatedAt: new Date("2026-06-20T12:00:00.000Z"),
              totalAmount: "200.00",
              items: [
                {
                  id: "item_1",
                  quantity: 1,
                  totalPrice: "120.00",
                  unitPrice: "120.00",
                  externalProduct: {
                    id: "ext_prod_1",
                    linkedProductId: null,
                    sku: "SKU-1",
                    title: "Produto 1",
                  },
                },
              ],
              fees: [],
            },
            {
              id: "order_row_2",
              companyId: "company_123",
              createdAt: new Date("2026-06-21T12:00:00.000Z"),
              currency: "BRL",
              externalOrderId: "SHP-1002",
              metadata: {},
              orderedAt: new Date("2026-06-21T10:15:00.000Z"),
              organizationId: "org_123",
              provider: "shopee",
              status: "paid",
              syncRunId: null,
              updatedAt: new Date("2026-06-21T12:00:00.000Z"),
              totalAmount: "80.00",
              items: [
                {
                  id: "item_2",
                  quantity: 1,
                  totalPrice: "80.00",
                  unitPrice: "80.00",
                  externalProduct: {
                    id: "ext_prod_2",
                    linkedProductId: null,
                    sku: "SKU-9",
                    title: "Produto 9",
                  },
                },
              ],
              fees: [],
            },
          ]),
        },
      },
    };

    const service = new OrdersService(db as never);
    const fileBuffer = await service.exportOrdersSpreadsheet(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      {
        ids: ["order_row_1"],
        provider: "mercadolivre",
        search: "MLB",
      },
    );

    const workbook = read(fileBuffer, { type: "buffer" });
    const rows = utils.sheet_to_json<Record<string, unknown>>(
      workbook.Sheets[workbook.SheetNames[0]!],
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.["ID do Pedido"]).toBe("MLB-SALE-9001");
    expect(rows[0]?.["SKUs"]).toBe("SKU-1");
  });
});
