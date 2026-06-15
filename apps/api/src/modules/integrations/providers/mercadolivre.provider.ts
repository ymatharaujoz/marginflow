import { createHash } from "node:crypto";
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
  type IntegrationSyncContext,
  type IntegrationSyncFee,
  type IntegrationSyncOrder,
  type IntegrationSyncOrderItem,
  type IntegrationSyncProduct,
  type IntegrationSyncResult,
} from "../integrations.types";

type MercadoLivreItemSearchResponse = {
  results?: Array<string | number>;
  scroll_id?: string;
};

type MercadoLivreItemPicture = {
  id?: string;
  secure_url?: string;
  url?: string;
};

type MercadoLivreItemVariation = {
  attribute_combinations?: Array<{
    name?: string;
    value_name?: string;
  }>;
  id?: string | number;
  picture_ids?: string[];
  price?: number;
  seller_custom_field?: string | null;
};

type MercadoLivreItemResponse = {
  id?: string;
  pictures?: MercadoLivreItemPicture[];
  price?: number;
  seller_custom_field?: string | null;
  status?: string;
  title?: string;
  variations?: MercadoLivreItemVariation[];
};

type MercadoLivreMultiGetResponse = Array<{
  body?: MercadoLivreItemResponse;
  code?: number;
}>;

type MercadoLivreTokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  user_id?: number;
};

type MercadoLivreProfileResponse = {
  email?: string;
  first_name?: string;
  id?: number;
  last_name?: string;
  nickname?: string;
  site_id?: string;
};

type MercadoLivreOrderSearchResponse = {
  paging?: {
    limit?: number;
    offset?: number;
    total?: number;
  };
  results?: MercadoLivreOrderResponse[];
};

type MercadoLivreOrderResponse = {
  currency_id?: string;
  date_closed?: string;
  date_created?: string;
  id?: number | string;
  order_items?: MercadoLivreOrderItemResponse[];
  payments?: Array<{
    fee_amount?: number;
    marketplace_fee?: number;
    shipping_cost?: number;
  }>;
  seller?: {
    id?: number;
  };
  shipping?: {
    id?: number | string;
  };
  shipping_cost?: number;
  status?: string;
  tags?: string[];
  total_amount?: number;
};

type MercadoLivreOrderItemResponse = {
  item?: {
    id?: number | string;
    seller_sku?: string;
    title?: string;
  };
  quantity?: number;
  sale_fee?: number;
  unit_price?: number;
};

function toDecimalString(value: number | string | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toFixed(2);
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed.toFixed(2) : "0.00";
  }

  return "0.00";
}

function dedupeProducts(products: IntegrationSyncProduct[]) {
  const unique = new Map<string, IntegrationSyncProduct>();

  for (const product of products) {
    unique.set(product.externalProductId, product);
  }

  return Array.from(unique.values());
}

async function parseProviderResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

function sanitizeProviderPayload(payload: unknown) {
  if (typeof payload === "string") {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return null;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (/(token|secret|password)/i.test(key)) {
      sanitized[key] = "[redacted]";
      continue;
    }
    sanitized[key] = value;
  }

  return sanitized;
}

function buildCodeChallenge(codeVerifier: string) {
  return createHash("sha256").update(codeVerifier).digest("base64url");
}

export class MercadoLivreProvider implements IntegrationProvider {
  readonly displayName = "Mercado Livre";
  readonly provider = "mercadolivre" as const;

  constructor(private readonly env: ApiRuntimeEnv) {}

  isConfigured() {
    return Boolean(
      this.env.MERCADOLIVRE_CLIENT_ID && this.env.MERCADOLIVRE_CLIENT_SECRET,
    );
  }

  supportsSync() {
    return this.isConfigured();
  }

