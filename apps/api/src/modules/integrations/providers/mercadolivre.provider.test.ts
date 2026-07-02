import { afterEach, describe, expect, it, vi } from "vitest";
import { MercadoLivreProvider } from "./mercadolivre.provider";

function createProvider() {
  return new MercadoLivreProvider({
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
}

function createSyncConnection() {
  return {
    accessToken: "token_123",
    companyId: "company_1",
    createdAt: new Date("2026-05-14T10:00:00.000Z"),
    externalAccountId: "123456",
    id: "conn_1",
    lastSyncedAt: null,
    metadata: {},
    organizationId: "org_1",
    provider: "mercadolivre" as const,
    refreshToken: null,
    status: "connected" as const,
    tokenExpiresAt: new Date("2030-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-05-14T10:00:00.000Z"),
  };
}

function createJsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    headers: { "content-type": "application/json" },
    status,
  });
}

describe("MercadoLivreProvider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds the documented authorization URL", async () => {
    const provider = new MercadoLivreProvider({
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

    const response = await provider.createAuthorization({
      organizationId: "org_123",
      state: "signed-state",
    });
    const url = new URL(response.authorizationUrl);

    expect(url.origin).toBe("https://auth.mercadolivre.com.br");
    expect(url.pathname).toBe("/authorization");
    expect(url.searchParams.get("client_id")).toBe("ml-client-id");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "http://localhost:4000/integrations/mercadolivre/callback",
    );
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("state")).toBe("signed-state");
  });

  it("adds PKCE challenge parameters when Mercado Livre PKCE mode is enabled", async () => {
    const provider = new MercadoLivreProvider({
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
      MERCADOLIVRE_USE_PKCE: true,
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

    const response = await provider.createAuthorization({
      codeVerifier: "plain-code-verifier",
      organizationId: "org_123",
      state: "signed-state",
    });
    const url = new URL(response.authorizationUrl);

    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("code_challenge")).toBeTruthy();
  });

  it("exchanges the code and reads the account profile", async () => {
    const provider = new MercadoLivreProvider({
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

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: "token_123",
            expires_in: 21600,
            refresh_token: "refresh_123",
            scope: "offline_access read write",
            token_type: "bearer",
            user_id: 123456,
          }),
          {
            headers: {
              "content-type": "application/json",
            },
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            email: "seller@example.com",
            id: 123456,
            nickname: "SELLER123",
            site_id: "MLB",
          }),
          {
            headers: {
              "content-type": "application/json",
            },
            status: 200,
          },
        ),
      );

    vi.stubGlobal("fetch", fetchMock);

    await expect(provider.exchangeCode("auth-code")).resolves.toEqual(
      expect.objectContaining({
        accessToken: "token_123",
        connectedAccountId: "123456",
        connectedAccountLabel: "SELLER123",
        refreshToken: "refresh_123",
      }),
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("sends code_verifier during token exchange when PKCE mode is enabled", async () => {
    const provider = new MercadoLivreProvider({
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
      MERCADOLIVRE_USE_PKCE: true,
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

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: "token_123",
            expires_in: 21600,
            refresh_token: "refresh_123",
            scope: "offline_access read write",
            token_type: "bearer",
            user_id: 123456,
          }),
          {
            headers: {
              "content-type": "application/json",
            },
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            email: "seller@example.com",
            id: 123456,
            nickname: "SELLER123",
            site_id: "MLB",
          }),
          {
            headers: {
              "content-type": "application/json",
            },
            status: 200,
          },
        ),
      );

    vi.stubGlobal("fetch", fetchMock);

    await provider.exchangeCode("auth-code", {
      codeVerifier: "plain-code-verifier",
    });

    const [, tokenRequest] = fetchMock.mock.calls[0] ?? [];
    expect(tokenRequest?.body).toBeInstanceOf(URLSearchParams);
    expect((tokenRequest?.body as URLSearchParams).get("code_verifier")).toBe(
      "plain-code-verifier",
    );
  });

  it("normalizes commission, fixed fee, and shipping cost during sync", async () => {
    const provider = new MercadoLivreProvider({
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

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            paging: { limit: 50, offset: 0, total: 1 },
            results: [
              {
                currency_id: "BRL",
                date_closed: "2026-05-14T10:00:00.000-03:00",
                id: 123,
                order_items: [
                  {
                    item: {
                      id: "MLB123",
                      seller_sku: "SKU-1",
                      title: "Produto",
                    },
                    quantity: 3,
                    sale_fee: 10.54,
                    variation_id: 456,
                    unit_price: 29.9,
                  },
                ],
                payments: [
                  {
                    fee_amount: 3,
                    shipping_cost: 7,
                  },
                ],
                shipping: {
                  id: 999,
                },
                total_amount: 89.7,
              },
            ],
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
            senders: [{ cost: 9, user_id: 123456 }],
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          details: [],
        }),
      );

    vi.stubGlobal("fetch", fetchMock);

    const result = await provider.syncOrders({
      connection: {
        accessToken: "token_123",
        companyId: "company_1",
        createdAt: new Date("2026-05-14T10:00:00.000Z"),
        externalAccountId: "123456",
        id: "conn_1",
        lastSyncedAt: null,
        metadata: {},
        organizationId: "org_1",
        provider: "mercadolivre",
        refreshToken: null,
        status: "connected",
        tokenExpiresAt: new Date("2030-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-05-14T10:00:00.000Z"),
      },
      cursor: null,
      organizationId: "org_1",
    });

    expect(result.orders[0]?.fees).toEqual([
      expect.objectContaining({
        amount: "31.62",
        feeType: "marketplace_commission",
      }),
      expect.objectContaining({ amount: "3.00", feeType: "fixed_fee" }),
      expect.objectContaining({ amount: "9.00", feeType: "shipping_cost" }),
    ]);
    expect(result.orders[0]?.items).toEqual([
      expect.objectContaining({
        externalProductId: "MLB123:456",
        quantity: 3,
        sku: "SKU-1",
        variationId: "456",
      }),
    ]);
  });

  it("enriches missing order item sku from MELI item details before falling back to ML id", async () => {
    const provider = createProvider();
    const fetchMock = vi.fn().mockImplementation((input: string | URL) => {
      const url = String(input);

      if (url.includes("/orders/search")) {
        if (url.includes("offset=50")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                paging: { limit: 50, offset: 50, total: 1 },
                results: [],
              }),
              {
                headers: { "content-type": "application/json" },
                status: 200,
              },
            ),
          );
        }

        return Promise.resolve(
          new Response(
            JSON.stringify({
              paging: { limit: 50, offset: 0, total: 1 },
              results: [
                {
                  currency_id: "BRL",
                  date_closed: "2026-05-14T10:00:00.000-03:00",
                  id: 123,
                  order_items: [
                    {
                      item: {
                        id: "MLB123",
                        seller_sku: null,
                        title: "Produto",
                      },
                      quantity: 1,
                      sale_fee: 10.54,
                      variation_id: 456,
                      unit_price: 29.9,
                    },
                  ],
                  payments: [
                    {
                      fee_amount: 3,
                      shipping_cost: 7,
                    },
                  ],
                  shipping: {
                    id: 999,
                  },
                  total_amount: 29.9,
                },
              ],
            }),
            {
              headers: { "content-type": "application/json" },
              status: 200,
            },
          ),
        );
      }

      if (url.includes("/shipments/999/costs")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              senders: [{ cost: 9, user_id: 123456 }],
            }),
            {
              headers: { "content-type": "application/json" },
              status: 200,
            },
          ),
        );
      }

      if (url.startsWith("https://api.mercadolibre.com/items?ids=MLB123")) {
        return Promise.resolve(
          new Response(
            JSON.stringify([
              {
                code: 200,
                body: {
                  attributes: [],
                  id: "MLB123",
                  seller_custom_field: "LEGACY-123",
                  seller_sku: "CALCAPRETA39",
                  title: "Produto",
                  variations: [
                    {
                      attributes: [],
                      id: 456,
                      seller_custom_field: "LEGACY-456",
                      seller_sku: "CALCAPRETA39",
                    },
                  ],
                },
              },
            ]),
            {
              headers: { "content-type": "application/json" },
              status: 200,
            },
            ),
          );
        }

      if (url.includes("/billing/integration/periods/key/2026-05-01/group/MP/details")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              limit: 1000,
              offset: 0,
              results: [],
              total: 0,
            }),
            {
              headers: { "content-type": "application/json" },
              status: 200,
            },
          ),
        );
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await provider.syncOrders({
      connection: {
        accessToken: "token_123",
        companyId: "company_1",
        createdAt: new Date("2026-05-14T10:00:00.000Z"),
        externalAccountId: "123456",
        id: "conn_1",
        lastSyncedAt: null,
        metadata: {},
        organizationId: "org_1",
        provider: "mercadolivre",
        refreshToken: null,
        status: "connected",
        tokenExpiresAt: new Date("2030-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-05-14T10:00:00.000Z"),
      },
      cursor: null,
      organizationId: "org_1",
    });

    expect(result.orders[0]?.items).toEqual([
      expect.objectContaining({
        externalProductId: "MLB123:456",
        sku: "CALCAPRETA39",
      }),
    ]);
    expect(result.products).toEqual([
      expect.objectContaining({
        externalProductId: "MLB123:456",
        sku: "CALCAPRETA39",
      }),
    ]);
  });

  it("falls back to payment shipping_cost when shipment seller cost is unavailable", async () => {
    const provider = new MercadoLivreProvider({
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

    const fetchShipmentSellerCostSpy = vi
      .spyOn(provider as any, "fetchShipmentSellerCost")
      .mockResolvedValue(null);

    const shippingCost = await (provider as any).resolveShippingCost(
      {
        payments: [{ shipping_cost: 7 }],
        shipping: { id: 999 },
      },
      {
        accessToken: "token_123",
        sellerAccountId: "123456",
      },
    );

    expect(fetchShipmentSellerCostSpy).toHaveBeenCalledOnce();
    expect(shippingCost).toBe(7);
  });

  it("falls back to order.shipping_cost when shipment and payment shipping data are unavailable", async () => {
    const provider = new MercadoLivreProvider({
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

    const fetchShipmentSellerCostSpy = vi
      .spyOn(provider as any, "fetchShipmentSellerCost")
      .mockResolvedValue(null);

    const shippingCost = await (provider as any).resolveShippingCost(
      {
        payments: [],
        shipping_cost: 5,
      },
      {
        accessToken: "token_123",
        sellerAccountId: "123456",
      },
    );

    expect(fetchShipmentSellerCostSpy).not.toHaveBeenCalled();
    expect(shippingCost).toBe(5);
  });

  it("uses billing provisions to persist fixed fee when the payment payload omits fee_amount", async () => {
    const provider = new MercadoLivreProvider({
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

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            paging: { limit: 50, offset: 0, total: 1 },
            results: [
              {
                currency_id: "BRL",
                date_closed: "2026-05-14T10:00:00.000-03:00",
                id: 123,
                order_items: [
                  {
                    item: {
                      id: "MLB123",
                      seller_sku: "SKU-1",
                      title: "Produto",
                    },
                    quantity: 1,
                    sale_fee: 12,
                    variation_id: 456,
                    unit_price: 100,
                  },
                ],
                payments: [],
                total_amount: 100,
              },
            ],
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
            currency_id: "BRL",
            date_closed: "2026-05-14T10:00:00.000-03:00",
            id: 123,
            order_items: [
              {
                item: {
                  id: "MLB123",
                  seller_sku: "SKU-1",
                  title: "Produto",
                },
                quantity: 1,
                sale_fee: 12,
                variation_id: 456,
                unit_price: 100,
              },
            ],
            payments: [],
            total_amount: 100,
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
            offset: 0,
            results: [
              {
                order_id: 123,
                sale_fee: {
                  gross: 31.62,
                  net: 11.67,
                  rebate: 19.95,
                  discount: 0,
                  discount_reason: null,
                },
                fixed_fee: 19.95,
              },
            ],
            total: 1,
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          details: [{ amount: 19.95 }],
        }),
      );

    vi.stubGlobal("fetch", fetchMock);

    const result = await provider.syncOrders({
      connection: {
        accessToken: "token_123",
        companyId: "company_1",
        createdAt: new Date("2026-05-14T10:00:00.000Z"),
        externalAccountId: "123456",
        id: "conn_1",
        lastSyncedAt: null,
        metadata: {},
        organizationId: "org_1",
        provider: "mercadolivre",
        refreshToken: null,
        status: "connected",
        tokenExpiresAt: new Date("2030-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-05-14T10:00:00.000Z"),
      },
      cursor: null,
      organizationId: "org_1",
    });

    expect(result.orders[0]?.fees).toEqual([
      expect.objectContaining({
        amount: "12.00",
        feeType: "marketplace_commission",
      }),
      expect.objectContaining({ amount: "19.95", feeType: "fixed_fee" }),
    ]);
    expect(result.orders[0]?.metadata).toMatchObject({
      refundBonusAmount: "19.95",
    });
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(String(fetchMock.mock.calls[2]?.[0])).toContain(
      "/billing/integration/periods/key/2026-05-01/group/MP/details",
    );
    expect(String(fetchMock.mock.calls[3]?.[0])).toContain("/discounts");
    expect(
      (fetchMock.mock.calls[2]?.[1] as RequestInit | undefined)?.headers,
    ).toEqual(
      expect.objectContaining({
        "x-version": "2",
      }),
    );
  });

  it("adds refund bonus when initial MELI fees already have commission, fixed fee, and shipping", async () => {
    const provider = new MercadoLivreProvider({
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

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            paging: { limit: 50, offset: 0, total: 1 },
            results: [
              {
                currency_id: "BRL",
                date_closed: "2026-05-14T10:00:00.000-03:00",
                id: 123,
                order_items: [
                  {
                    item: {
                      id: "MLB123",
                      seller_sku: "SKU-1",
                      title: "Produto",
                    },
                    quantity: 1,
                    unit_price: 100,
                    variation_id: 456,
                  },
                ],
                payments: [
                  {
                    fee_amount: 19.95,
                    marketplace_fee: 12,
                    shipping_cost: 14.5,
                  },
                ],
                total_amount: 100,
              },
            ],
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
            offset: 0,
            results: [
              {
                order_id: 123,
                sale_fee: {
                  discount: 0,
                  discount_reason: null,
                  gross: 31.95,
                  net: 12,
                  rebate: 5.54,
                },
                fixed_fee: 19.95,
              },
            ],
            total: 1,
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          details: [{ amount: 3.5 }, { amount: 2.04 }],
        }),
      );

    vi.stubGlobal("fetch", fetchMock);

    const result = await provider.syncOrders({
      connection: {
        accessToken: "token_123",
        companyId: "company_1",
        createdAt: new Date("2026-05-14T10:00:00.000Z"),
        externalAccountId: "123456",
        id: "conn_1",
        lastSyncedAt: null,
        metadata: {},
        organizationId: "org_1",
        provider: "mercadolivre",
        refreshToken: null,
        status: "connected",
        tokenExpiresAt: new Date("2030-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-05-14T10:00:00.000Z"),
      },
      cursor: null,
      organizationId: "org_1",
    });

    expect(result.orders[0]?.fees).toEqual([
      expect.objectContaining({
        amount: "12.00",
        feeType: "marketplace_commission",
      }),
      expect.objectContaining({
        amount: "19.95",
        feeType: "fixed_fee",
      }),
      expect.objectContaining({
        amount: "14.50",
        feeType: "shipping_cost",
      }),
    ]);
    expect(result.orders[0]?.metadata).toMatchObject({
      refundBonusAmount: "5.54",
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain(
      "/billing/integration/periods/key/2026-05-01/group/MP/details",
    );
    expect(String(fetchMock.mock.calls[2]?.[0])).toContain("/discounts");
  });

  it("splits MELI gross sale_fee into commission net and fixed fee when billing details match the order fee", async () => {
    const provider = new MercadoLivreProvider({
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

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            paging: { limit: 50, offset: 0, total: 1 },
            results: [
              {
                currency_id: "BRL",
                date_closed: "2026-05-14T10:00:00.000-03:00",
                id: 123,
                order_items: [
                  {
                    item: {
                      id: "MLB123",
                      seller_sku: "ML-MLB4797573777-19683084422",
                      title: "Produto",
                    },
                    quantity: 1,
                    sale_fee: 10.54,
                    variation_id: 456,
                    unit_price: 29.9,
                  },
                ],
                payments: [],
                total_amount: 29.9,
              },
            ],
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
            currency_id: "BRL",
            date_closed: "2026-05-14T10:00:00.000-03:00",
            id: 123,
            order_items: [
              {
                item: {
                  id: "MLB123",
                  seller_sku: "ML-MLB4797573777-19683084422",
                  title: "Produto",
                },
                quantity: 1,
                sale_fee: 10.54,
                variation_id: 456,
                unit_price: 29.9,
              },
            ],
            payments: [],
            total_amount: 29.9,
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
            offset: 0,
            results: [
              {
                order_id: 123,
                sale_fee: {
                  gross: 10.54,
                  net: 3.89,
                  rebate: 6.65,
                  discount: 0,
                  discount_reason: null,
                },
                fixed_fee: 6.65,
              },
            ],
            total: 1,
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          details: [{ amount: 6.65 }],
        }),
      );

    vi.stubGlobal("fetch", fetchMock);

    const result = await provider.syncOrders({
      connection: {
        accessToken: "token_123",
        companyId: "company_1",
        createdAt: new Date("2026-05-14T10:00:00.000Z"),
        externalAccountId: "123456",
        id: "conn_1",
        lastSyncedAt: null,
        metadata: {},
        organizationId: "org_1",
        provider: "mercadolivre",
        refreshToken: null,
        status: "connected",
        tokenExpiresAt: new Date("2030-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-05-14T10:00:00.000Z"),
      },
      cursor: null,
      organizationId: "org_1",
    });

    expect(result.orders[0]?.fees).toEqual([
      expect.objectContaining({
        amount: "3.89",
        feeType: "marketplace_commission",
      }),
      expect.objectContaining({
        amount: "6.65",
        feeType: "fixed_fee",
      }),
    ]);
    expect(result.orders[0]?.metadata).toMatchObject({
      refundBonusAmount: "6.65",
    });
  });

  it("splits payment.marketplace_fee into commission net and fixed fee when billing details expose the breakdown", async () => {
    const provider = new MercadoLivreProvider({
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

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            paging: { limit: 50, offset: 0, total: 1 },
            results: [
              {
                currency_id: "BRL",
                date_closed: "2026-05-14T10:00:00.000-03:00",
                id: 123,
                order_items: [
                  {
                    item: {
                      id: "MLB123",
                      seller_sku: "ML-MLB4797573777-19683084422",
                      title: "Produto",
                    },
                    quantity: 1,
                    variation_id: 456,
                    unit_price: 29.9,
                  },
                ],
                payments: [
                  {
                    marketplace_fee: 10.54,
                  },
                ],
                total_amount: 29.9,
              },
            ],
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
            currency_id: "BRL",
            date_closed: "2026-05-14T10:00:00.000-03:00",
            id: 123,
            order_items: [
              {
                item: {
                  id: "MLB123",
                  seller_sku: "ML-MLB4797573777-19683084422",
                  title: "Produto",
                },
                quantity: 1,
                variation_id: 456,
                unit_price: 29.9,
              },
            ],
            payments: [
              {
                marketplace_fee: 10.54,
              },
            ],
            total_amount: 29.9,
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
            offset: 0,
            results: [
              {
                order_id: 123,
                sale_fee: {
                  gross: 10.54,
                  net: 3.89,
                  rebate: 6.65,
                  discount: 0,
                  discount_reason: null,
                },
                fixed_fee: 6.65,
              },
            ],
            total: 1,
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          details: [{ amount: 6.65 }],
        }),
      );

    vi.stubGlobal("fetch", fetchMock);

    const result = await provider.syncOrders({
      connection: {
        accessToken: "token_123",
        companyId: "company_1",
        createdAt: new Date("2026-05-14T10:00:00.000Z"),
        externalAccountId: "123456",
        id: "conn_1",
        lastSyncedAt: null,
        metadata: {},
        organizationId: "org_1",
        provider: "mercadolivre",
        refreshToken: null,
        status: "connected",
        tokenExpiresAt: new Date("2030-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-05-14T10:00:00.000Z"),
      },
      cursor: null,
      organizationId: "org_1",
    });

    expect(result.orders[0]?.fees).toEqual([
      expect.objectContaining({
        amount: "3.89",
        feeType: "marketplace_commission",
      }),
      expect.objectContaining({
        amount: "6.65",
        feeType: "fixed_fee",
      }),
    ]);
    expect(result.orders[0]?.metadata).toMatchObject({
      refundBonusAmount: "6.65",
    });
  });

  it("falls back to listing_prices when MELI billing details omit fee breakdown", async () => {
    const provider = new MercadoLivreProvider({
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

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            paging: { limit: 50, offset: 0, total: 1 },
            results: [
              {
                currency_id: "BRL",
                date_closed: "2026-06-19T22:55:39.000-04:00",
                id: 2000017026965252,
                order_items: [
                  {
                    item: {
                      id: "MLB4797573777",
                      seller_sku: "ACESSORIO-TRANSPARENTE",
                      title: "Cor: Transparente",
                      variation_id: 196830844222,
                    },
                    quantity: 1,
                    sale_fee: 10.54,
                    unit_price: 29.9,
                    variation_id: 196830844222,
                  },
                ],
                payments: [
                  {
                    marketplace_fee: 0,
                    shipping_cost: 0,
                  },
                ],
                total_amount: 29.9,
              },
            ],
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
            currency_id: "BRL",
            date_closed: "2026-06-19T22:55:39.000-04:00",
            id: 2000017026965252,
            order_items: [
              {
                item: {
                  category_id: "MLB5092",
                  id: "MLB4797573777",
                  seller_sku: "ACESSORIO-TRANSPARENTE",
                  title: "Cor: Transparente",
                  variation_id: 196830844222,
                },
                listing_type_id: "gold_special",
                quantity: 1,
                sale_fee: 10.54,
                unit_price: 29.9,
                variation_id: 196830844222,
              },
            ],
            payments: [
              {
                marketplace_fee: 0,
                shipping_cost: 0,
              },
            ],
            total_amount: 29.9,
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          details: [{ amount: 3.5 }, { amount: 1.25 }],
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            currency_id: "BRL",
            listing_type_id: "gold_special",
            sale_fee_amount: 3.89,
            sale_fee_details: {
              fixed_fee: 0,
              gross_amount: 3.89,
              percentage_fee: 13,
            },
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
            paging: { limit: 50, offset: 50, total: 1 },
            results: [],
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      );

    vi.stubGlobal("fetch", fetchMock);

    const result = await provider.syncOrders({
      connection: {
        accessToken: "token_123",
        companyId: "company_1",
        createdAt: new Date("2026-06-19T22:55:39.000Z"),
        externalAccountId: "3404634502",
        id: "conn_1",
        lastSyncedAt: null,
        metadata: {},
        organizationId: "org_1",
        provider: "mercadolivre",
        refreshToken: null,
        status: "connected",
        tokenExpiresAt: new Date("2030-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-06-19T22:55:39.000Z"),
      },
      cursor: null,
      organizationId: "org_1",
    });

    expect(result.orders[0]?.fees).toEqual([
      expect.objectContaining({
        amount: "3.89",
        feeType: "marketplace_commission",
        metadata: expect.objectContaining({
          source: "listing_prices.sale_fee_amount",
        }),
      }),
      expect.objectContaining({
        amount: "6.65",
        feeType: "fixed_fee",
        metadata: expect.objectContaining({
          source: "listing_prices.fixed_fee_fallback",
        }),
      }),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(String(fetchMock.mock.calls[2]?.[0])).toContain(
      "/billing/integration/periods/key/2026-06-01/group/MP/details",
    );
    expect(String(fetchMock.mock.calls[3]?.[0])).toContain(
      "/sites/MLB/listing_prices",
    );
    expect(String(fetchMock.mock.calls[4]?.[0])).toContain("/discounts");
  });

  it("preserves shipment shipping cost after hydrating order details", async () => {
    const provider = new MercadoLivreProvider({
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

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            paging: { limit: 50, offset: 0, total: 1 },
            results: [
              {
                currency_id: "BRL",
                date_closed: "2026-06-23T23:31:20.000-04:00",
                id: 2000017085667456,
                order_items: [
                  {
                    item: {
                      id: "MLB4808187161",
                      seller_sku: null,
                      title:
                        "Caneca Cerâmica 12 Unidades Sublimação 325ml Branca Livesub Branco 092000",
                    },
                    quantity: 1,
                    sale_fee: 27,
                    unit_price: 200,
                  },
                ],
                payments: [{ marketplace_fee: 0, shipping_cost: 0 }],
                shipping: { id: 47369588880 },
                total_amount: 200,
              },
            ],
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              body: {
                attributes: [],
                id: "MLB4808187161",
                seller_custom_field: null,
                seller_sku: null,
                title:
                  "Caneca CerÃ¢mica 12 Unidades SublimaÃ§Ã£o 325ml Branca Livesub Branco 092000",
                variations: [],
              },
              code: 200,
            },
          ]),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            gross_amount: 84.1,
            receiver: { cost: 0 },
            senders: [{ cost: 24.65, user_id: 123456 }],
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
            currency_id: "BRL",
            date_closed: "2026-06-23T23:31:20.000-04:00",
            id: 2000017085667456,
            order_items: [
              {
                item: {
                  category_id: "MLB9206",
                  id: "MLB4808187161",
                  seller_sku: null,
                  title:
                    "Caneca Cerâmica 12 Unidades Sublimação 325ml Branca Livesub Branco 092000",
                },
                listing_type_id: "gold_pro",
                quantity: 1,
                sale_fee: 27,
                unit_price: 200,
              },
            ],
            payments: [{ marketplace_fee: 0, shipping_cost: 0 }],
            shipping: { id: 47369588880 },
            total_amount: 200,
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          details: [{ amount: 3.5 }, { amount: 1.25 }],
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            currency_id: "BRL",
            listing_type_id: "gold_pro",
            sale_fee_amount: 27,
            sale_fee_details: {
              fixed_fee: 0,
              gross_amount: 27,
              percentage_fee: 13.5,
            },
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
            paging: { limit: 50, offset: 50, total: 1 },
            results: [],
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      );

    vi.stubGlobal("fetch", fetchMock);

    const result = await provider.syncOrders({
      connection: {
        accessToken: "token_123",
        companyId: "company_1",
        createdAt: new Date("2026-06-23T23:31:20.000Z"),
        externalAccountId: "123456",
        id: "conn_1",
        lastSyncedAt: null,
        metadata: {},
        organizationId: "org_1",
        provider: "mercadolivre",
        refreshToken: null,
        status: "connected",
        tokenExpiresAt: new Date("2030-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-06-23T23:31:20.000Z"),
      },
      cursor: null,
      organizationId: "org_1",
    });

    expect(result.orders[0]?.fees).toEqual([
      expect.objectContaining({
        amount: "27.00",
        feeType: "marketplace_commission",
      }),
      expect.objectContaining({
        amount: "24.65",
        feeType: "shipping_cost",
      }),
    ]);
  });

  it("fetches all manual sync pages and filters sales by closing date within range", async () => {
    const provider = createProvider();
    const totalOrders = 251;
    const pageSize = 50;
    const fetchMock = vi.fn();
    const searchResponses = new Map<number, unknown>();

    for (let offset = 0; offset < totalOrders; offset += pageSize) {
      const pageOrders = Array.from(
        { length: Math.min(pageSize, totalOrders - offset) },
        (_, index) => {
          const orderNumber = offset + index + 1;

          return {
            currency_id: "BRL",
            date_closed: `2026-05-${String((orderNumber % 20) + 1).padStart(2, "0")}T10:00:00.000Z`,
            date_created: "2026-04-28T10:00:00.000Z",
            id: orderNumber,
            order_items: [
              {
                item: {
                  id: `MLB${orderNumber}`,
                  seller_sku: `SKU-${orderNumber}`,
                  title: `Produto ${orderNumber}`,
                },
                quantity: 1,
                sale_fee: 10,
                unit_price: 100,
              },
            ],
            payments: [{ fee_amount: 3, shipping_cost: 5 }],
            total_amount: 100,
          };
        },
      );

      searchResponses.set(offset, {
        paging: { limit: pageSize, offset, total: totalOrders },
        results: pageOrders,
      });
    }

    fetchMock.mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes("/orders/search")) {
        const offset = Number(new URL(url).searchParams.get("offset") ?? "0");
        const payload =
          searchResponses.get(offset) ??
          ({
            paging: { limit: pageSize, offset, total: totalOrders },
            results: [],
          } satisfies {
            paging: { limit: number; offset: number; total: number };
            results: unknown[];
          });

        return createJsonResponse(payload);
      }

      if (url.includes("/billing/integration/periods/")) {
        return createJsonResponse({
          limit: 1000,
          offset: 0,
          results: [],
          total: 0,
        });
      }

      if (url.includes("/discounts")) {
        return createJsonResponse({ details: [] });
      }

      throw new Error(`Unexpected fetch call in test: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await provider.syncOrders({
      connection: createSyncConnection(),
      mode: "manual_range",
      organizationId: "org_1",
      range: {
        endAt: "2026-05-20T23:59:59.999Z",
        startAt: "2026-05-01T00:00:00.000Z",
      },
    });

    const firstRequestUrl = fetchMock.mock.calls[0]?.[0].toString() ?? "";
    const requestUrls = fetchMock.mock.calls.map((call) => call[0].toString());

    expect(firstRequestUrl).toContain(
      "order.date_created.to=2026-05-20T23%3A59%3A59.999Z",
    );
    expect(firstRequestUrl).not.toContain("order.date_created.from=");
    expect(fetchMock).toHaveBeenCalledTimes(258);
    expect(
      fetchMock.mock.calls.filter((call) =>
        String(call[0]).includes("/orders/search"),
      ),
    ).toHaveLength(6);
    expect(
      fetchMock.mock.calls.filter((call) =>
        String(call[0]).includes("/billing/integration/periods/"),
      ),
    ).toHaveLength(1);
    expect(
      fetchMock.mock.calls.filter((call) => String(call[0]).includes("/discounts")),
    ).toHaveLength(totalOrders);
    expect(result.orders).toHaveLength(totalOrders);
    expect(result.orders[0]?.externalOrderId).toBe("1");
    expect(result.orders.at(-1)?.externalOrderId).toBe("251");
    expect(result.cursor).toBeNull();
  });

  it("includes manual sync orders created before range when they close within range", async () => {
    const provider = createProvider();

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            paging: { limit: 50, offset: 0, total: 2 },
            results: [
              {
                currency_id: "BRL",
                date_closed: "2026-05-15T10:00:00.000Z",
                date_created: "2026-05-01T10:00:00.000Z",
                id: 123,
                order_items: [
                  {
                    item: {
                      id: "MLB123",
                      seller_sku: "SKU-1",
                      title: "Produto 1",
                    },
                    quantity: 1,
                    sale_fee: 10,
                    unit_price: 100,
                  },
                ],
                payments: [{ fee_amount: 3, shipping_cost: 5 }],
                total_amount: 100,
              },
              {
                currency_id: "BRL",
                date_closed: "2026-05-25T10:00:00.000Z",
                date_created: "2026-05-25T10:00:00.000Z",
                id: 124,
                order_items: [
                  {
                    item: {
                      id: "MLB124",
                      seller_sku: "SKU-2",
                      title: "Produto 2",
                    },
                    quantity: 1,
                    sale_fee: 12,
                    unit_price: 200,
                  },
                ],
                payments: [{ fee_amount: 4, shipping_cost: 6 }],
                total_amount: 200,
              },
            ],
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
            paging: { limit: 50, offset: 50, total: 2 },
            results: [],
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      );

    vi.stubGlobal("fetch", fetchMock);

    const result = await provider.syncOrders({
      connection: createSyncConnection(),
      mode: "manual_range",
      organizationId: "org_1",
      range: {
        endAt: "2026-05-20T23:59:59.999Z",
        startAt: "2026-05-10T00:00:00.000Z",
      },
    });

    expect(fetchMock.mock.calls[0]?.[0].toString()).toContain(
      "order.date_created.to=2026-05-20T23%3A59%3A59.999Z",
    );
    expect(result.orders).toHaveLength(1);
    expect(result.orders[0]?.externalOrderId).toBe("123");
    expect(result.cursor).toBeNull();
  });

  it("excludes manual sync orders that close after the selected range", async () => {
    const provider = createProvider();

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            paging: { limit: 50, offset: 0, total: 1 },
            results: [
              {
                currency_id: "BRL",
                date_closed: "2026-05-21T00:00:00.000Z",
                date_created: "2026-05-18T10:00:00.000Z",
                id: 125,
                order_items: [
                  {
                    item: {
                      id: "MLB125",
                      seller_sku: "SKU-125",
                      title: "Produto 125",
                    },
                    quantity: 1,
                    sale_fee: 10,
                    unit_price: 100,
                  },
                ],
                payments: [{ fee_amount: 3, shipping_cost: 5 }],
                total_amount: 100,
              },
            ],
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          details: [{ amount: 3.5 }, { amount: 1.25 }],
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            limit: 1000,
            offset: 0,
            results: [],
            total: 0,
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
            offset: 0,
            results: [],
            total: 0,
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          limit: 1000,
          offset: 0,
          results: [],
          total: 0,
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          details: [],
        }),
      );

    vi.stubGlobal("fetch", fetchMock);

    const result = await provider.syncOrders({
      connection: createSyncConnection(),
      mode: "manual_range",
      organizationId: "org_1",
      range: {
        endAt: "2026-05-20T23:59:59.999Z",
        startAt: "2026-05-10T00:00:00.000Z",
      },
    });

    expect(result.orders).toEqual([]);
    expect(result.products).toEqual([]);
    expect(result.cursor).toBeNull();
  });

  it("fetches only the notified order during automatic sync without cursor history", async () => {
    const provider = createProvider();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            currency_id: "BRL",
            date_closed: "2026-05-15T10:00:00.000Z",
            date_created: "2026-05-15T09:00:00.000Z",
            id: 123,
            order_items: [
              {
                item: {
                  id: "MLB123",
                  seller_sku: "SKU-1",
                  title: "Produto 1",
                },
                quantity: 1,
                sale_fee: 10,
                unit_price: 100,
              },
            ],
            payments: [{ fee_amount: 3, shipping_cost: 5 }],
            total_amount: 100,
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          details: [{ amount: 3.5 }, { amount: 1.25 }],
        }),
      );

    vi.stubGlobal("fetch", fetchMock);

    const result = await provider.syncOrders({
      connection: createSyncConnection(),
      cursor: null,
      notification: {
        notificationId: "123",
        resource: "/orders/123",
        topic: "orders_v2",
      },
      organizationId: "org_1",
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/orders/123");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain(
      "/billing/integration/periods/",
    );
    expect(String(fetchMock.mock.calls[2]?.[0])).toContain("/discounts");
    expect(result.orders).toHaveLength(1);
    expect(result.orders[0]?.externalOrderId).toBe("123");
    expect(result.cursor).toEqual({
      orderedAfter: "2026-05-15T10:00:00.000Z",
    });
  });

  it("hydrates order details when the search response omits fee fields", async () => {
    const provider = new MercadoLivreProvider({
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

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            paging: { limit: 50, offset: 0, total: 1 },
            results: [
              {
                currency_id: "BRL",
                date_closed: "2026-05-14T10:00:00.000-03:00",
                id: 123,
                order_items: [
                  {
                    item: {
                      id: "MLB123",
                      seller_sku: "SKU-1",
                      title: "Produto",
                    },
                    quantity: 3,
                    unit_price: 100,
                    variation_id: 456,
                  },
                ],
                payments: [],
                total_amount: 300,
              },
            ],
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
            currency_id: "BRL",
            id: 123,
            order_items: [
              {
                item: {
                  id: "MLB123",
                  seller_sku: "SKU-1",
                  title: "Produto",
                },
                quantity: 3,
                sale_fee: 12,
                variation_id: 456,
                unit_price: 100,
              },
            ],
            payments: [
              {
                fee_amount: 3,
                marketplace_fee: 12,
                shipping_cost: 7,
              },
            ],
            total_amount: 300,
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
            offset: 0,
            results: [],
            total: 0,
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      );

    vi.stubGlobal("fetch", fetchMock);

    const result = await provider.syncOrders({
      connection: {
        accessToken: "token_123",
        companyId: "company_1",
        createdAt: new Date("2026-05-14T10:00:00.000Z"),
        externalAccountId: "123456",
        id: "conn_1",
        lastSyncedAt: null,
        metadata: {},
        organizationId: "org_1",
        provider: "mercadolivre",
        refreshToken: null,
        status: "connected",
        tokenExpiresAt: new Date("2030-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-05-14T10:00:00.000Z"),
      },
      cursor: null,
      organizationId: "org_1",
    });

    expect(result.orders[0]?.fees).toEqual([
      expect.objectContaining({
        amount: "12.00",
        feeType: "marketplace_commission",
      }),
      expect.objectContaining({ amount: "3.00", feeType: "fixed_fee" }),
      expect.objectContaining({ amount: "7.00", feeType: "shipping_cost" }),
    ]);
    expect(result.orders[0]?.items).toEqual([
      expect.objectContaining({
        externalProductId: "MLB123:456",
        quantity: 3,
        variationId: "456",
      }),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("/orders/123");
    expect(String(fetchMock.mock.calls[2]?.[0])).toContain(
      "/billing/integration/periods/",
    );
    expect(String(fetchMock.mock.calls[3]?.[0])).toContain("/discounts");
  });

  it("persists Mercado Livre pack_id and operation_id even when search fees are already complete", async () => {
    const provider = createProvider();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            paging: { limit: 50, offset: 0, total: 1 },
            results: [
              {
                currency_id: "BRL",
                date_closed: "2026-06-24T10:00:00.000-03:00",
                date_created: "2026-06-24T09:30:00.000-03:00",
                id: 2000017085667456,
                order_items: [
                  {
                    item: {
                      id: "MLB123",
                      seller_sku: "SKU-1",
                      title: "Produto",
                    },
                    quantity: 1,
                    sale_fee: 20.64,
                    unit_price: 100,
                  },
                ],
                payments: [
                  {
                    fee_amount: 5.76,
                    marketplace_fee: 20.64,
                    shipping_cost: 0.6,
                  },
                ],
                total_amount: 100,
              },
            ],
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
            offset: 0,
            results: [
              {
                operation_id: 2000013674359901,
                order_id: 2000017085667456,
                sale_fee: {
                  fee_amount: 20.64,
                  gross: 20.64,
                  net: 20.64,
                },
              },
            ],
            total: 1,
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          details: [{ amount: 3.5 }, { amount: 1.25 }],
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            limit: 1000,
            offset: 0,
            results: [],
            total: 0,
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
            offset: 0,
            results: [],
            total: 0,
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      );

    vi.stubGlobal("fetch", fetchMock);

    const result = await provider.syncOrders({
      connection: createSyncConnection(),
      cursor: null,
      organizationId: "org_1",
    });

    expect(result.orders[0]?.externalOrderId).toBe("2000017085667456");
    expect(result.orders[0]?.metadata).toMatchObject({
      operationId: "2000013674359901",
      refundBonusAmount: "4.75",
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain(
      "/billing/integration/periods/",
    );
    expect(String(fetchMock.mock.calls[2]?.[0])).toContain("/discounts");
  });

  it("falls back to zero refund bonus when order discounts request fails", async () => {
    const provider = createProvider();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            paging: { limit: 50, offset: 0, total: 1 },
            results: [
              {
                currency_id: "BRL",
                date_closed: "2026-06-24T10:00:00.000-03:00",
                date_created: "2026-06-24T09:30:00.000-03:00",
                id: 2000017085667456,
                order_items: [
                  {
                    item: {
                      id: "MLB123",
                      seller_sku: "SKU-1",
                      title: "Produto",
                    },
                    quantity: 1,
                    sale_fee: 20.64,
                    unit_price: 100,
                  },
                ],
                payments: [
                  {
                    fee_amount: 5.76,
                    marketplace_fee: 20.64,
                    shipping_cost: 0.6,
                  },
                ],
                total_amount: 100,
              },
            ],
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response("provider unavailable", {
          headers: { "content-type": "text/plain" },
          status: 500,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            limit: 1000,
            offset: 0,
            results: [
              {
                operation_id: 2000013674359901,
                order_id: 2000017085667456,
                sale_fee: {
                  fee_amount: 20.64,
                  gross: 20.64,
                  net: 20.64,
                },
              },
            ],
            total: 1,
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          limit: 1000,
          offset: 0,
          results: [],
          total: 0,
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          details: [],
        }),
      );

    vi.stubGlobal("fetch", fetchMock);

    const result = await provider.syncOrders({
      connection: createSyncConnection(),
      cursor: null,
      organizationId: "org_1",
    });

    expect(result.orders[0]?.metadata).toMatchObject({
      refundBonusAmount: "0.00",
    });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("persists Mercado Livre operation_id when billing details require pagination", async () => {
    const provider = createProvider();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            paging: { limit: 50, offset: 0, total: 1 },
            results: [
              {
                currency_id: "BRL",
                date_closed: "2026-06-24T10:00:00.000-03:00",
                date_created: "2026-06-24T09:30:00.000-03:00",
                id: 2000017085667456,
                pack_id: 2000013607301987,
                order_items: [
                  {
                    item: {
                      id: "MLB123",
                      seller_sku: "SKU-1",
                      title: "Produto",
                    },
                    quantity: 1,
                    sale_fee: 20.64,
                    unit_price: 100,
                  },
                ],
                payments: [
                  {
                    fee_amount: 5.76,
                    marketplace_fee: 20.64,
                    shipping_cost: 0.6,
                  },
                ],
                total_amount: 100,
              },
            ],
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
                sale_fee: {
                  fee_amount: 20.64,
                  gross: 20.64,
                  net: 20.64,
                },
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
        createJsonResponse({
          limit: 1000,
          offset: 0,
          results: [],
          total: 0,
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          details: [],
        }),
      );

    vi.stubGlobal("fetch", fetchMock);

    const result = await provider.syncOrders({
      connection: createSyncConnection(),
      cursor: null,
      organizationId: "org_1",
    });

    expect(result.orders[0]?.metadata).toMatchObject({
      operationId: "2000013674359901",
      packId: "2000013607301987",
    });
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(String(fetchMock.mock.calls[2]?.[0])).toContain("from_id=cursor-1");
    expect(String(fetchMock.mock.calls[3]?.[0])).toContain("from_id=cursor-2");
    expect(String(fetchMock.mock.calls[4]?.[0])).toContain("/discounts");
  });

  it("prefers billing row with operation_id when the same order_id appears multiple times", async () => {
    const provider = createProvider();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            paging: { limit: 50, offset: 0, total: 1 },
            results: [
              {
                currency_id: "BRL",
                date_closed: "2026-06-24T10:00:00.000-03:00",
                date_created: "2026-06-24T09:30:00.000-03:00",
                id: 2000017085667456,
                order_items: [
                  {
                    item: {
                      id: "MLB123",
                      seller_sku: "SKU-1",
                      title: "Produto",
                    },
                    quantity: 1,
                    sale_fee: 20.64,
                    unit_price: 100,
                  },
                ],
                payments: [
                  {
                    fee_amount: 5.76,
                    marketplace_fee: 20.64,
                    shipping_cost: 0.6,
                  },
                ],
                total_amount: 100,
              },
            ],
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
            offset: 0,
            results: [
              {
                order_id: 2000017085667456,
                sale_fee: {
                  fee_amount: 20.64,
                  gross: 20.64,
                  net: 20.64,
                },
              },
              {
                operation_id: 2000013674359901,
                order_id: 2000017085667456,
                sale_fee: {
                  fee_amount: 20.64,
                  gross: 20.64,
                  net: 20.64,
                },
              },
            ],
            total: 2,
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          details: [{ amount: 6.65 }],
        }),
      );

    vi.stubGlobal("fetch", fetchMock);

    const result = await provider.syncOrders({
      connection: createSyncConnection(),
      cursor: null,
      organizationId: "org_1",
    });

    expect(result.orders[0]?.metadata).toMatchObject({
      operationId: "2000013674359901",
    });
  });

  it("normalizes variation ids nested inside the item payload during sync", async () => {
    const provider = new MercadoLivreProvider({
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

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            paging: { limit: 50, offset: 0, total: 1 },
            results: [
              {
                currency_id: "BRL",
                date_closed: "2026-05-14T10:00:00.000-03:00",
                id: 123,
                order_items: [
                  {
                    item: {
                      id: "MLB123",
                      seller_sku: "SKU-1",
                      title: "Produto",
                      variation_id: 789,
                    },
                    quantity: 1,
                    unit_price: 100,
                  },
                ],
                payments: [],
                shipping: {
                  id: 999,
                },
                total_amount: 100,
              },
            ],
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
            senders: [{ cost: 0, user_id: 123456 }],
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
            id: 999,
            order_cost: 0,
            shipping_option: {
              cost: 0,
            },
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
            currency_id: "BRL",
            id: 123,
            order_items: [
              {
                item: {
                  id: "MLB123",
                  seller_sku: "SKU-1",
                  title: "Produto",
                  variation_id: 789,
                },
                quantity: 1,
                unit_price: 100,
              },
            ],
            payments: [],
            shipping: {
              id: 999,
            },
            total_amount: 100,
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
            offset: 0,
            results: [],
            total: 0,
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          details: [{ amount: 6.65 }],
        }),
      );

    vi.stubGlobal("fetch", fetchMock);

    const result = await provider.syncOrders({
      connection: {
        accessToken: "token_123",
        companyId: "company_1",
        createdAt: new Date("2026-05-14T10:00:00.000Z"),
        externalAccountId: "123456",
        id: "conn_1",
        lastSyncedAt: null,
        metadata: {},
        organizationId: "org_1",
        provider: "mercadolivre",
        refreshToken: null,
        status: "connected",
        tokenExpiresAt: new Date("2030-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-05-14T10:00:00.000Z"),
      },
      cursor: null,
      organizationId: "org_1",
    });

    expect(result.orders[0]?.items).toEqual([
      expect.objectContaining({
        externalProductId: "MLB123:789",
        variationId: "789",
      }),
    ]);
  });

  it("imports active and paused listings, expanding variations with stable SKUs and pictures", async () => {
    const provider = new MercadoLivreProvider({
      API_PUBLIC_BASE_URL: "http://localhost:4000",
      AUTH_SESSION_SECRET: "secret",
      BETTER_AUTH_SECRET: "secret",
      BETTER_AUTH_URL: "http://localhost:4000",
      MERCADOLIVRE_CLIENT_ID: "client-id",
      MERCADOLIVRE_CLIENT_SECRET: "client-secret",
      MERCADOLIVRE_REDIRECT_URI:
        "http://localhost:4000/integrations/mercadolivre/callback",
      MERCADOLIVRE_USE_PKCE: false,
      NODE_ENV: "test",
      WEB_APP_ORIGIN: "http://localhost:3000",
    } as never);

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            results: ["MLB1"],
            scroll_id: "active-next",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            results: [],
            scroll_id: "active-next",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            results: ["MLB2", "MLB3"],
            scroll_id: "paused-next",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            results: [],
            scroll_id: "paused-next",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              code: 200,
              body: {
                id: "MLB1",
                title: "Camiseta",
                price: 59.9,
                status: "active",
                seller_custom_field: "CAMISETA-LEGACY",
                attributes: [
                  {
                    id: "SELLER_SKU",
                    value_name: "SKU-001",
                  },
                ],
                pictures: [
                  {
                    id: "PIC-RED",
                    secure_url: "https://http2.mlstatic.com/red.jpg",
                  },
                  {
                    id: "PIC-BLUE",
                    secure_url: "https://http2.mlstatic.com/blue.jpg",
                  },
                ],
                variations: [
                  {
                    id: 101,
                    price: 64.9,
                    seller_custom_field: "CAM-RED-M",
                    attributes: [
                      {
                        id: "SELLER_SKU",
                        value_name: "SKU-001-RED-M",
                      },
                    ],
                    picture_ids: ["PIC-RED"],
                    attribute_combinations: [
                      { name: "Cor", value_name: "Vermelho" },
                      { name: "Tamanho", value_name: "M" },
                    ],
                  },
                  {
                    id: 102,
                    price: 69.9,
                    seller_custom_field: null,
                    picture_ids: ["PIC-BLUE"],
                    attribute_combinations: [
                      { name: "Cor", value_name: "Azul" },
                    ],
                  },
                ],
              },
            },
            {
              code: 200,
              body: {
                id: "MLB2",
                title: "Caneca",
                price: 39.9,
                status: "paused",
                seller_custom_field: null,
                attributes: [],
                pictures: [
                  {
                    id: "PIC-MUG",
                    secure_url: "https://http2.mlstatic.com/mug.jpg",
                  },
                ],
                variations: [],
              },
            },
            {
              code: 200,
              body: {
                id: "MLB3",
                title: "Garrafa",
                price: 49.9,
                status: "active",
                seller_custom_field: "GARRAFA-LEGACY",
                attributes: [
                  {
                    id: "SELLER_SKU",
                    value_name: "SKU-MLB3",
                  },
                ],
                pictures: [
                  {
                    id: "PIC-BOTTLE",
                    secure_url: "https://http2.mlstatic.com/bottle.jpg",
                  },
                ],
                variations: [],
              },
            },
          ]),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await provider.importCatalog({
      connection: {
        accessToken: "access-token",
        externalAccountId: "seller-1",
      } as never,
      organizationId: "org-1",
    });

    expect(result).toEqual([
      {
        externalProductId: "MLB1",
        images: [
          "https://http2.mlstatic.com/red.jpg",
          "https://http2.mlstatic.com/blue.jpg",
        ],
        isActive: true,
        metadata: { itemId: "MLB1", variationId: null },
        sellingPrice: "59.90",
        sku: "SKU-001",
        title: "Camiseta",
      },
      {
        externalProductId: "MLB1:101",
        images: ["https://http2.mlstatic.com/red.jpg"],
        isActive: true,
        metadata: { itemId: "MLB1", variationId: "101" },
        sellingPrice: "64.90",
        sku: "SKU-001-RED-M",
        title: "Cor: Vermelho, Tamanho: M",
      },
      {
        externalProductId: "MLB1:102",
        images: ["https://http2.mlstatic.com/blue.jpg"],
        isActive: true,
        metadata: { itemId: "MLB1", variationId: "102" },
        sellingPrice: "69.90",
        sku: "ML-MLB1-102",
        title: "Cor: Azul",
      },
      {
        externalProductId: "MLB2",
        images: ["https://http2.mlstatic.com/mug.jpg"],
        isActive: false,
        metadata: { itemId: "MLB2", variationId: null },
        sellingPrice: "39.90",
        sku: "ML-MLB2",
        title: "Caneca",
      },
      {
        externalProductId: "MLB3",
        images: ["https://http2.mlstatic.com/bottle.jpg"],
        isActive: true,
        metadata: { itemId: "MLB3", variationId: null },
        sellingPrice: "49.90",
        sku: "SKU-MLB3",
        title: "Garrafa",
      },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("status=active");
    expect(String(fetchMock.mock.calls[2]?.[0])).toContain("status=paused");
    expect(String(fetchMock.mock.calls[4]?.[0])).not.toContain("attributes=");
  });

  it("uses variation detail SKU fallbacks after checking SELLER_SKU attributes", async () => {
    const provider = new MercadoLivreProvider({
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
    } as never);

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            results: ["MLB900"],
            scroll_id: "active-next",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            results: [],
            scroll_id: "active-next",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            results: [],
            scroll_id: "paused-next",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              code: 200,
              body: {
                id: "MLB900",
                title: "Tenis Casual",
                price: 199.9,
                seller_custom_field: "TENIS-LEGACY",
                seller_sku: "TENIS-PAI-MANUAL",
                status: "active",
                attributes: [],
                pictures: [
                  {
                    id: "PIC-1",
                    secure_url: "https://http2.mlstatic.com/tenis-1.jpg",
                  },
                ],
                variations: [
                  {
                    id: 11,
                    seller_custom_field: "TENIS-AZUL-LEGACY",
                    seller_sku: null,
                    price: 209.9,
                    picture_ids: ["PIC-1"],
                    attribute_combinations: [
                      { name: "Cor", value_name: "Azul" },
                      { name: "Tamanho", value_name: "39" },
                    ],
                  },
                  {
                    id: 12,
                    seller_custom_field: "TENIS-PRETO-LEGACY",
                    seller_sku: null,
                    price: 219.9,
                    picture_ids: ["PIC-1"],
                    attribute_combinations: [
                      { name: "Cor", value_name: "Preto" },
                      { name: "Tamanho", value_name: "40" },
                    ],
                  },
                  {
                    id: 13,
                    seller_custom_field: null,
                    seller_sku: null,
                    price: 229.9,
                    picture_ids: ["PIC-1"],
                    attribute_combinations: [
                      { name: "Cor", value_name: "Branco" },
                      { name: "Tamanho", value_name: "41" },
                    ],
                  },
                ],
              },
            },
          ]),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 11,
            price: 209.9,
            picture_ids: ["PIC-1"],
            seller_sku: "TENIS-AZUL-39",
            seller_custom_field: "TENIS-AZUL-LEGACY",
            attribute_combinations: [
              { name: "Cor", value_name: "Azul" },
              { name: "Tamanho", value_name: "39" },
            ],
            attributes: [],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 12,
            price: 219.9,
            picture_ids: ["PIC-1"],
            seller_sku: null,
            seller_custom_field: "TENIS-PRETO-LEGACY",
            attribute_combinations: [
              { name: "Cor", value_name: "Preto" },
              { name: "Tamanho", value_name: "40" },
            ],
            attributes: [],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 13,
            price: 229.9,
            picture_ids: ["PIC-1"],
            seller_sku: null,
            seller_custom_field: null,
            attribute_combinations: [
              { name: "Cor", value_name: "Branco" },
              { name: "Tamanho", value_name: "41" },
            ],
            attributes: [],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await provider.importCatalog({
      connection: {
        accessToken: "access-token",
        externalAccountId: "seller-1",
      } as never,
      organizationId: "org-1",
    });

    expect(result).toEqual([
      expect.objectContaining({
        externalProductId: "MLB900",
        metadata: { itemId: "MLB900", variationId: null },
        sku: "TENIS-PAI-MANUAL",
      }),
      expect.objectContaining({
        externalProductId: "MLB900:11",
        metadata: { itemId: "MLB900", variationId: "11" },
        sku: "TENIS-AZUL-39",
      }),
      expect.objectContaining({
        externalProductId: "MLB900:12",
        metadata: { itemId: "MLB900", variationId: "12" },
        sku: "TENIS-PRETO-LEGACY",
      }),
      expect.objectContaining({
        externalProductId: "MLB900:13",
        metadata: { itemId: "MLB900", variationId: "13" },
        sku: "ML-MLB900-13",
      }),
    ]);
  });

  it("hydrates variation SKU from variation attributes when item payload omits it", async () => {
    const provider = new MercadoLivreProvider({
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
    } as never);

    const fetchMock = vi.fn((input: string | URL) => {
      const url = String(input);

      if (url.includes("/users/seller-1/items/search?") && url.includes("status=active")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              results: ["MLB777"],
              scroll_id: "active-next",
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          ),
        );
      }

      if (url.includes("/users/seller-1/items/search?") && url.includes("scroll_id=active-next")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              results: [],
              scroll_id: "active-next",
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          ),
        );
      }

      if (url.includes("/users/seller-1/items/search?") && url.includes("status=paused")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              results: [],
              scroll_id: "paused-next",
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          ),
        );
      }

      if (url.startsWith("https://api.mercadolibre.com/items?ids=MLB777")) {
        return Promise.resolve(
          new Response(JSON.stringify([
            {
              code: 200,
              body: {
                id: "MLB777",
                title: "Acessorio",
                price: 29.9,
                status: "active",
                seller_sku: null,
                seller_custom_field: null,
                attributes: [],
                pictures: [
                  {
                    id: "PIC-1",
                    secure_url: "https://http2.mlstatic.com/item.jpg",
                  },
                ],
                variations: [
                  {
                    id: 204781877543,
                    price: 29.9,
                    picture_ids: ["PIC-1"],
                    seller_sku: null,
                    seller_custom_field: null,
                    attribute_combinations: [
                      { name: "Cor", value_name: "Amarelo" },
                    ],
                  },
                ],
              },
            },
          ]), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
        );
      }

      if (url === "https://api.mercadolibre.com/items/MLB777/variations/204781877543") {
        return Promise.resolve(
          new Response(JSON.stringify({
            id: 204781877543,
            price: 29.9,
            picture_ids: ["PIC-1"],
            seller_sku: null,
            seller_custom_field: null,
            attribute_combinations: [
              { id: "COLOR", name: "Cor", value_name: "Amarelo" },
            ],
            attributes: [
              {
                id: "SELLER_SKU",
                name: "SKU",
                value_name: "SKU-AMARELADO",
              },
            ],
          }), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
        );
      }

      throw new Error(`Unexpected URL ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await provider.importCatalog({
      connection: {
        accessToken: "access-token",
        externalAccountId: "seller-1",
      } as never,
      organizationId: "org-1",
    });

    expect(result).toEqual([
      {
        externalProductId: "MLB777",
        images: ["https://http2.mlstatic.com/item.jpg"],
        isActive: true,
        metadata: { itemId: "MLB777", variationId: null },
        sellingPrice: "29.90",
        sku: "ML-MLB777",
        title: "Acessorio",
      },
      {
        externalProductId: "MLB777:204781877543",
        images: ["https://http2.mlstatic.com/item.jpg"],
        isActive: true,
        metadata: { itemId: "MLB777", variationId: "204781877543" },
        sellingPrice: "29.90",
        sku: "SKU-AMARELADO",
        title: "Cor: Amarelo",
      },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.mercadolibre.com/items/MLB777/variations/204781877543",
      expect.objectContaining({
        headers: { Authorization: "Bearer access-token" },
      }),
    );
  });

  it("falls back to shipment detail order_cost when shipment costs payload omits senders", async () => {
    const provider = new MercadoLivreProvider({
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

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            paging: { limit: 50, offset: 0, total: 1 },
            results: [
              {
                currency_id: "BRL",
                date_closed: "2026-05-14T10:00:00.000-03:00",
                id: 123,
                order_items: [
                  {
                    item: {
                      id: "MLB123",
                      seller_sku: "SKU-1",
                      title: "Produto",
                    },
                    quantity: 1,
                    sale_fee: 12,
                    variation_id: 456,
                    unit_price: 100,
                  },
                ],
                payments: [
                  {
                    fee_amount: 3,
                  },
                ],
                shipping: {
                  id: 999,
                },
                total_amount: 100,
              },
            ],
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
            message: "shipment costs unavailable",
          }),
          {
            headers: { "content-type": "application/json" },
            status: 500,
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            message: "shipment costs unavailable",
          }),
          {
            headers: { "content-type": "application/json" },
            status: 500,
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            message: "shipment costs unavailable",
          }),
          {
            headers: { "content-type": "application/json" },
            status: 500,
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 999,
            order_cost: 14.5,
            shipping_option: {
              cost: 19.53,
            },
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
            paging: { limit: 50, offset: 50, total: 1 },
            results: [],
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      );

    vi.stubGlobal("fetch", fetchMock);

    const result = await provider.syncOrders({
      connection: {
        accessToken: "token_123",
        companyId: "company_1",
        createdAt: new Date("2026-05-14T10:00:00.000Z"),
        externalAccountId: "123456",
        id: "conn_1",
        lastSyncedAt: null,
        metadata: {},
        organizationId: "org_1",
        provider: "mercadolivre",
        refreshToken: null,
        status: "connected",
        tokenExpiresAt: new Date("2030-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-05-14T10:00:00.000Z"),
      },
      cursor: null,
      organizationId: "org_1",
    });

    expect(result.orders[0]?.fees).toEqual([
      expect.objectContaining({
        amount: "12.00",
        feeType: "marketplace_commission",
      }),
      expect.objectContaining({ amount: "3.00", feeType: "fixed_fee" }),
      expect.objectContaining({ amount: "14.50", feeType: "shipping_cost" }),
    ]);
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain(
      "/shipments/999/costs",
    );
    expect(String(fetchMock.mock.calls[2]?.[0])).toContain("/shipments/999");
  });

  it("retries catalog requests after a transient provider failure", async () => {
    const provider = new MercadoLivreProvider({
      API_PUBLIC_BASE_URL: "http://localhost:4000",
      AUTH_SESSION_SECRET: "secret",
      BETTER_AUTH_SECRET: "secret",
      BETTER_AUTH_URL: "http://localhost:4000",
      MERCADOLIVRE_CLIENT_ID: "client-id",
      MERCADOLIVRE_CLIENT_SECRET: "client-secret",
      MERCADOLIVRE_REDIRECT_URI:
        "http://localhost:4000/integrations/mercadolivre/callback",
      MERCADOLIVRE_USE_PKCE: false,
      NODE_ENV: "test",
      WEB_APP_ORIGIN: "http://localhost:3000",
    } as never);

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("temporarily unavailable", { status: 503 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ results: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ results: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      provider.importCatalog({
        connection: {
          accessToken: "access-token",
          externalAccountId: "seller-1",
        } as never,
        organizationId: "org-1",
      }),
    ).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
