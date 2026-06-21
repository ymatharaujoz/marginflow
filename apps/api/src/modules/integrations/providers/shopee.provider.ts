import { createHmac, timingSafeEqual } from "node:crypto";
import type { MarketplaceConnection } from "@lucreii/database";
import type { ApiRuntimeEnv } from "@/common/config/api-env";
import {
  type IntegrationCatalogImportContext,
  type IntegrationCatalogProduct,
  IntegrationProviderError,
  type IntegrationProvider,
  type IntegrationProviderAuthorization,
  type IntegrationProviderCallbackInput,
  type IntegrationProviderCallbackResult,
  type IntegrationProviderContext,
  type IntegrationProviderTokenRefreshResult,
  type IntegrationSyncFee,
  type IntegrationSyncOrder,
  type IntegrationSyncProduct,
  type IntegrationSyncContext,
  type IntegrationSyncResult,
} from "../integrations.types";

const SHOPEE_API_BASE_URL = "https://partner.shopeemobile.com";
const AUTH_PATH = "/api/v2/shop/auth_partner";
const TOKEN_PATH = "/api/v2/auth/token/get";
const REFRESH_TOKEN_PATH = "/api/v2/auth/access_token/get";
const ORDER_LIST_PATH = "/api/v2/order/get_order_list";
const ORDER_DETAIL_PATH = "/api/v2/order/get_order_detail";
const ESCROW_DETAIL_PATH = "/api/v2/payment/get_escrow_detail";
const PRODUCT_ITEM_LIST_PATH = "/api/v2/product/get_item_list";
const PRODUCT_ITEM_BASE_INFO_PATH = "/api/v2/product/get_item_base_info";
const PRODUCT_MODEL_LIST_PATH = "/api/v2/product/get_model_list";
const FIRST_SYNC_LOOKBACK_SECONDS = 15 * 24 * 60 * 60;
const CURSOR_OVERLAP_SECONDS = 5 * 60;

type ShopeeTokenResponse = {
  access_token?: string;
  error?: string;
  expire_in?: number;
  message?: string;
  refresh_token?: string;
  request_id?: string;
};

type ShopeeOrderListResponse = {
  error?: string;
  message?: string;
  response?: {
    more?: boolean;
    next_cursor?: string;
    order_list?: Array<{ order_sn?: string; order_status?: string }>;
  };
};

type ShopeeOrderItem = {
  item_id?: number;
  item_name?: string;
  item_sku?: string;
  model_id?: number;
  model_name?: string;
  model_sku?: string;
  model_quantity_purchased?: number;
  model_original_price?: number;
  model_discounted_price?: number;
};

type ShopeeOrderDetail = {
  create_time?: number;
  currency?: string;
  item_list?: ShopeeOrderItem[];
  order_sn?: string;
  order_status?: string;
  pay_time?: number;
  total_amount?: number;
  update_time?: number;
};

type ShopeeOrderDetailResponse = {
  error?: string;
  message?: string;
  response?: { order_list?: ShopeeOrderDetail[] };
};

type ShopeeEscrowResponse = {
  error?: string;
  message?: string;
  response?: {
    order_income?: {
      actual_shipping_fee?: number;
      commission_fee?: number;
      estimated_shipping_fee?: number;
      final_shipping_fee?: number;
      seller_shipping_discount?: number;
      seller_transaction_fee?: number;
      service_fee?: number;
    };
  };
};

type ShopeeCatalogItemListResponse = {
  error?: string;
  message?: string;
  response?: {
    has_next_page?: boolean;
    item?: Array<{ item_id?: number; item_status?: string }>;
    next_offset?: number;
  };
};

type ShopeeCatalogItemBaseInfoResponse = {
  error?: string;
  message?: string;
  response?: {
    item_list?: Array<{
      has_model?: boolean;
      image?: {
        image_id_list?: string[];
        image_url_list?: string[];
      };
      item_id?: number;
      item_name?: string;
      item_sku?: string;
      item_status?: string;
      price_info?: Array<{ current_price?: number; original_price?: number }>;
      stock_info_v2?: {
        seller_stock?: Array<{ stock?: number }>;
      };
    }>;
  };
};