  async createAuthorization(
    input: IntegrationProviderContext,
  ): Promise<IntegrationProviderAuthorization> {
    if (!this.isConfigured()) {
      throw new IntegrationProviderError(
        "Mercado Livre is not configured in the API environment.",
        "provider_not_configured",
      );
    }

    const url = new URL("https://auth.mercadolivre.com.br/authorization");
    url.searchParams.set("client_id", this.env.MERCADOLIVRE_CLIENT_ID ?? "");
    url.searchParams.set("redirect_uri", this.getRedirectUri());
    url.searchParams.set("response_type", "code");
    url.searchParams.set("state", input.state);

    if (this.env.MERCADOLIVRE_USE_PKCE) {
      if (!input.codeVerifier) {
        throw new IntegrationProviderError(
          "PKCE do Mercado Livre está habilitado, mas o code_verifier não foi gerado.",
          "callback_invalid",
        );
      }

      url.searchParams.set(
        "code_challenge",
        buildCodeChallenge(input.codeVerifier),
      );
      url.searchParams.set("code_challenge_method", "S256");
    }

    return {
      authorizationUrl: url.toString(),
    };
  }

  async exchangeCode(
    code: string,
    input: IntegrationProviderCallbackInput = {},
  ): Promise<IntegrationProviderCallbackResult> {
    if (!this.isConfigured()) {
      throw new IntegrationProviderError(
        "Mercado Livre is not configured in the API environment.",
        "provider_not_configured",
      );
    }

    if (this.env.MERCADOLIVRE_USE_PKCE && !input.codeVerifier) {
      throw new IntegrationProviderError(
        "PKCE do Mercado Livre está habilitado, mas o code_verifier do callback não foi encontrado.",
        "callback_invalid",
      );
    }

    const tokenRequestBody = new URLSearchParams({
      client_id: this.env.MERCADOLIVRE_CLIENT_ID ?? "",
      client_secret: this.env.MERCADOLIVRE_CLIENT_SECRET ?? "",
      code,
      grant_type: "authorization_code",
      redirect_uri: this.getRedirectUri(),
    });

    if (input.codeVerifier) {
      tokenRequestBody.set("code_verifier", input.codeVerifier);
    }

    const tokenResponse = await fetch(
      "https://api.mercadolibre.com/oauth/token",
      {
        body: tokenRequestBody,
        headers: {
          accept: "application/json",
          "content-type": "application/x-www-form-urlencoded",
        },
        method: "POST",
      },
    );

    const tokenPayload = (await parseProviderResponse(tokenResponse)) as
      | MercadoLivreTokenResponse
      | string;

    if (
      !tokenResponse.ok ||
      typeof tokenPayload === "string" ||
      !tokenPayload.access_token
    ) {
      throw new IntegrationProviderError(
        `Mercado Livre token exchange failed.${
          typeof tokenPayload === "string"
            ? ` status=${tokenResponse.status} payload=${tokenPayload}`
            : ` status=${tokenResponse.status} payload=${JSON.stringify(sanitizeProviderPayload(tokenPayload))}`
        }`,
        "remote_request_failed",
      );
    }

    const profileResponse = await fetch(
      "https://api.mercadolibre.com/users/me",
      {
        headers: {
          Authorization: `Bearer ${tokenPayload.access_token}`,
          accept: "application/json",
        },
        method: "GET",
      },
    );
    const profilePayload = (await parseProviderResponse(profileResponse)) as
      | MercadoLivreProfileResponse
      | string;

    if (
      !profileResponse.ok ||
      typeof profilePayload === "string" ||
      !profilePayload.id
    ) {
      throw new IntegrationProviderError(
        `Mercado Livre account lookup failed.${
          typeof profilePayload === "string"
            ? ` status=${profileResponse.status} payload=${profilePayload}`
            : ` status=${profileResponse.status} payload=${JSON.stringify(sanitizeProviderPayload(profilePayload))}`
        }`,
        "remote_request_failed",
      );
    }

    return {
      accessToken: tokenPayload.access_token,
      connectedAccountId: String(profilePayload.id ?? tokenPayload.user_id),
      connectedAccountLabel:
        profilePayload.nickname ??
        profilePayload.email ??
        ([profilePayload.first_name, profilePayload.last_name]
          .filter(Boolean)
          .join(" ")
          .trim() ||
          null),
      metadata: {
        email: profilePayload.email ?? null,
        firstName: profilePayload.first_name ?? null,
        lastName: profilePayload.last_name ?? null,
        nickname: profilePayload.nickname ?? null,
        scope: tokenPayload.scope ?? null,
        siteId: profilePayload.site_id ?? null,
        tokenType: tokenPayload.token_type ?? null,
      },
      refreshToken: tokenPayload.refresh_token ?? null,
      tokenExpiresAt:
        typeof tokenPayload.expires_in === "number"
          ? new Date(Date.now() + tokenPayload.expires_in * 1000)
          : null,
    };
  }

