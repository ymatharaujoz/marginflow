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
  attributes?: MercadoLivreItemAttribute[];
  attribute_combinations?: Array<{
    name?: string;
    value_name?: string;
  }>;
  id?: string | number;
  picture_ids?: string[];
  price?: number;
  seller_custom_field?: string | null;
  seller_sku?: string | null;
};

type MercadoLivreItemAttribute = {
  id?: string;
  name?: string;
  value_name?: string | null;
};

type MercadoLivreItemResponse = {
  attributes?: MercadoLivreItemAttribute[];
  id?: string;
  pictures?: MercadoLivreItemPicture[];
  price?: number;
  seller_custom_field?: string | null;
  seller_sku?: string | null;
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

type MercadoLivreOrderDetailResponse = MercadoLivreOrderResponse;

type MercadoLivreShipmentCostsResponse = {
  receiver?: {
    cost?: number;
  };
  senders?: Array<{
    cost?: number;
    user_id?: number;
  }>;
};

type MercadoLivreShipmentDetailResponse = {
  order_cost?: number;
  shipping_option?: {
    cost?: number;
  };
};

type MercadoLivreOrderItemResponse = {
  item?: {
    category_id?: string;
    id?: number | string;
    variation_id?: number | string;
    seller_sku?: string;
    title?: string;
  };
  listing_type_id?: string;
  quantity_cancelled?: number;
  quantity_refunded?: number;
  quantity?: number;
  variation_id?: number | string;
  sale_fee?: number;
  unit_price?: number;
};

type MercadoLivreListingPriceResponse = {
  sale_fee_amount?: number;
  sale_fee_details?: {
    fixed_fee?: number;
    gross_amount?: number;
    percentage_fee?: number;
  };
};

type MercadoLivreBillingDetailFeeResponse = {
  discount?: number;
  discount_reason?: string | null;
  fixed_fee?: number;
  fee_amount?: number;
  gross?: number;
  net?: number;
  rebate?: number;
};

type MercadoLivreBillingDetailResponse = {
  last_id?: number | string;
  limit?: number;
  offset?: number;
  results?: Array<{
    fixed_fee?: number;
    fee_amount?: number;
    operation_id?: number | string;
    order_id?: number | string;
    sale_fee?: MercadoLivreBillingDetailFeeResponse;
  }>;
  total?: number;
  errors?: unknown[];
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

function toBillingPeriodKey(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`;
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

function readBillingFixedFee(
  result:
    | {
        fixed_fee?: number;
        fee_amount?: number;
        sale_fee?: MercadoLivreBillingDetailFeeResponse;
      }
    | null
    | undefined,
) {
  if (!result) {
    return null;
  }

  const candidates = [
    result.fixed_fee,
    result.fee_amount,
    result.sale_fee?.fixed_fee,
    result.sale_fee?.fee_amount,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "number" && candidate > 0) {
      return candidate;
    }
  }

  return null;
}

function readBillingMarketplaceCommission(
  result:
    | {
        sale_fee?: MercadoLivreBillingDetailFeeResponse;
      }
    | null
    | undefined,
) {
  if (!result) {
    return null;
  }

  if (typeof result.sale_fee?.net === "number" && result.sale_fee.net > 0) {
    return result.sale_fee.net;
  }

  const fixedFee = readBillingFixedFee(result);
  if (
    typeof result.sale_fee?.gross === "number" &&
    result.sale_fee.gross > 0 &&
    fixedFee !== null &&
    result.sale_fee.gross > fixedFee
  ) {
    return result.sale_fee.gross - fixedFee;
  }

  return null;
}

function readListingPriceMarketplaceCommission(
  payload: MercadoLivreListingPriceResponse | null | undefined,
) {
  if (!payload) {
    return null;
  }

  if (
    typeof payload.sale_fee_amount === "number" &&
    payload.sale_fee_amount > 0
  ) {
    return payload.sale_fee_amount;
  }

  const grossAmount = payload.sale_fee_details?.gross_amount;
  const fixedFee = payload.sale_fee_details?.fixed_fee;
  if (
    typeof grossAmount === "number" &&
    grossAmount > 0 &&
    typeof fixedFee === "number" &&
    fixedFee >= 0 &&
    grossAmount >= fixedFee
  ) {
    return grossAmount - fixedFee;
  }

  return typeof grossAmount === "number" && grossAmount > 0 ? grossAmount : null;
}

function deriveMercadoLivreSiteId(
  itemId: number | string | null | undefined,
) {
  if (!itemId) {
    return null;
  }

  const normalized = String(itemId).trim().toUpperCase();
  if (normalized.length < 3) {
    return null;
  }

  const prefix = normalized.slice(0, 3);
  return /^[A-Z]{3}$/.test(prefix) ? prefix : null;
}

function readMercadoLivreAttributeSku(
  attributes: MercadoLivreItemAttribute[] | undefined,
) {
  for (const attribute of attributes ?? []) {
    const attributeId = attribute.id?.trim().toUpperCase();
    const attributeName = attribute.name?.trim().toUpperCase();

    if (attributeId !== "SELLER_SKU" && attributeName !== "SKU") {
      continue;
    }

    const value = attribute.value_name?.trim();
    if (value) {
      return value;
    }
  }

  return null;
}

function buildMercadoLivreVariationLabel(
  attributeCombinations:
    | Array<{
        name?: string;
        value_name?: string;
      }>
    | undefined,
) {
  const labels = (attributeCombinations ?? [])
    .map((attribute) => {
      const name = attribute.name?.trim();
      const value = attribute.value_name?.trim();
      return name && value ? `${name}: ${value}` : null;
    })
    .filter((value): value is string => value !== null);

  return labels.length > 0 ? labels.join(", ") : null;
}

function toOptionalString(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function resolveMercadoLivreReturnQuantity(
  item: MercadoLivreOrderItemResponse,
) {
  const candidates = [item.quantity_refunded, item.quantity_cancelled];

  for (const candidate of candidates) {
    if (
      typeof candidate === "number" &&
      Number.isFinite(candidate) &&
      candidate > 0
    ) {
      return Math.max(0, Math.trunc(candidate));
    }
  }

  return 0;
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
      input.mode === "manual_range"
        ? input.range.startAt
        : input.cursor &&
            typeof input.cursor === "object" &&
            typeof input.cursor.orderedAfter === "string"
          ? input.cursor.orderedAfter
          : null;
    const orderedBefore =
      input.mode === "manual_range" ? input.range.endAt : null;

    const orders = await this.fetchOrders({
      accessToken: input.connection.accessToken,
      accountId,
      orderedAfter,
      orderedBefore,
    });

    const products = dedupeProducts(
      orders.flatMap((order) =>
        order.items
          .filter((item) => item.externalProductId !== null)
          .map<IntegrationSyncProduct>((item) => ({
            externalProductId: item.externalProductId ?? "",
            metadata: {
              source: "mercadolivre-order-item",
              variationId: item.variationId ?? null,
            },
            sku: item.sku ?? null,
            title: item.title ?? null,
          })),
      ),
    );

    const nextOrderedAfter =
      input.mode === "manual_range"
        ? null
        : orders.reduce<string | null>((latest, order) => {
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
        : input.mode === "incremental"
          ? input.cursor
          : null,
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
      "id,title,price,status,seller_sku,seller_custom_field,attributes,pictures,variations",
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
    const itemTitle = item.title?.trim() || `Produto Mercado Livre ${itemId}`;

    const products: IntegrationCatalogProduct[] = [
      {
        externalProductId: itemId,
        images: itemImages.map((picture) => picture.url),
        isActive: item.status === "active",
        metadata: { itemId, variationId: null },
        sellingPrice: toDecimalString(item.price),
        sku: this.resolveCatalogSku({
          fallbackSku: `ML-${itemId}`,
          attributes: item.attributes,
          sellerCustomField: item.seller_custom_field,
          sellerSku: item.seller_sku,
        }),
        title: itemTitle,
      },
    ];

    if (variations.length === 0) {
      return products;
    }

    for (const variation of variations) {
      if (variation.id === undefined || variation.id === null) {
        continue;
      }

      const variationId = String(variation.id);
      const variationLabel = buildMercadoLivreVariationLabel(
        variation.attribute_combinations,
      );
      const images = (variation.picture_ids ?? [])
        .map((pictureId) => itemImageById.get(pictureId))
        .filter((url): url is string => Boolean(url));

      products.push({
        externalProductId: `${itemId}:${variationId}`,
        images:
          images.length > 0 ? images : itemImages.map((picture) => picture.url),
        isActive: item.status === "active",
        metadata: { itemId, variationId },
        sellingPrice: toDecimalString(variation.price ?? item.price),
        sku: this.resolveCatalogSku({
          fallbackSku: `ML-${itemId}-${variationId}`,
          attributes: variation.attributes,
          sellerCustomField: variation.seller_custom_field,
          sellerSku: variation.seller_sku,
        }),
        title: variationLabel ?? itemTitle,
      });
    }

    return products;
  }

  private resolveCatalogSku(input: {
    attributes?: MercadoLivreItemAttribute[];
    fallbackSku: string;
    sellerCustomField?: string | null;
    sellerSku?: string | null;
  }) {
    return (
      readMercadoLivreAttributeSku(input.attributes) ??
      input.sellerSku?.trim() ??
      input.sellerCustomField?.trim() ??
      input.fallbackSku
    );
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
    orderedBefore: string | null;
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
      collected.push(
        ...pageOrders.filter((order) => {
          if (!input.orderedBefore || !order.orderedAt) {
            return true;
          }

          return order.orderedAt <= input.orderedBefore;
        }),
      );
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
    const returnQuantityBySku: Record<string, number> = {};

    const items = (order.order_items ?? []).map<IntegrationSyncOrderItem>(
      (item) => {
        const itemId = toOptionalString(item.item?.id);
        const variationId = toOptionalString(
          item.item?.variation_id ?? item.variation_id,
        );
        const externalProductId =
          itemId && variationId ? `${itemId}:${variationId}` : itemId;
        const sku = item.item?.seller_sku ?? null;

        if (externalProductId) {
          skuByExternalProductId[externalProductId] = sku;
          titleByExternalProductId[externalProductId] =
            item.item?.title ?? null;
        }

        const returnedQuantity = resolveMercadoLivreReturnQuantity(item);

        if (sku && returnedQuantity > 0) {
          returnQuantityBySku[sku] =
            (returnQuantityBySku[sku] ?? 0) + returnedQuantity;
        }

        const quantity =
          typeof item.quantity === "number" && item.quantity > 0
            ? item.quantity
            : 1;
        const unitPrice = toDecimalString(item.unit_price);

        return {
          externalProductId,
          metadata:
            returnedQuantity > 0
              ? {
                  returnQuantity: returnedQuantity,
                }
              : {},
          quantity,
          sku,
          totalPrice: toDecimalString((Number(unitPrice) || 0) * quantity),
          title: item.item?.title ?? null,
          unitPrice,
          variationId,
        };
      },
    );

    const fees = await this.resolveOrderFees(order, input);

    return {
      currency: order.currency_id ?? "BRL",
      externalOrderId: String(order.id ?? ""),
      fees,
      items,
      metadata: {
        returnQuantityBySku,
        skuByExternalProductId,
        tags: order.tags ?? [],
        titleByExternalProductId,
      },
      orderedAt: order.date_closed ?? order.date_created ?? null,
      status: order.status ?? "imported",
      totalAmount: toDecimalString(order.total_amount),
    };
  }

  private async resolveOrderFees(
    order: MercadoLivreOrderResponse,
    input: {
      accessToken: string;
      sellerAccountId: string;
    },
  ) {
    const hasShipmentLookup = Boolean(order.shipping?.id);
    const initialFees = await this.collectOrderFees(order, input);

    if (this.hasCompleteFeeCoverage(initialFees) || !order.id) {
      return initialFees;
    }

    // The search payload can omit fee fields for some orders, so hydrate the
    // order detail once before giving up on commission/fixed/shipping data.
    const detailedOrder = await this.fetchOrderDetails({
      accessToken: input.accessToken,
      orderId: String(order.id),
    });

    if (!detailedOrder) {
      return initialFees;
    }

    const detailedFees = await this.collectOrderFees(
      {
        ...order,
        currency_id: detailedOrder.currency_id ?? order.currency_id,
        date_closed: detailedOrder.date_closed ?? order.date_closed,
        date_created: detailedOrder.date_created ?? order.date_created,
        order_items: detailedOrder.order_items ?? order.order_items,
        payments: detailedOrder.payments ?? order.payments,
        shipping: detailedOrder.shipping ?? order.shipping,
        shipping_cost:
          detailedOrder.shipping_cost !== undefined
            ? detailedOrder.shipping_cost
            : order.shipping_cost,
        status: detailedOrder.status ?? order.status,
        tags: detailedOrder.tags ?? order.tags,
        total_amount:
          detailedOrder.total_amount !== undefined
            ? detailedOrder.total_amount
            : order.total_amount,
      },
      input,
      {
        skipShipmentLookup: hasShipmentLookup,
      },
    );
    const mergedDetailedFees = this.hasFeeType(detailedFees, "shipping_cost")
      ? detailedFees
      : [
          ...detailedFees,
          ...initialFees.filter((fee) => fee.feeType === "shipping_cost"),
        ];

    const hasGrossSourceCommission = mergedDetailedFees.some((fee) => {
      if (fee.feeType !== "marketplace_commission") {
        return false;
      }

      return (
        fee.metadata &&
        typeof fee.metadata === "object" &&
        "source" in fee.metadata &&
        (fee.metadata.source === "order_items.sale_fee" ||
          fee.metadata.source === "payment.marketplace_fee")
      );
    });
    const needsBillingBreakdown =
      hasGrossSourceCommission || !this.hasFeeType(mergedDetailedFees, "fixed_fee");
    const billingFeeBreakdown = needsBillingBreakdown
      ? await this.fetchBillingFeeBreakdown({
          accessToken: input.accessToken,
          order,
          fallbackDate: detailedOrder.date_closed ?? detailedOrder.date_created,
        })
      : null;
    const listingPriceFeeBreakdown =
      hasGrossSourceCommission &&
      (!billingFeeBreakdown ||
        billingFeeBreakdown.marketplaceCommission === null ||
        billingFeeBreakdown.fixedFee === null)
        ? await this.fetchListingPriceFeeBreakdown({
            accessToken: input.accessToken,
            order: {
              ...order,
              order_items: detailedOrder.order_items ?? order.order_items,
            },
          })
        : null;
    const feeBreakdown =
      billingFeeBreakdown &&
      (billingFeeBreakdown.marketplaceCommission !== null ||
        billingFeeBreakdown.fixedFee !== null)
        ? billingFeeBreakdown
        : listingPriceFeeBreakdown;

    const adjustedFees = mergedDetailedFees.map((fee) => {
      if (
        fee.feeType !== "marketplace_commission" ||
        !feeBreakdown ||
        feeBreakdown.marketplaceCommission === null
      ) {
        return fee;
      }

      const source =
        fee.metadata &&
        typeof fee.metadata === "object" &&
        "source" in fee.metadata &&
        (fee.metadata.source === "order_items.sale_fee" ||
          fee.metadata.source === "payment.marketplace_fee");
        const feeAmount = Number(fee.amount);
        const grossMatchesBilling =
          source &&
          typeof feeBreakdown.grossAmount === "number" &&
          Math.abs(feeAmount - feeBreakdown.grossAmount) < 0.01;

      if (!grossMatchesBilling) {
        return fee;
      }

      return {
        ...fee,
        amount: toDecimalString(feeBreakdown.marketplaceCommission),
        metadata: {
          ...fee.metadata,
          source:
            feeBreakdown === billingFeeBreakdown
              ? "billing.sale_fee.net"
              : "listing_prices.sale_fee_amount",
        },
      };
    });

    if (!feeBreakdown || feeBreakdown.fixedFee === null) {
      return adjustedFees;
    }

    if (this.hasFeeType(adjustedFees, "fixed_fee")) {
      return adjustedFees;
    }

    return [
      ...adjustedFees,
      {
        amount: toDecimalString(feeBreakdown.fixedFee),
        currency: order.currency_id ?? detailedOrder.currency_id ?? "BRL",
        feeType: "fixed_fee",
        metadata: {
          source:
            feeBreakdown === billingFeeBreakdown
              ? "billing/integration/periods"
              : "listing_prices.fixed_fee_fallback",
        },
      },
    ];
  }

  private async collectOrderFees(
    order: MercadoLivreOrderResponse,
    input: {
      accessToken: string;
      sellerAccountId: string;
    },
    options: {
      skipShipmentLookup?: boolean;
    } = {},
  ) {
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
      const quantity =
        typeof item.quantity === "number" && item.quantity > 0
          ? item.quantity
          : 1;
      const saleFee = typeof item.sale_fee === "number" ? item.sale_fee : 0;

      return sum + saleFee * quantity;
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

    const shippingCost = await this.resolveShippingCost(order, input, options);

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

    return fees;
  }

  private hasCompleteFeeCoverage(fees: IntegrationSyncFee[]) {
    return (
      this.hasFeeType(fees, "marketplace_commission") &&
      this.hasFeeType(fees, "fixed_fee") &&
      this.hasFeeType(fees, "shipping_cost")
    );
  }

  private hasFeeType(
    fees: IntegrationSyncFee[],
    feeType: IntegrationSyncFee["feeType"],
  ) {
    return fees.some((fee) => fee.feeType === feeType);
  }

  private async resolveShippingCost(
    order: MercadoLivreOrderResponse,
    input: {
      accessToken: string;
      sellerAccountId: string;
    },
    options: {
      skipShipmentLookup?: boolean;
    } = {},
  ) {
    const shipmentId = order.shipping?.id ? String(order.shipping.id) : null;

    if (shipmentId && !options.skipShipmentLookup) {
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

  private async fetchOrderDetails(input: {
    accessToken: string;
    orderId: string;
  }) {
    const url = new URL(
      `https://api.mercadolibre.com/orders/${encodeURIComponent(input.orderId)}`,
    );

    const response = await this.fetchWithRetry(url, {
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        accept: "application/json",
      },
      method: "GET",
    });

    const payload = (await parseProviderResponse(response)) as
      | MercadoLivreOrderDetailResponse
      | string;

    if (!response.ok || typeof payload === "string") {
      return null;
    }

    return payload;
  }

  private async fetchBillingFeeBreakdown(input: {
    accessToken: string;
    fallbackDate: string | null | undefined;
    order: MercadoLivreOrderResponse;
  }) {
    const periodKey = toBillingPeriodKey(
      input.fallbackDate ?? input.order.date_closed ?? input.order.date_created,
    );

    if (!periodKey || !input.order.id) {
      return null;
    }

    const url = new URL(
      `https://api.mercadolibre.com/billing/integration/periods/key/${encodeURIComponent(periodKey)}/group/MP/details`,
    );
    url.searchParams.set("document_type", "BILL");
    url.searchParams.set("limit", "1000");
    url.searchParams.set("from_id", "0");

    const response = await this.fetchWithRetry(url, {
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        accept: "application/json",
        "x-version": "2",
      },
      method: "GET",
    });

    const payload = (await parseProviderResponse(response)) as
      | MercadoLivreBillingDetailResponse
      | string;

    if (!response.ok || typeof payload === "string") {
      return null;
    }

    const orderId = String(input.order.id);
    const matchedResult =
      payload.results?.find((result) => {
        const candidateIds = [
          result.order_id !== undefined ? String(result.order_id) : null,
          result.operation_id !== undefined
            ? String(result.operation_id)
            : null,
        ].filter((value): value is string => Boolean(value));

        return candidateIds.includes(orderId);
      }) ?? null;

    const fixedFee = readBillingFixedFee(matchedResult);
    const marketplaceCommission = readBillingMarketplaceCommission(matchedResult);
    const grossAmount =
      typeof matchedResult?.sale_fee?.gross === "number" &&
      matchedResult.sale_fee.gross > 0
        ? matchedResult.sale_fee.gross
        : null;

    if (fixedFee === null && marketplaceCommission === null && grossAmount === null) {
      return null;
    }

    return {
      fixedFee: fixedFee !== null && fixedFee > 0 ? fixedFee : null,
      grossAmount,
      marketplaceCommission,
    };
  }

  private async fetchListingPriceFeeBreakdown(input: {
    accessToken: string;
    order: MercadoLivreOrderResponse;
  }) {
    const cache = new Map<
      string,
      {
        fixedFee: number | null;
        marketplaceCommission: number | null;
      } | null
    >();
    let grossAmount = 0;
    let fixedFee = 0;
    let marketplaceCommission = 0;
    let hasBreakdown = false;

    for (const item of input.order.order_items ?? []) {
      const quantity =
        typeof item.quantity === "number" && item.quantity > 0
          ? item.quantity
          : 1;
      const grossSaleFee =
        typeof item.sale_fee === "number" && item.sale_fee > 0
          ? item.sale_fee
          : null;
      const unitPrice =
        typeof item.unit_price === "number" && item.unit_price > 0
          ? item.unit_price
          : null;
      const listingTypeId = item.listing_type_id?.trim();
      const categoryId = item.item?.category_id?.trim();
      const siteId = deriveMercadoLivreSiteId(item.item?.id);

      if (
        grossSaleFee === null ||
        unitPrice === null ||
        !listingTypeId ||
        !categoryId ||
        !siteId
      ) {
        continue;
      }

      const cacheKey = `${siteId}:${listingTypeId}:${categoryId}:${unitPrice.toFixed(2)}`;
      if (!cache.has(cacheKey)) {
        cache.set(
          cacheKey,
          await this.fetchListingPriceBreakdown({
            accessToken: input.accessToken,
            categoryId,
            listingTypeId,
            price: unitPrice,
            siteId,
          }),
        );
      }

      const listingPriceBreakdown = cache.get(cacheKey) ?? null;
      if (!listingPriceBreakdown?.marketplaceCommission) {
        continue;
      }

      const unitMarketplaceCommission =
        listingPriceBreakdown.marketplaceCommission;
      const unitFixedFee =
        listingPriceBreakdown.fixedFee !== null &&
        listingPriceBreakdown.fixedFee > 0
          ? listingPriceBreakdown.fixedFee
          : grossSaleFee > unitMarketplaceCommission
            ? grossSaleFee - unitMarketplaceCommission
            : 0;

      hasBreakdown = true;
      grossAmount += grossSaleFee * quantity;
      marketplaceCommission += unitMarketplaceCommission * quantity;
      fixedFee += unitFixedFee * quantity;
    }

    if (!hasBreakdown) {
      return null;
    }

    return {
      fixedFee: fixedFee > 0 ? fixedFee : null,
      grossAmount: grossAmount > 0 ? grossAmount : null,
      marketplaceCommission:
        marketplaceCommission > 0 ? marketplaceCommission : null,
    };
  }

  private async fetchListingPriceBreakdown(input: {
    accessToken: string;
    categoryId: string;
    listingTypeId: string;
    price: number;
    siteId: string;
  }) {
    const url = new URL(
      `https://api.mercadolibre.com/sites/${encodeURIComponent(input.siteId)}/listing_prices`,
    );
    url.searchParams.set("price", String(input.price));
    url.searchParams.set("listing_type_id", input.listingTypeId);
    url.searchParams.set("category_id", input.categoryId);

    const response = await this.fetchWithRetry(url, {
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        accept: "application/json",
      },
      method: "GET",
    });

    const payload = (await parseProviderResponse(response)) as
      | MercadoLivreListingPriceResponse
      | string;

    if (!response.ok || typeof payload === "string") {
      return null;
    }

    const marketplaceCommission =
      readListingPriceMarketplaceCommission(payload);
    const fixedFee =
      typeof payload.sale_fee_details?.fixed_fee === "number" &&
      payload.sale_fee_details.fixed_fee > 0
        ? payload.sale_fee_details.fixed_fee
        : null;

    if (marketplaceCommission === null && fixedFee === null) {
      return null;
    }

    return {
      fixedFee,
      marketplaceCommission,
    };
  }

  private async fetchShipmentSellerCost(input: {
    accessToken: string;
    sellerAccountId: string;
    shipmentId: string;
  }) {
    const response = await this.fetchWithRetry(
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
      | MercadoLivreShipmentCostsResponse
      | string;

    if (response.ok && typeof payload !== "string") {
      const matchedSender =
        payload.senders?.find(
          (sender) => String(sender.user_id ?? "") === input.sellerAccountId,
        ) ??
        payload.senders?.[0] ??
        null;

      if (typeof matchedSender?.cost === "number" && matchedSender.cost > 0) {
        return matchedSender.cost;
      }

      if (
        typeof payload.receiver?.cost === "number" &&
        payload.receiver.cost > 0
      ) {
        return payload.receiver.cost;
      }
    }

    const shipmentDetailResponse = await this.fetchWithRetry(
      `https://api.mercadolibre.com/shipments/${input.shipmentId}`,
      {
        headers: {
          Authorization: `Bearer ${input.accessToken}`,
          accept: "application/json",
        },
        method: "GET",
      },
    );

    const shipmentDetail = (await parseProviderResponse(
      shipmentDetailResponse,
    )) as MercadoLivreShipmentDetailResponse | string;

    if (!shipmentDetailResponse.ok || typeof shipmentDetail === "string") {
      return null;
    }

    if (
      typeof shipmentDetail.order_cost === "number" &&
      shipmentDetail.order_cost > 0
    ) {
      return shipmentDetail.order_cost;
    }

    return typeof shipmentDetail.shipping_option?.cost === "number" &&
      shipmentDetail.shipping_option.cost > 0
      ? shipmentDetail.shipping_option.cost
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