type ShopeeCatalogModelListResponse = {
  error?: string;
  message?: string;
  response?: {
    has_next_page?: boolean;
    model?: Array<{
      model_id?: number;
      model_name?: string;
      model_sku?: string;
      price_info?: Array<{ current_price?: number; original_price?: number }>;
      stock_info_v2?: {
        seller_stock?: Array<{ stock?: number }>;
      };
    }>;
    next_offset?: number;
  };
};

function timestampNow() {
  return Math.floor(Date.now() / 1000);
}

function toMoney(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : "0.00";
}

function positiveSum(...values: unknown[]) {
  return values.reduce<number>(
    (sum, value) => sum + (typeof value === "number" && value > 0 ? value : 0),
    0,
  );
}

function chunk<T>(values: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function externalProductId(item: ShopeeOrderItem) {
  if (item.item_id === undefined) {
    return null;
  }

  return item.model_id && item.model_id > 0
    ? `${item.item_id}:${item.model_id}`
    : String(item.item_id);
}

function dedupeProducts(products: IntegrationSyncProduct[]) {
  return Array.from(new Map(products.map((product) => [product.externalProductId, product])).values());
}

function normalizeShopeeCatalogPrice(
  priceInfo: Array<{ current_price?: number; original_price?: number }> | undefined,
) {
  const first = priceInfo?.[0];
  return toMoney(first?.current_price ?? first?.original_price ?? 0);
}

function sumSellerStock(
  stockInfo:
    | {
        seller_stock?: Array<{ stock?: number }>;
      }
    | undefined,
) {
  return (stockInfo?.seller_stock ?? []).reduce<number>(
    (sum, entry) => sum + (typeof entry.stock === "number" ? Math.max(0, entry.stock) : 0),
    0,
  );
}

function isShopeeActive(itemStatus: string | undefined, stock: number | null) {
  const normalizedStatus = itemStatus?.trim().toUpperCase();
  if (normalizedStatus !== "NORMAL") {
    return false;
  }

  return stock === null ? true : stock > 0;
}

export class ShopeeProvider implements IntegrationProvider {
  readonly displayName = "Shopee";
  readonly provider = "shopee" as const;

  constructor(private readonly env: ApiRuntimeEnv) {}

  isConfigured() {
    return Boolean(this.env.SHOPEE_PARTNER_ID && this.env.SHOPEE_PARTNER_KEY);
  }

  supportsSync() {
    return this.isConfigured();
  }

  async createAuthorization(
    input: IntegrationProviderContext,
  ): Promise<IntegrationProviderAuthorization> {
    this.assertConfigured();
    const timestamp = timestampNow();
    const redirect = new URL(this.getRedirectUri());
    redirect.searchParams.set("state", input.state);
    const url = new URL(AUTH_PATH, SHOPEE_API_BASE_URL);
    url.searchParams.set("partner_id", String(this.env.SHOPEE_PARTNER_ID));
    url.searchParams.set("timestamp", String(timestamp));
    url.searchParams.set("sign", this.signPublic(AUTH_PATH, timestamp));
    url.searchParams.set("redirect", redirect.toString());
    return { authorizationUrl: url.toString() };
  }

  async exchangeCode(
    code: string,
    input: IntegrationProviderCallbackInput = {},
  ): Promise<IntegrationProviderCallbackResult> {
    this.assertConfigured();
    const shopId = input.externalAccountId?.trim();
    if (!shopId) {
      throw new IntegrationProviderError(
        "Shopee callback did not include the required shop_id.",
        "callback_invalid",
      );
    }

    const payload = await this.postToken(TOKEN_PATH, {
      code,
      partner_id: this.env.SHOPEE_PARTNER_ID,
      shop_id: Number(shopId),
    });

    return {
      accessToken: payload.access_token!,
      connectedAccountId: shopId,
      connectedAccountLabel: `Loja Shopee ${shopId}`,
      metadata: { shopId, tokenRequestId: payload.request_id ?? null },
      refreshToken: payload.refresh_token ?? null,
      tokenExpiresAt: new Date(Date.now() + (payload.expire_in ?? 14400) * 1000),
    };
  }

  async refreshAccessToken(
    connection: MarketplaceConnection,
  ): Promise<IntegrationProviderTokenRefreshResult> {
    this.assertConfigured();
    if (!connection.externalAccountId || !connection.refreshToken) {
      throw new IntegrationProviderError(
        "Shopee connection is missing shop_id or refresh_token.",
        "callback_invalid",
      );
    }

    const payload = await this.postToken(REFRESH_TOKEN_PATH, {
      partner_id: this.env.SHOPEE_PARTNER_ID,
      refresh_token: connection.refreshToken,
      shop_id: Number(connection.externalAccountId),
    });

    if (!payload.refresh_token) {
      throw new IntegrationProviderError(
        "Shopee token refresh did not return a refresh_token.",
        "remote_request_failed",
      );
    }

    return {
      accessToken: payload.access_token!,
      refreshToken: payload.refresh_token,
      tokenExpiresAt: new Date(Date.now() + (payload.expire_in ?? 14400) * 1000),
    };
  }

  async disconnect() {
    return undefined;
  }

  async importCatalog(
    input: IntegrationCatalogImportContext,
  ): Promise<IntegrationCatalogProduct[]> {
    this.assertConfigured();
    const shopId = input.connection.externalAccountId;
    const accessToken = input.connection.accessToken;
    if (!shopId || !accessToken) {
      throw new IntegrationProviderError(
        "Shopee connection is missing shop_id or access_token required for catalog import.",
        "callback_invalid",
      );
    }

    const itemIds = await this.fetchCatalogItemIds({ accessToken, shopId });
    const baseItems = await this.fetchCatalogBaseItems({
      accessToken,
      itemIds,
      shopId,
    });
    const products: IntegrationCatalogProduct[] = [];

    for (const item of baseItems) {
      products.push(...(await this.normalizeCatalogItem({ accessToken, item, shopId })));
    }

    return products;
  }

  verifyWebhookSignature(input: {
    authorization: string;
    callbackUrl: string;
    rawBody: Buffer;
  }) {
    const expected = this.sign(
      `${input.callbackUrl}${input.rawBody.toString("utf8")}`,
    );
    const actualBuffer = Buffer.from(input.authorization, "utf8");
    const expectedBuffer = Buffer.from(expected, "utf8");
    return (
      actualBuffer.length === expectedBuffer.length &&
      timingSafeEqual(actualBuffer, expectedBuffer)
    );
  }

  async syncOrders(input: IntegrationSyncContext): Promise<IntegrationSyncResult> {
    this.assertConfigured();
    const shopId = input.connection.externalAccountId;
    const accessToken = input.connection.accessToken;
    if (!shopId || !accessToken) {
      throw new IntegrationProviderError(
        "Shopee connection is missing shop_id or access_token.",
        "callback_invalid",
      );
    }

    const previousUpdateTime =
      input.cursor && typeof input.cursor.updateTime === "number"
        ? input.cursor.updateTime
        : timestampNow() - FIRST_SYNC_LOOKBACK_SECONDS;
    const timeTo = timestampNow();
    const timeFrom = Math.max(
      previousUpdateTime - CURSOR_OVERLAP_SECONDS,
      timeTo - FIRST_SYNC_LOOKBACK_SECONDS,
    );
    const orderNumbers = await this.fetchOrderNumbers({
      accessToken,
      shopId,
      timeFrom,
      timeTo,
    });
    const details = await this.fetchOrderDetails({ accessToken, orderNumbers, shopId });
    const orders = await Promise.all(
      details.map((order) => this.normalizeOrder({ accessToken, order, shopId })),
    );
    const products = dedupeProducts(
      orders.flatMap((order) =>
        order.items
          .filter((item) => item.externalProductId)
          .map((item) => ({
            externalProductId: item.externalProductId!,
            metadata: { source: "shopee-order-item" },
            sku: item.sku ?? null,
            title: item.title ?? null,
          })),
      ),
    );

    return {
      cursor: { updateTime: timeTo },
      orders,
      products,
    };
  }

  private async normalizeOrder(input: {
    accessToken: string;
    order: ShopeeOrderDetail;
    shopId: string;
  }): Promise<IntegrationSyncOrder> {
    const orderNumber = input.order.order_sn;
    if (!orderNumber) {
      throw new IntegrationProviderError(
        "Shopee order detail did not include order_sn.",
        "remote_request_failed",
      );
    }

    const escrow = await this.fetchEscrow({
      accessToken: input.accessToken,
      orderNumber,
      shopId: input.shopId,
    });
    const income = escrow.response?.order_income;
    const currency = input.order.currency ?? "BRL";
    const commission = positiveSum(income?.commission_fee, income?.service_fee);
    const fixedFee = positiveSum(income?.seller_transaction_fee);
    const sellerShippingCost =
      income?.final_shipping_fee !== undefined
        ? Math.max(0, income.final_shipping_fee)
        : Math.max(
            0,
            (income?.actual_shipping_fee ?? income?.estimated_shipping_fee ?? 0) -
              positiveSum(income?.seller_shipping_discount),
          );
    const fees: IntegrationSyncFee[] = [];
    if (commission > 0) {
      fees.push({
        amount: toMoney(commission),
        currency,
        feeType: "marketplace_commission",
        metadata: { source: "payment.get_escrow_detail" },
      });
    }
    if (fixedFee > 0) {
      fees.push({
        amount: toMoney(fixedFee),
        currency,
        feeType: "fixed_fee",
        metadata: { source: "payment.get_escrow_detail" },
      });
    }
    if (sellerShippingCost > 0) {
      fees.push({
        amount: toMoney(sellerShippingCost),
        currency,
        feeType: "shipping_cost",
        metadata: { source: "payment.get_escrow_detail" },
      });
    }

    const items = (input.order.item_list ?? []).map((item) => {
      const quantity = item.model_quantity_purchased && item.model_quantity_purchased > 0
        ? item.model_quantity_purchased
        : 1;
      const unitPrice = item.model_discounted_price ?? item.model_original_price ?? 0;
      return {
        externalProductId: externalProductId(item),
        quantity,
        sku: item.model_sku || item.item_sku || null,
        title: item.model_name || item.item_name || null,
        totalPrice: toMoney(unitPrice * quantity),
        unitPrice: toMoney(unitPrice),
      };
    });
    const paid = Boolean(input.order.pay_time && input.order.pay_time > 0);

    return {
      currency,
      externalOrderId: orderNumber,
      fees,
      items,
      metadata: {
        escrowAvailable: Boolean(income),
        paid,
        payTime: input.order.pay_time ?? null,
        updateTime: input.order.update_time ?? null,
      },
      orderedAt: input.order.create_time
        ? new Date(input.order.create_time * 1000).toISOString()
        : null,
      status: input.order.order_status ?? "UNKNOWN",
      totalAmount: toMoney(input.order.total_amount),
    };
  }

  private async fetchOrderNumbers(input: {
    accessToken: string;
    shopId: string;
    timeFrom: number;
    timeTo: number;
  }) {
    const orderNumbers: string[] = [];
    let cursor = "";

    do {
      const payload = await this.getAuthenticated<ShopeeOrderListResponse>({
        accessToken: input.accessToken,
        params: {
          cursor,
          page_size: "100",
          response_optional_fields: "order_status",
          time_from: String(input.timeFrom),
          time_range_field: "update_time",
          time_to: String(input.timeTo),
        },
        path: ORDER_LIST_PATH,
        shopId: input.shopId,
      });
      orderNumbers.push(
        ...(payload.response?.order_list ?? [])
          .map((order) => order.order_sn)
          .filter((value): value is string => Boolean(value)),
      );
      cursor = payload.response?.more ? payload.response.next_cursor ?? "" : "";
    } while (cursor);

    return Array.from(new Set(orderNumbers));
  }

  private async fetchCatalogItemIds(input: { accessToken: string; shopId: string }) {
    const itemIds: number[] = [];
    let offset = 0;
    let hasNextPage = false;

    do {
      const payload = await this.getAuthenticated<ShopeeCatalogItemListResponse>({
        accessToken: input.accessToken,
        params: {
          offset: String(offset),
          page_size: "100",
        },
        path: PRODUCT_ITEM_LIST_PATH,
        shopId: input.shopId,
      });
      itemIds.push(
        ...(payload.response?.item ?? [])
          .map((item) => item.item_id)
          .filter((itemId): itemId is number => typeof itemId === "number"),
      );
      hasNextPage = payload.response?.has_next_page === true;
      offset = payload.response?.next_offset ?? 0;
    } while (hasNextPage);

    return Array.from(new Set(itemIds));
  }

  private async fetchCatalogBaseItems(input: {
    accessToken: string;
    itemIds: number[];
    shopId: string;
  }) {
    const items: NonNullable<
      ShopeeCatalogItemBaseInfoResponse["response"]
    >["item_list"] = [];

    for (const itemIdChunk of chunk(input.itemIds, 50)) {
      if (itemIdChunk.length === 0) {
        continue;
      }

      const payload = await this.getAuthenticated<ShopeeCatalogItemBaseInfoResponse>({
        accessToken: input.accessToken,
        params: {
          item_id_list: itemIdChunk.join(","),
          need_tax_info: "false",
        },
        path: PRODUCT_ITEM_BASE_INFO_PATH,
        shopId: input.shopId,
      });
      items.push(...(payload.response?.item_list ?? []));
    }

    return items;
  }

  private async fetchCatalogModels(input: {
    accessToken: string;
    itemId: number;
    shopId: string;
  }) {
    const models: NonNullable<ShopeeCatalogModelListResponse["response"]>["model"] = [];
    let offset = 0;
    let hasNextPage = false;

    do {
      const payload = await this.getAuthenticated<ShopeeCatalogModelListResponse>({
        accessToken: input.accessToken,
        params: {
          item_id: String(input.itemId),
          offset: String(offset),
          page_size: "50",
        },
        path: PRODUCT_MODEL_LIST_PATH,
        shopId: input.shopId,
      });
      models.push(...(payload.response?.model ?? []));
      hasNextPage = payload.response?.has_next_page === true;
      offset = payload.response?.next_offset ?? 0;
    } while (hasNextPage);

    return models;
  }

  private async normalizeCatalogItem(input: {
    accessToken: string;
    item: NonNullable<
      NonNullable<ShopeeCatalogItemBaseInfoResponse["response"]>["item_list"]
    >[number];
    shopId: string;
  }): Promise<IntegrationCatalogProduct[]> {
    const itemId = input.item.item_id;
    if (typeof itemId !== "number") {
      return [];
    }

    const itemIdString = String(itemId);
    const baseTitle = input.item.item_name?.trim() || `Produto Shopee ${itemIdString}`;
    const images = (input.item.image?.image_url_list ?? []).filter((url: string) =>
      url.startsWith("https://"),
    );
    const baseStock = sumSellerStock(input.item.stock_info_v2);
    const hasBaseStock = input.item.stock_info_v2?.seller_stock !== undefined;

    if (!input.item.has_model) {
      return [
        {
          externalProductId: itemIdString,
          images,
          isActive: isShopeeActive(
            input.item.item_status,
            hasBaseStock ? baseStock : null,
          ),
          metadata: { itemId, modelId: null },
          sellingPrice: normalizeShopeeCatalogPrice(input.item.price_info),
          sku: input.item.item_sku?.trim() || `SHP-${itemIdString}`,
          title: baseTitle,
        },
      ];
    }

    const models = await this.fetchCatalogModels({
      accessToken: input.accessToken,
      itemId,
      shopId: input.shopId,
    });

    return models
      .filter((model) => typeof model.model_id === "number")
      .map((model) => {
        const modelId = String(model.model_id);
        const modelName = model.model_name?.trim();
        const stock = sumSellerStock(model.stock_info_v2);
        const hasStock = model.stock_info_v2?.seller_stock !== undefined;

        return {
          externalProductId: `${itemIdString}:${modelId}`,
          images,
          isActive: isShopeeActive(
            input.item.item_status,
            hasStock ? stock : hasBaseStock ? baseStock : null,
          ),
          metadata: { itemId, modelId },
          sellingPrice: normalizeShopeeCatalogPrice(model.price_info),
          sku:
            model.model_sku?.trim() ||
            input.item.item_sku?.trim() ||
            `SHP-${itemIdString}-${modelId}`,
          title: modelName ? `${baseTitle} - ${modelName}` : baseTitle,
        } satisfies IntegrationCatalogProduct;
      });
  }

  private async fetchOrderDetails(input: {
    accessToken: string;
    orderNumbers: string[];
    shopId: string;
  }) {
    const details: ShopeeOrderDetail[] = [];
    for (const orderNumberChunk of chunk(input.orderNumbers, 50)) {
      if (orderNumberChunk.length === 0) {
        continue;
      }
      const payload = await this.getAuthenticated<ShopeeOrderDetailResponse>({
        accessToken: input.accessToken,
        params: {
          order_sn_list: orderNumberChunk.join(","),
          response_optional_fields: "item_list,total_amount,pay_time,create_time,update_time",
        },
        path: ORDER_DETAIL_PATH,
        shopId: input.shopId,
      });
      details.push(...(payload.response?.order_list ?? []));
    }
    return details;
  }

  private fetchEscrow(input: { accessToken: string; orderNumber: string; shopId: string }) {
    return this.getAuthenticated<ShopeeEscrowResponse>({
      accessToken: input.accessToken,
      params: { order_sn: input.orderNumber },
      path: ESCROW_DETAIL_PATH,
      shopId: input.shopId,
      tolerateRemoteError: true,
    });
  }

  private async getAuthenticated<T extends { error?: string; message?: string }>(input: {
    accessToken: string;
    params: Record<string, string>;
    path: string;
    shopId: string;
    tolerateRemoteError?: boolean;
  }) {
    const timestamp = timestampNow();
    const url = new URL(input.path, SHOPEE_API_BASE_URL);
    url.searchParams.set("partner_id", String(this.env.SHOPEE_PARTNER_ID));
    url.searchParams.set("timestamp", String(timestamp));
    url.searchParams.set("access_token", input.accessToken);
    url.searchParams.set("shop_id", input.shopId);
    url.searchParams.set(
      "sign",
      this.signShop(input.path, timestamp, input.accessToken, input.shopId),
    );
    for (const [key, value] of Object.entries(input.params)) {
      if (value) {
        url.searchParams.set(key, value);
      }
    }

    const response = await fetch(url, { headers: { accept: "application/json" } });
    const payload = (await response.json()) as T;
    if ((!response.ok || payload.error) && !input.tolerateRemoteError) {
      throw new IntegrationProviderError(
        `Shopee request failed for ${input.path}: ${payload.error ?? response.status} ${payload.message ?? ""}`.trim(),
        "remote_request_failed",
      );
    }
    return payload;
  }

  private async postToken(path: string, body: Record<string, unknown>) {
    const timestamp = timestampNow();
    const url = new URL(path, SHOPEE_API_BASE_URL);
    url.searchParams.set("partner_id", String(this.env.SHOPEE_PARTNER_ID));
    url.searchParams.set("timestamp", String(timestamp));
    url.searchParams.set("sign", this.signPublic(path, timestamp));
    const response = await fetch(url, {
      body: JSON.stringify(body),
      headers: { accept: "application/json", "content-type": "application/json" },
      method: "POST",
    });
    const payload = (await response.json()) as ShopeeTokenResponse;
    if (!response.ok || payload.error || !payload.access_token) {
      throw new IntegrationProviderError(
        `Shopee token request failed: ${payload.error ?? response.status} ${payload.message ?? ""}`.trim(),
        "remote_request_failed",
      );
    }
    return payload;
  }

  private signPublic(path: string, timestamp: number) {
    return this.sign(`${this.env.SHOPEE_PARTNER_ID}${path}${timestamp}`);
  }

  private signShop(path: string, timestamp: number, accessToken: string, shopId: string) {
    return this.sign(
      `${this.env.SHOPEE_PARTNER_ID}${path}${timestamp}${accessToken}${shopId}`,
    );
  }

  private sign(value: string) {
    return createHmac("sha256", this.env.SHOPEE_PARTNER_KEY ?? "").update(value).digest("hex");
  }

  private getRedirectUri() {
    const apiBaseUrl = this.env.API_PUBLIC_BASE_URL ?? this.env.BETTER_AUTH_URL ?? "http://localhost:4000";
    return (
      this.env.SHOPEE_REDIRECT_URI ??
      `${apiBaseUrl.replace(/\/$/, "")}/integrations/shopee/callback`
    );
  }

  private assertConfigured() {
    if (!this.isConfigured()) {
      throw new IntegrationProviderError(
        "Shopee is not configured in the API environment.",
        "provider_not_configured",
      );
    }
  }
}