  async disconnect() {
    return undefined;
  }

  async importCatalog(
    input: IntegrationCatalogImportContext,
  ): Promise<IntegrationCatalogProduct[]> {
    const accountId = input.connection.externalAccountId;
    const accessToken = input.connection.accessToken;

    if (!accountId || !accessToken) {
      throw new IntegrationProviderError(
        "Mercado Livre connection is missing the account token required for catalog import.",
        "callback_invalid",
      );
    }

    const itemIds = await this.fetchCatalogItemIds({
      accessToken,
      accountId,
    });
    const products: IntegrationCatalogProduct[] = [];

    for (let offset = 0; offset < itemIds.length; offset += 20) {
      const itemBatch = await this.fetchCatalogItems({
        accessToken,
        itemIds: itemIds.slice(offset, offset + 20),
      });

      for (const item of itemBatch) {
        products.push(...this.normalizeCatalogItem(item));
      }
    }

    return products;
  }

  async syncOrders(
    input: IntegrationSyncContext,
  ): Promise<IntegrationSyncResult> {
    if (!this.supportsSync()) {
      throw new IntegrationProviderError(
        "Mercado Livre sync is not configured in the API environment.",
        "provider_not_configured",
      );
    }

    const accountId = input.connection.externalAccountId;

    if (!accountId || !input.connection.accessToken) {
      throw new IntegrationProviderError(
        "Mercado Livre connection is missing the account token required for sync.",
        "callback_invalid",
      );
    }

    const orderedAfter =
      input.cursor &&
      typeof input.cursor === "object" &&
      typeof input.cursor.orderedAfter === "string"
        ? input.cursor.orderedAfter
        : null;

    const orders = await this.fetchOrders({
      accessToken: input.connection.accessToken,
      accountId,
      orderedAfter,
    });

    const products = dedupeProducts(
      orders.flatMap((order) =>
        order.items
          .filter((item) => item.externalProductId !== null)
          .map<IntegrationSyncProduct>((item) => ({
            externalProductId: item.externalProductId ?? "",
            metadata: {
              source: "mercadolivre-order-item",
            },
            sku: item.sku ?? null,
            title: item.title ?? null,
          })),
      ),
    );

    const nextOrderedAfter = orders.reduce<string | null>((latest, order) => {
      if (!order.orderedAt) {
        return latest;
      }

      return latest === null || order.orderedAt > latest
        ? order.orderedAt
        : latest;
    }, orderedAfter);

    return {
      cursor: nextOrderedAfter
        ? {
            orderedAfter: nextOrderedAfter,
          }
        : input.cursor,
      orders,
      products,
    };
  }

