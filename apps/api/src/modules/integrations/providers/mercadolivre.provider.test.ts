import { afterEach, describe, expect, it, vi } from "vitest";
import { MercadoLivreProvider } from "./mercadolivre.provider";

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
      expect.objectContaining({ amount: "19.95", feeType: "fixed_fee" }),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[2]?.[0])).toContain(
      "/billing/integration/periods/key/2026-05-01/group/MP/details",
    );
    expect(
      (fetchMock.mock.calls[2]?.[1] as RequestInit | undefined)?.headers,
    ).toEqual(
      expect.objectContaining({
        "x-version": "2",
      }),
    );
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
        amount: "3.89",
        feeType: "marketplace_commission",
      }),
      expect.objectContaining({
        amount: "6.65",
        feeType: "fixed_fee",
      }),
    ]);
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
        amount: "3.89",
        feeType: "marketplace_commission",
      }),
      expect.objectContaining({
        amount: "6.65",
        feeType: "fixed_fee",
      }),
    ]);
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
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(String(fetchMock.mock.calls[2]?.[0])).toContain(
      "/billing/integration/periods/key/2026-06-01/group/MP/details",
    );
    expect(String(fetchMock.mock.calls[3]?.[0])).toContain(
      "/sites/MLB/listing_prices",
    );
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

  it("limits manual range syncs to the requested end date and returns no incremental cursor", async () => {
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
            paging: { limit: 50, offset: 0, total: 2 },
            results: [
              {
                currency_id: "BRL",
                date_created: "2026-05-15T10:00:00.000Z",
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
      mode: "manual_range",
      organizationId: "org_1",
      range: {
        endAt: "2026-05-20T23:59:59.999Z",
        startAt: "2026-05-10T00:00:00.000Z",
      },
    });

    expect(fetchMock.mock.calls[0]?.[0].toString()).toContain(
      "order.date_created.from=2026-05-10T00%3A00%3A00.000Z",
    );
    expect(result.orders).toHaveLength(1);
    expect(result.orders[0]?.externalOrderId).toBe("123");
    expect(result.cursor).toBeNull();
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
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("/orders/123");
    expect(String(fetchMock.mock.calls[2]?.[0])).toContain(
      "/billing/integration/periods/",
    );
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
    expect(String(fetchMock.mock.calls[4]?.[0])).toContain("attributes=");
    expect(String(fetchMock.mock.calls[4]?.[0])).toContain(
      "seller_custom_field",
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
