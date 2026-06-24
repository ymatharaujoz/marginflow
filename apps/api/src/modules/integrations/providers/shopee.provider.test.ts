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
      provider.exchangeCode("authorization-code", {
        externalAccountId: "987654",
      }),
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

    await expect(
      provider.refreshAccessToken(createConnection() as never),
    ).resolves.toEqual(
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
              order_list: [
                { order_sn: "ORDER-1", order_status: "READY_TO_SHIP" },
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
      expect.objectContaining({
        amount: "25.00",
        feeType: "marketplace_commission",
      }),
      expect.objectContaining({ amount: "4.00", feeType: "fixed_fee" }),
      expect.objectContaining({ amount: "15.00", feeType: "shipping_cost" }),
    ]);
    expect(result.products[0]).toEqual(
      expect.objectContaining({ externalProductId: "101", sku: "SKU-1" }),
    );
  });

  it("imports Shopee catalog products with model-level SKUs, prices, status, and images", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_718_184_000_000);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            response: {
              has_next_page: false,
              item: [{ item_id: 101, item_status: "NORMAL" }],
              next_offset: 0,
            },
          }),
          { headers: { "content-type": "application/json" }, status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            response: {
              item_list: [
                {
                  image: {
                    image_id_list: ["img-1", "img-2"],
                    image_url_list: [
                      "https://cf.shopee.com.br/file/img-1",
                      "https://cf.shopee.com.br/file/img-2",
                    ],
                  },
                  item_id: 101,
                  item_name: "Camiseta Shopee",
                  item_sku: "SKU-PAI",
                  item_status: "NORMAL",
                  price_info: [{ current_price: 89.9 }],
                  has_model: true,
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
              has_next_page: false,
              model: [
                {
                  model_id: 501,
                  model_name: "Azul",
                  model_sku: "SKU-AZUL",
                  price_info: [{ current_price: 99.9 }],
                  stock_info_v2: {
                    seller_stock: [{ stock_location_id: "loc-1", stock: 4 }],
                  },
                },
                {
                  model_id: 502,
                  model_name: "Preta",
                  model_sku: "SKU-PRETA",
                  price_info: [{ current_price: 109.9 }],
                  stock_info_v2: {
                    seller_stock: [{ stock_location_id: "loc-1", stock: 0 }],
                  },
                },
              ],
              next_offset: 0,
            },
          }),
          { headers: { "content-type": "application/json" }, status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    const provider = new ShopeeProvider(createEnv());

    const result = await provider.importCatalog!({
      connection: createConnection() as never,
      organizationId: "org_1",
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0]?.[0].toString()).toContain(
      "/api/v2/product/get_item_list",
    );
    expect(fetchMock.mock.calls[1]?.[0].toString()).toContain(
      "/api/v2/product/get_item_base_info",
    );
    expect(fetchMock.mock.calls[2]?.[0].toString()).toContain(
      "/api/v2/product/get_model_list",
    );
    expect(result).toEqual([
      expect.objectContaining({
        externalProductId: "101:501",
        images: [
          "https://cf.shopee.com.br/file/img-1",
          "https://cf.shopee.com.br/file/img-2",
        ],
        isActive: true,
        sellingPrice: "99.90",
        sku: "SKU-AZUL",
        title: "Camiseta Shopee - Azul",
      }),
      expect.objectContaining({
        externalProductId: "101:502",
        isActive: false,
        sellingPrice: "109.90",
        sku: "SKU-PRETA",
        title: "Camiseta Shopee - Preta",
      }),
    ]);
  });

  it("uses explicit manual range timestamps for historical syncs", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_718_184_000_000);
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          response: {
            more: false,
            order_list: [],
          },
        }),
        { headers: { "content-type": "application/json" }, status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const provider = new ShopeeProvider(createEnv());

    const result = await provider.syncOrders({
      connection: createConnection() as never,
      mode: "manual_range",
      organizationId: "org_1",
      range: {
        endAt: "2026-06-20T23:59:59.999Z",
        startAt: "2026-06-10T00:00:00.000Z",
      },
    });

    const firstUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(firstUrl.searchParams.get("time_from")).toBe(
      String(Date.parse("2026-06-10T00:00:00.000Z") / 1000),
    );
    expect(firstUrl.searchParams.get("time_to")).toBe(
      String(Math.floor(Date.parse("2026-06-20T23:59:59.999Z") / 1000)),
    );
    expect(result.cursor).toBeNull();
  });
});