  private async fetchCatalogItemIds(input: {
    accessToken: string;
    accountId: string;
  }) {
    const itemIds: string[] = [];
    for (const status of ["active", "paused"] as const) {
      let scrollId: string | null = null;

      do {
        const url = new URL(
          `https://api.mercadolibre.com/users/${encodeURIComponent(input.accountId)}/items/search`,
        );
        url.searchParams.set("status", status);
        url.searchParams.set("search_type", "scan");
        url.searchParams.set("limit", "100");
        if (scrollId) {
          url.searchParams.set("scroll_id", scrollId);
        }

        const response = await this.fetchWithRetry(url, {
          headers: { Authorization: `Bearer ${input.accessToken}` },
        });
        const payload = (await parseProviderResponse(response)) as
          | MercadoLivreItemSearchResponse
          | string;

        if (!response.ok || typeof payload === "string") {
          throw new IntegrationProviderError(
            `Mercado Livre catalog search failed.${typeof payload === "string" ? ` ${payload}` : ""}`,
            "remote_request_failed",
          );
        }

        const pageIds = (payload.results ?? []).map(String);
        itemIds.push(...pageIds);
        scrollId = payload.scroll_id ?? null;

        if (pageIds.length === 0) {
          break;
        }
      } while (scrollId);
    }

    return [...new Set(itemIds)];
  }

  private async fetchCatalogItems(input: {
    accessToken: string;
    itemIds: string[];
  }) {
    if (input.itemIds.length === 0) {
      return [];
    }

    const url = new URL("https://api.mercadolibre.com/items");
    url.searchParams.set("ids", input.itemIds.join(","));
    url.searchParams.set(
      "attributes",
      "id,title,price,status,seller_custom_field,pictures,variations",
    );
    const response = await this.fetchWithRetry(url, {
      headers: { Authorization: `Bearer ${input.accessToken}` },
    });
    const payload = (await parseProviderResponse(response)) as
      | MercadoLivreMultiGetResponse
      | string;

    if (
      !response.ok ||
      typeof payload === "string" ||
      !Array.isArray(payload)
    ) {
      throw new IntegrationProviderError(
        `Mercado Livre item lookup failed.${typeof payload === "string" ? ` ${payload}` : ""}`,
        "remote_request_failed",
      );
    }

    return payload
      .filter((entry) => entry.code === 200 && entry.body?.id)
      .map((entry) => entry.body!);
  }

  private normalizeCatalogItem(
    item: MercadoLivreItemResponse,
  ): IntegrationCatalogProduct[] {
    const itemId = String(item.id);
    const itemImages = (item.pictures ?? [])
      .map((picture) => ({
        id: picture.id ?? "",
        url: picture.secure_url ?? picture.url ?? "",
      }))
      .filter((picture) => picture.url.startsWith("https://"));
    const itemImageById = new Map(
      itemImages.map((picture) => [picture.id, picture.url] as const),
    );
    const variations = item.variations ?? [];

    if (variations.length === 0) {
      return [
        {
          externalProductId: itemId,
          images: itemImages.map((picture) => picture.url),
          isActive: item.status === "active",
          metadata: { itemId, variationId: null },
          sellingPrice: toDecimalString(item.price),
          sku: item.seller_custom_field?.trim() || `ML-${itemId}`,
          title: item.title?.trim() || `Produto Mercado Livre ${itemId}`,
        },
      ];
    }

    return variations.flatMap((variation) => {
      if (variation.id === undefined || variation.id === null) {
        return [];
      }

      const variationId = String(variation.id);
      const attributes = (variation.attribute_combinations ?? [])
        .map((attribute) => {
          const name = attribute.name?.trim();
          const value = attribute.value_name?.trim();
          return name && value ? `${name}: ${value}` : null;
        })
        .filter((value): value is string => value !== null);
      const images = (variation.picture_ids ?? [])
        .map((pictureId) => itemImageById.get(pictureId))
        .filter((url): url is string => Boolean(url));

      return [
        {
          externalProductId: `${itemId}:${variationId}`,
          images:
            images.length > 0
              ? images
              : itemImages.map((picture) => picture.url),
          isActive: item.status === "active",
          metadata: { itemId, variationId },
          sellingPrice: toDecimalString(variation.price ?? item.price),
          sku:
            variation.seller_custom_field?.trim() ||
            `ML-${itemId}-${variationId}`,
          title: [
            item.title?.trim() || `Produto Mercado Livre ${itemId}`,
            attributes.length > 0 ? attributes.join(", ") : null,
          ]
            .filter(Boolean)
            .join(" - "),
        },
      ];
    });
  }

