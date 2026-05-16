import type { ApiRuntimeEnv } from "@/common/config/api-env";
import {
  IntegrationProviderError,
  type IntegrationProvider,
  type IntegrationProviderAuthorization,
  type IntegrationProviderCallbackResult,
  type IntegrationProviderContext,
  type IntegrationSyncContext,
  type IntegrationSyncFee,
  type IntegrationSyncOrder,
  type IntegrationSyncOrderItem,
  type IntegrationSyncProduct,
  type IntegrationSyncResult,
} from "../integrations.types";

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

export class MercadoLivreProvider implements IntegrationProvider {
  readonly displayName = "Mercado Livre";
  readonly provider = "mercadolivre" as const;

  constructor(private readonly env: ApiRuntimeEnv) {}

  isConfigured() {
    return Boolean(this.env.MERCADOLIVRE_CLIENT_ID && this.env.MERCADOLIVRE_CLIENT_SECRET);
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

    return {
      authorizationUrl: url.toString(),
    };
  }

  async exchangeCode(code: string): Promise<IntegrationProviderCallbackResult> {
    if (!this.isConfigured()) {
      throw new IntegrationProviderError(
        "Mercado Livre is not configured in the API environment.",
        "provider_not_configured",
      );
    }

    const tokenResponse = await fetch("https://api.mercadolibre.com/oauth/token", {
      body: new URLSearchParams({
        client_id: this.env.MERCADOLIVRE_CLIENT_ID ?? "",
        client_secret: this.env.MERCADOLIVRE_CLIENT_SECRET ?? "",
        code,
        grant_type: "authorization_code",
        redirect_uri: this.getRedirectUri(),
      }),
      headers: {
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    });

    const tokenPayload = (await parseProviderResponse(tokenResponse)) as
      | MercadoLivreTokenResponse
      | string;

    if (!tokenResponse.ok || typeof tokenPayload === "string" || !tokenPayload.access_token) {
      throw new IntegrationProviderError(
        `Mercado Livre token exchange failed.${
          typeof tokenPayload === "string"
            ? ` ${tokenPayload}`
            : tokenPayload && "message" in tokenPayload && typeof tokenPayload.message === "string"
              ? ` ${tokenPayload.message}`
              : ""
        }`,
        "remote_request_failed",
      );
    }

    const profileResponse = await fetch("https://api.mercadolibre.com/users/me", {
      headers: {
        Authorization: `Bearer ${tokenPayload.access_token}`,
        accept: "application/json",
      },
      method: "GET",
    });
    const profilePayload = (await parseProviderResponse(profileResponse)) as
      | MercadoLivreProfileResponse
      | string;

    if (!profileResponse.ok || typeof profilePayload === "string" || !profilePayload.id) {
      throw new IntegrationProviderError(
        `Mercado Livre account lookup failed.${
          typeof profilePayload === "string" ? ` ${profilePayload}` : ""
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
          .trim() || null),
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

  async syncOrders(input: IntegrationSyncContext): Promise<IntegrationSyncResult> {
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

      return latest === null || order.orderedAt > latest ? order.orderedAt : latest;
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

    const items = (order.order_items ?? []).map<IntegrationSyncOrderItem>((item) => {
      const externalProductId = item.item?.id ? String(item.item.id) : null;

      if (externalProductId) {
        skuByExternalProductId[externalProductId] = item.item?.seller_sku ?? null;
        titleByExternalProductId[externalProductId] = item.item?.title ?? null;
      }

      const quantity = typeof item.quantity === "number" && item.quantity > 0 ? item.quantity : 1;
      const unitPrice = toDecimalString(item.unit_price);

      return {
        externalProductId,
        quantity,
        sku: item.item?.seller_sku ?? null,
        totalPrice: toDecimalString((Number(unitPrice) || 0) * quantity),
        title: item.item?.title ?? null,
        unitPrice,
      };
    });

    const fees: IntegrationSyncFee[] = [];

    const paymentMarketplaceFee = (order.payments ?? []).reduce((sum, payment) => {
      return sum + (typeof payment.marketplace_fee === "number" ? payment.marketplace_fee : 0);
    }, 0);
    const itemSaleFee = (order.order_items ?? []).reduce((sum, item) => {
      return sum + (typeof item.sale_fee === "number" ? item.sale_fee : 0);
    }, 0);
    const marketplaceCommission =
      paymentMarketplaceFee > 0 ? paymentMarketplaceFee : itemSaleFee > 0 ? itemSaleFee : 0;

    if (marketplaceCommission > 0) {
      fees.push({
        amount: toDecimalString(marketplaceCommission),
        currency: order.currency_id ?? "BRL",
        feeType: "marketplace_commission",
        metadata: {
          source: paymentMarketplaceFee > 0 ? "payment.marketplace_fee" : "order_items.sale_fee",
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

    const paymentShippingCost = (order.payments ?? []).reduce((sum, payment) => {
      return sum + (typeof payment.shipping_cost === "number" ? payment.shipping_cost : 0);
    }, 0);

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
    const response = await fetch(`https://api.mercadolibre.com/shipments/${input.shipmentId}/costs`, {
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        accept: "application/json",
        "x-format-new": "true",
      },
      method: "GET",
    });

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
      payload.senders?.find((sender) => String(sender.user_id ?? "") === input.sellerAccountId) ??
      payload.senders?.[0] ??
      null;

    return typeof matchedSender?.cost === "number" && matchedSender.cost > 0
      ? matchedSender.cost
      : null;
  }

  private getRedirectUri() {
    return (
      this.env.MERCADOLIVRE_REDIRECT_URI ??
      `${this.env.BETTER_AUTH_URL.replace(/\/$/, "")}/integrations/mercadolivre/callback`
    );
  }
}
