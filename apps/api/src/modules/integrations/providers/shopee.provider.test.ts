import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ApiRuntimeEnv } from "@/common/config/api-env";
import { ShopeeProvider } from "./shopee.provider";

function createEnv(): ApiRuntimeEnv {
  return {
    API_DB_POOL_MAX: 5,
    API_HOST: "127.0.0.1",
    API_PORT: 4000,
    BETTER_AUTH_SECRET: "secret",
    DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/lucreii",
    NODE_ENV: "test",
    SHOPEE_PARTNER_ID: 123456,
    SHOPEE_PARTNER_KEY: "partner-key",
    SHOPEE_REDIRECT_URI: "http://localhost:4000/integrations/shopee/callback",
    STRIPE_PRICE_ANNUAL: "price_annual",
    STRIPE_PRICE_MONTHLY: "price_monthly",
    STRIPE_SECRET_KEY: "stripe",
    STRIPE_WEBHOOK_SECRET: "webhook",
    SYNC_RELAX_GUARDS: false,
    WEB_APP_ORIGIN: "http://localhost:3000",
  };
}

function createConnection() {
  return {
    accessToken: "access-token",
    createdAt: new Date("2026-06-12T10:00:00.000Z"),
    externalAccountId: "987654",
    id: "conn_1",
    lastSyncedAt: null,
    metadata: {},
    organizationId: "org_1",
    provider: "shopee",
    refreshToken: "refresh-token",
    status: "connected",
    tokenExpiresAt: new Date("2030-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-06-12T10:00:00.000Z"),
  };
}

describe("ShopeeProvider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("builds the signed Shopee shop authorization URL", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_718_184_000_000);
    const provider = new ShopeeProvider(createEnv());

    const result = await provider.createAuthorization({
      organizationId: "org_1",
      state: "signed-state",
    });
    const url = new URL(result.authorizationUrl);
    const timestamp = "1718184000";
    const expectedSign = createHmac("sha256", "partner-key")
      .update(`123456/api/v2/shop/auth_partner${timestamp}`)
      .digest("hex");

    expect(url.origin).toBe("https://partner.shopeemobile.com");
    expect(url.pathname).toBe("/api/v2/shop/auth_partner");
    expect(url.searchParams.get("partner_id")).toBe("123456");
    expect(url.searchParams.get("timestamp")).toBe(timestamp);
    expect(url.searchParams.get("sign")).toBe(expectedSign);
    expect(url.searchParams.get("redirect")).toContain("state=signed-state");
  });

  it("exchanges authorization code for shop tokens", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_718_184_000_000);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: "access-token",
          expire_in: 14400,
          refresh_token: "refresh-token",
          request_id: "request_1",
        }),
        { headers: { "content-type": "application/json" }, status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const provider = new ShopeeProvider(createEnv());

    await expect(
      provider.exchangeCode("authorization-code", { externalAccountId: "987654" }),
    ).resolves.toEqual(
      expect.objectContaining({
        accessToken: "access-token",
        connectedAccountId: "987654",
        refreshToken: "refresh-token",
      }),
    );
  });

  it("refreshes an expiring shop token", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_718_184_000_000);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            access_token: "new-access-token",
            expire_in: 14400,
            refresh_token: "new-refresh-token",
          }),
          { headers: { "content-type": "application/json" }, status: 200 },
        ),
      ),
    );
    const provider = new ShopeeProvider(createEnv());

    await expect(provider.refreshAccessToken(createConnection() as never)).resolves.toEqual(
      expect.objectContaining({
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
      }),
    );
  });

  it("validates Shopee push authorization using callback URL and raw body", () => {
    const provider = new ShopeeProvider(createEnv());
    const callbackUrl = "http://localhost:4000/integrations/shopee/webhook";
    const rawBody = Buffer.from('{"code":3,"shop_id":987654}');
    const authorization = createHmac("sha256", "partner-key")
      .update(`${callbackUrl}${rawBody.toString("utf8")}`)
      .digest("hex");

    expect(
      provider.verifyWebhookSignature({ authorization, callbackUrl, rawBody }),
    ).toBe(true);
    expect(
      provider.verifyWebhookSignature({
        authorization: "0".repeat(64),
        callbackUrl,
        rawBody,
      }),
    ).toBe(false);
  });

  it("normalizes paid order price, marketplace fees, and seller shipping cost", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_718_184_000_000);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            response: {
              more: false,
              order_list: [{ order_sn: "ORDER-1", order_status: "READY_TO_SHIP" }],
            },
          }),
          { headers: { "content-type": "application/json" }, status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            response: {
              order_list: [
                {
                  create_time: 1718180000,
                  currency: "BRL",
                  item_list: [
                    {
                      item_id: 101,
                      item_name: "Produto Shopee",
                      item_sku: "SKU-1",
                      model_discounted_price: 100,
                      model_quantity_purchased: 2,
                    },
                  ],
                  order_sn: "ORDER-1",
                  order_status: "READY_TO_SHIP",
                  pay_time: 1718180100,
                  total_amount: 200,
                },
              ],
            },
          }),
          { headers: { "content-type": "application/json" }, status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            response: {
              order_income: {
                actual_shipping_fee: 18,
                commission_fee: 20,
                service_fee: 5,
                seller_shipping_discount: 3,
                seller_transaction_fee: 4,
              },
            },
          }),
          { headers: { "content-type": "application/json" }, status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    const provider = new ShopeeProvider(createEnv());

    const result = await provider.syncOrders({
      connection: createConnection() as never,
      cursor: null,
      organizationId: "org_1",
    });

    expect(result.orders[0]).toEqual(
      expect.objectContaining({
        externalOrderId: "ORDER-1",
        totalAmount: "200.00",
      }),
    );
    expect(result.orders[0]?.fees).toEqual([
      expect.objectContaining({ amount: "25.00", feeType: "marketplace_commission" }),
      expect.objectContaining({ amount: "4.00", feeType: "fixed_fee" }),
      expect.objectContaining({ amount: "15.00", feeType: "shipping_cost" }),
    ]);
    expect(result.products[0]).toEqual(
      expect.objectContaining({ externalProductId: "101", sku: "SKU-1" }),
    );
  });
});
