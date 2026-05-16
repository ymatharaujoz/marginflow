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
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/marginflow",
      GOOGLE_CLIENT_ID: "google-client-id",
      GOOGLE_CLIENT_SECRET: "google-client-secret",
      MERCADOLIVRE_CLIENT_ID: "ml-client-id",
      MERCADOLIVRE_CLIENT_SECRET: "ml-client-secret",
      MERCADOLIVRE_REDIRECT_URI: "http://localhost:4000/integrations/mercadolivre/callback",
      NODE_ENV: "test",
      STRIPE_PRICE_ANNUAL: "price_annual",
      STRIPE_PRICE_MONTHLY: "price_monthly",
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

  it("exchanges the code and reads the account profile", async () => {
    const provider = new MercadoLivreProvider({
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
      MERCADOLIVRE_REDIRECT_URI: "http://localhost:4000/integrations/mercadolivre/callback",
      NODE_ENV: "test",
      STRIPE_PRICE_ANNUAL: "price_annual",
      STRIPE_PRICE_MONTHLY: "price_monthly",
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

  it("normalizes commission, fixed fee, and shipping cost during sync", async () => {
    const provider = new MercadoLivreProvider({
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
      MERCADOLIVRE_REDIRECT_URI: "http://localhost:4000/integrations/mercadolivre/callback",
      NODE_ENV: "test",
      STRIPE_PRICE_ANNUAL: "price_annual",
      STRIPE_PRICE_MONTHLY: "price_monthly",
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
      expect.objectContaining({ amount: "12.00", feeType: "marketplace_commission" }),
      expect.objectContaining({ amount: "3.00", feeType: "fixed_fee" }),
      expect.objectContaining({ amount: "9.00", feeType: "shipping_cost" }),
    ]);
  });
});