  private async fetchWithRetry(
    input: string | URL,
    init?: RequestInit,
  ): Promise<Response> {
    let response: Response | null = null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      response = await fetch(input, init);
      if (response.status !== 429 && response.status < 500) {
        return response;
      }
    }

    return response!;
  }

  private async fetchOrders(input: {
    accessToken: string;
    accountId: string;
    orderedAfter: string | null;
  }) {
    const collected: IntegrationSyncOrder[] = [];
    let offset = 0;
    const limit = 50;
    let pageCount = 0;
    let total = Number.POSITIVE_INFINITY;

    while (offset < total && pageCount < 4) {
      const url = new URL("https://api.mercadolibre.com/orders/search");
      url.searchParams.set("limit", String(limit));
      url.searchParams.set("offset", String(offset));
      url.searchParams.set("seller", input.accountId);
      url.searchParams.set("sort", "date_desc");

      if (input.orderedAfter) {
        url.searchParams.set("order.date_created.from", input.orderedAfter);
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${input.accessToken}`,
          accept: "application/json",
        },
        method: "GET",
      });
      const payload = (await parseProviderResponse(response)) as
        | MercadoLivreOrderSearchResponse
        | string;

      if (!response.ok || typeof payload === "string") {
        throw new IntegrationProviderError(
          `Mercado Livre order fetch failed.${typeof payload === "string" ? ` ${payload}` : ""}`,
          "remote_request_failed",
        );
      }

      const pageOrders = await Promise.all(
        (payload.results ?? []).map((order) =>
          this.normalizeOrder(order, {
            accessToken: input.accessToken,
            sellerAccountId: input.accountId,
          }),
        ),
      );
      collected.push(...pageOrders);
      total = payload.paging?.total ?? pageOrders.length;
      offset += payload.paging?.limit ?? limit;
      pageCount += 1;

      if (pageOrders.length === 0) {
        break;
      }
    }

    return collected;
  }

  private async normalizeOrder(
    order: MercadoLivreOrderResponse,
    input: {
      accessToken: string;
      sellerAccountId: string;
    },
  ): Promise<IntegrationSyncOrder> {
    const skuByExternalProductId: Record<string, string | null> = {};
    const titleByExternalProductId: Record<string, string | null> = {};

    const items = (order.order_items ?? []).map<IntegrationSyncOrderItem>(
      (item) => {
        const externalProductId = item.item?.id ? String(item.item.id) : null;

        if (externalProductId) {
          skuByExternalProductId[externalProductId] =
            item.item?.seller_sku ?? null;
          titleByExternalProductId[externalProductId] =
            item.item?.title ?? null;
        }

        const quantity =
          typeof item.quantity === "number" && item.quantity > 0
            ? item.quantity
            : 1;
        const unitPrice = toDecimalString(item.unit_price);

        return {
          externalProductId,
          quantity,
          sku: item.item?.seller_sku ?? null,
          totalPrice: toDecimalString((Number(unitPrice) || 0) * quantity),
          title: item.item?.title ?? null,
          unitPrice,
        };
      },
    );

    const fees: IntegrationSyncFee[] = [];

    const paymentMarketplaceFee = (order.payments ?? []).reduce(
      (sum, payment) => {
        return (
          sum +
          (typeof payment.marketplace_fee === "number"
            ? payment.marketplace_fee
            : 0)
        );
      },
      0,
    );
    const itemSaleFee = (order.order_items ?? []).reduce((sum, item) => {
      return sum + (typeof item.sale_fee === "number" ? item.sale_fee : 0);
    }, 0);
    const marketplaceCommission =
      paymentMarketplaceFee > 0
        ? paymentMarketplaceFee
        : itemSaleFee > 0
          ? itemSaleFee
          : 0;

    if (marketplaceCommission > 0) {
      fees.push({
        amount: toDecimalString(marketplaceCommission),
        currency: order.currency_id ?? "BRL",
        feeType: "marketplace_commission",
        metadata: {
          source:
            paymentMarketplaceFee > 0
              ? "payment.marketplace_fee"
              : "order_items.sale_fee",
        },
      });
    }

    for (const payment of order.payments ?? []) {
      if (typeof payment.fee_amount === "number" && payment.fee_amount > 0) {
        fees.push({
          amount: toDecimalString(payment.fee_amount),
          currency: order.currency_id ?? "BRL",
          feeType: "fixed_fee",
          metadata: {
            source: "payments.fee_amount",
          },
        });
      }
    }

    const shippingCost = await this.resolveShippingCost(order, input);

    if (shippingCost > 0) {
      fees.push({
        amount: toDecimalString(shippingCost),
        currency: order.currency_id ?? "BRL",
        feeType: "shipping_cost",
        metadata: {
          shipmentId: order.shipping?.id ? String(order.shipping.id) : null,
        },
      });
    }

    return {
      currency: order.currency_id ?? "BRL",
      externalOrderId: String(order.id ?? ""),
      fees,
      items,
      metadata: {
        skuByExternalProductId,
        tags: order.tags ?? [],
        titleByExternalProductId,
      },
      orderedAt: order.date_closed ?? order.date_created ?? null,
      status: order.status ?? "imported",
      totalAmount: toDecimalString(order.total_amount),
    };
  }

  private async resolveShippingCost(
    order: MercadoLivreOrderResponse,
    input: {
      accessToken: string;
      sellerAccountId: string;
    },
  ) {
    const shipmentId = order.shipping?.id ? String(order.shipping.id) : null;

    if (shipmentId) {
      const shipmentCost = await this.fetchShipmentSellerCost({
        accessToken: input.accessToken,
        sellerAccountId: input.sellerAccountId,
        shipmentId,
      });

      if (shipmentCost !== null) {
        return shipmentCost;
      }
    }

    const paymentShippingCost = (order.payments ?? []).reduce(
      (sum, payment) => {
        return (
          sum +
          (typeof payment.shipping_cost === "number"
            ? payment.shipping_cost
            : 0)
        );
      },
      0,
    );

    if (paymentShippingCost > 0) {
      return paymentShippingCost;
    }

    return typeof order.shipping_cost === "number" && order.shipping_cost > 0
      ? order.shipping_cost
      : 0;
  }

  private async fetchShipmentSellerCost(input: {
    accessToken: string;
    sellerAccountId: string;
    shipmentId: string;
  }) {
    const response = await fetch(
      `https://api.mercadolibre.com/shipments/${input.shipmentId}/costs`,
      {
        headers: {
          Authorization: `Bearer ${input.accessToken}`,
          accept: "application/json",
          "x-format-new": "true",
        },
        method: "GET",
      },
    );

    const payload = (await parseProviderResponse(response)) as
      | {
          senders?: Array<{
            cost?: number;
            user_id?: number;
          }>;
        }
      | string;

    if (!response.ok || typeof payload === "string") {
      return null;
    }

    const matchedSender =
      payload.senders?.find(
        (sender) => String(sender.user_id ?? "") === input.sellerAccountId,
      ) ??
      payload.senders?.[0] ??
      null;

    return typeof matchedSender?.cost === "number" && matchedSender.cost > 0
      ? matchedSender.cost
      : null;
  }

  private getRedirectUri() {
    const apiBaseUrl =
      this.env.API_PUBLIC_BASE_URL ??
      this.env.BETTER_AUTH_URL ??
      "http://localhost:4000";

    return (
      this.env.MERCADOLIVRE_REDIRECT_URI ??
      `${apiBaseUrl.replace(/\/$/, "")}/integrations/mercadolivre/callback`
    );
  }
}
