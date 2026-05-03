import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  externalProducts,
  marketplaceConnections,
  type DatabaseClient,
  type ExternalOrder,
  type ExternalOrderItem,
  type ExternalProduct,
  type MarketplaceConnection,
  type Product,
} from "@marginflow/database";
import type {
  IntegrationConnectionRecord,
  IntegrationConnectResponse,
  IntegrationProviderSlug,
  SyncedProductActionResult,
  SyncedProductLinkedProduct,
  SyncedProductRecord,
  SyncedProductReviewStatus,
  SyncedProductSuggestedMatch,
} from "@marginflow/types";
import { and, desc, eq } from "drizzle-orm";
import type { ApiRuntimeEnv } from "@/common/config/api-env";
import { API_RUNTIME_ENV, DATABASE_CLIENT } from "@/common/tokens";
import { ProductsService } from "@/modules/products/products.service";
import {
  createSignedIntegrationState,
  readSignedIntegrationState,
} from "./integration-state";
import { createIntegrationProviders } from "./provider-registry";
import {
  IntegrationProviderError,
  type IntegrationProvider,
} from "./integrations.types";

type CallbackQuery = {
  code?: string;
  error?: string;
  error_description?: string;
  state?: string;
};

type ExternalProductOrderItemRow = ExternalOrderItem & {
  externalOrder: ExternalOrder | null;
};

type SyncedExternalProductRow = ExternalProduct & {
  linkedProduct: Product | null;
  orderItems: ExternalProductOrderItemRow[];
};

function toIsoString(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
}

function isExpired(value: Date | string | null | undefined) {
  if (!value) {
    return false;
  }

  const date = value instanceof Date ? value : new Date(value);
  return date.getTime() <= Date.now();
}

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

function normalizeSku(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  return normalized.length > 0 ? normalized : null;
}

@Injectable()
export class IntegrationsService {
  private readonly providers: IntegrationProvider[];

  constructor(
    @Inject(DATABASE_CLIENT)
    private readonly db: DatabaseClient,
    @Inject(ProductsService)
    private readonly productsService: ProductsService,
    @Inject(API_RUNTIME_ENV)
    private readonly env: ApiRuntimeEnv,
  ) {
    this.providers = createIntegrationProviders(env);
  }

  async listConnections(organizationId: string): Promise<IntegrationConnectionRecord[]> {
    const existingRows = await this.db.query.marketplaceConnections.findMany({
      where: (table) => eq(table.organizationId, organizationId),
    });
    const rowsByProvider = new Map(existingRows.map((row) => [row.provider, row] as const));

    return this.providers.map((provider) =>
      this.toConnectionRecord(provider, rowsByProvider.get(provider.provider) ?? null),
    );
  }

  async createConnectUrl(
    organizationId: string,
    providerSlug: IntegrationProviderSlug,
  ): Promise<IntegrationConnectResponse> {
    const provider = this.getProvider(providerSlug);

    try {
      const state = createSignedIntegrationState(
        {
          organizationId,
          provider: providerSlug,
        },
        this.env.BETTER_AUTH_SECRET,
      );
      const authorization = await provider.createAuthorization({
        organizationId,
        state,
      });

      return {
        authorizationUrl: authorization.authorizationUrl,
        provider: providerSlug,
      };
    } catch (error) {
      this.rethrowProviderError(error);
    }
  }

  async handleMercadoLivreCallback(query: CallbackQuery) {
    const baseRedirect = `${this.env.WEB_APP_ORIGIN.replace(/\/$/, "")}/app/integrations`;

    try {
      if (query.error) {
        throw new IntegrationProviderError(
          query.error_description?.trim() || "Mercado Livre rejected the connection request.",
          "callback_rejected",
        );
      }

      if (!query.code || !query.state) {
        throw new IntegrationProviderError(
          "Mercado Livre callback did not include the required state and code.",
          "callback_invalid",
        );
      }

      const state = readSignedIntegrationState(query.state, this.env.BETTER_AUTH_SECRET);

      if (state.provider !== "mercadolivre") {
        throw new IntegrationProviderError(
          "Mercado Livre callback state does not match the expected provider.",
          "callback_invalid",
        );
      }

      const provider = this.getProvider("mercadolivre");
      const connection = await provider.exchangeCode(query.code);

      await this.db
        .insert(marketplaceConnections)
        .values({
          accessToken: connection.accessToken,
          externalAccountId: connection.connectedAccountId,
          metadata: {
            ...connection.metadata,
            connectedAccountLabel: connection.connectedAccountLabel,
          },
          organizationId: state.organizationId,
          provider: provider.provider,
          refreshToken: connection.refreshToken,
          status: "connected",
          tokenExpiresAt: connection.tokenExpiresAt,
        })
        .onConflictDoUpdate({
          set: {
            accessToken: connection.accessToken,
            externalAccountId: connection.connectedAccountId,
            lastSyncedAt: null,
            metadata: {
              ...connection.metadata,
              connectedAccountLabel: connection.connectedAccountLabel,
            },
            refreshToken: connection.refreshToken,
            status: "connected",
            tokenExpiresAt: connection.tokenExpiresAt,
            updatedAt: new Date(),
          },
          target: [
            marketplaceConnections.organizationId,
            marketplaceConnections.provider,
          ],
        });

      return this.buildRedirectUrl(baseRedirect, {
        message: "Mercado Livre connected successfully.",
        provider: "mercadolivre",
        status: "success",
      });
    } catch (error) {
      const message =
        error instanceof IntegrationProviderError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Mercado Livre connection failed.";

      return this.buildRedirectUrl(baseRedirect, {
        message,
        provider: "mercadolivre",
        status: "error",
      });
    }
  }

  async disconnectProvider(
    organizationId: string,
    providerSlug: IntegrationProviderSlug,
  ) {
    const provider = this.getProvider(providerSlug);
    const existing = await this.db.query.marketplaceConnections.findFirst({
      where: (table) =>
        and(eq(table.organizationId, organizationId), eq(table.provider, providerSlug)),
    });

    await provider.disconnect(existing ?? null);

    if (existing) {
      const [updatedRow] = await this.db
        .update(marketplaceConnections)
        .set({
          accessToken: null,
          externalAccountId: null,
          metadata: {
            ...(existing.metadata ?? {}),
            connectedAccountLabel: null,
          },
          refreshToken: null,
          status: "disconnected",
          tokenExpiresAt: null,
          updatedAt: new Date(),
        })
        .where(eq(marketplaceConnections.id, existing.id))
        .returning();

      return this.toConnectionRecord(provider, updatedRow);
    }

    const [createdRow] = await this.db
      .insert(marketplaceConnections)
      .values({
        organizationId,
        provider: providerSlug,
        status: "disconnected",
      })
      .returning();

    return this.toConnectionRecord(provider, createdRow);
  }

  async listSyncedProducts(
    organizationId: string,
    providerSlug: IntegrationProviderSlug,
  ): Promise<SyncedProductRecord[]> {
    this.assertSyncProductProvider(providerSlug);

    const [externalProductRows, productRows] = await Promise.all([
      this.db.query.externalProducts.findMany({
        orderBy: (table) => [desc(table.updatedAt), desc(table.createdAt)],
        where: (table) =>
          and(eq(table.organizationId, organizationId), eq(table.provider, providerSlug)),
        with: {
          linkedProduct: true,
          orderItems: {
            with: {
              externalOrder: true,
            },
          },
        },
      }),
      this.db.query.products.findMany({
        orderBy: (table) => [desc(table.createdAt)],
        where: (table) => eq(table.organizationId, organizationId),
      }),
    ]);

    return externalProductRows.map((row) => this.toSyncedProductRecord(row, productRows));
  }

  async importSyncedProduct(
    organizationId: string,
    providerSlug: IntegrationProviderSlug,
    externalProductId: string,
  ): Promise<SyncedProductActionResult> {
    this.assertSyncProductProvider(providerSlug);

    const externalProduct = await this.requireSyncedExternalProduct(
      organizationId,
      providerSlug,
      externalProductId,
    );

    if (
      externalProduct.linkedProductId &&
      externalProduct.reviewStatus === "linked_to_existing_product"
    ) {
      throw new ConflictException(
        "This synced product is already linked to an existing catalog product.",
      );
    }

    if (
      externalProduct.linkedProductId &&
      externalProduct.reviewStatus === "imported_as_internal_product"
    ) {
      return this.buildSyncedProductActionResult(
        organizationId,
        providerSlug,
        externalProductId,
        "This synced product was already imported into the catalog.",
      );
    }

    const sellingPrice = this.selectLatestUnitPrice(externalProduct.orderItems) ?? "0.00";
    const createdProduct = await this.productsService.createProduct(organizationId, {
      isActive: true,
      name: externalProduct.title?.trim() || `Produto Mercado Livre ${externalProduct.externalProductId}`,
      sellingPrice,
      sku: externalProduct.sku,
    });

    await this.db
      .update(externalProducts)
      .set({
        linkedProductId: createdProduct.id,
        reviewStatus: "imported_as_internal_product",
        updatedAt: new Date(),
      })
      .where(eq(externalProducts.id, externalProduct.id));

    return this.buildSyncedProductActionResult(
      organizationId,
      providerSlug,
      externalProductId,
      "Produto sincronizado importado para o cat\u00e1logo.",
    );
  }

  async linkSyncedProduct(
    organizationId: string,
    providerSlug: IntegrationProviderSlug,
    externalProductId: string,
    productId: string,
  ): Promise<SyncedProductActionResult> {
    this.assertSyncProductProvider(providerSlug);

    const externalProduct = await this.requireSyncedExternalProduct(
      organizationId,
      providerSlug,
      externalProductId,
    );
    const product = await this.productsService.requireProductAccess(organizationId, productId);

    if (
      externalProduct.reviewStatus === "imported_as_internal_product" &&
      externalProduct.linkedProductId &&
      externalProduct.linkedProductId !== product.id
    ) {
      throw new ConflictException(
        "This synced product was already imported as an internal catalog product.",
      );
    }

    if (
      externalProduct.linkedProductId === product.id &&
      externalProduct.reviewStatus === "linked_to_existing_product"
    ) {
      return this.buildSyncedProductActionResult(
        organizationId,
        providerSlug,
        externalProductId,
        "Produto sincronizado j\u00e1 vinculado ao cat\u00e1logo selecionado.",
      );
    }

    await this.db
      .update(externalProducts)
      .set({
        linkedProductId: product.id,
        reviewStatus: "linked_to_existing_product",
        updatedAt: new Date(),
      })
      .where(eq(externalProducts.id, externalProduct.id));

    return this.buildSyncedProductActionResult(
      organizationId,
      providerSlug,
      externalProductId,
      "Produto sincronizado vinculado ao produto existente.",
    );
  }

  async ignoreSyncedProduct(
    organizationId: string,
    providerSlug: IntegrationProviderSlug,
    externalProductId: string,
  ): Promise<SyncedProductActionResult> {
    this.assertSyncProductProvider(providerSlug);
    await this.requireSyncedExternalProduct(organizationId, providerSlug, externalProductId);

    await this.db
      .update(externalProducts)
      .set({
        linkedProductId: null,
        reviewStatus: "ignored",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(externalProducts.organizationId, organizationId),
          eq(externalProducts.provider, providerSlug),
          eq(externalProducts.externalProductId, externalProductId),
        ),
      );

    return this.buildSyncedProductActionResult(
      organizationId,
      providerSlug,
      externalProductId,
      "Produto sincronizado marcado para revis\u00e3o posterior.",
    );
  }

  private buildRedirectUrl(
    baseRedirect: string,
    input: {
      message: string;
      provider: IntegrationProviderSlug;
      status: "error" | "success";
    },
  ) {
    const url = new URL(baseRedirect);
    url.searchParams.set("message", input.message);
    url.searchParams.set("provider", input.provider);
    url.searchParams.set("status", input.status);

    return url.toString();
  }

  private getProvider(providerSlug: IntegrationProviderSlug) {
    const provider = this.providers.find((entry) => entry.provider === providerSlug);

    if (!provider) {
      throw new NotFoundException(`Unsupported integration provider "${providerSlug}".`);
    }

    return provider;
  }

  private assertSyncProductProvider(providerSlug: IntegrationProviderSlug) {
    if (providerSlug !== "mercadolivre") {
      throw new BadRequestException(
        "Only Mercado Livre synced products are available in this workspace right now.",
      );
    }
  }

  private async buildSyncedProductActionResult(
    organizationId: string,
    providerSlug: IntegrationProviderSlug,
    externalProductId: string,
    message: string,
  ): Promise<SyncedProductActionResult> {
    const syncedProducts = await this.listSyncedProducts(organizationId, providerSlug);
    const syncedProduct = syncedProducts.find(
      (product) => product.externalProductId === externalProductId,
    );

    if (!syncedProduct) {
      throw new NotFoundException("Synced product not found.");
    }

    return {
      linkedProduct: syncedProduct.linkedProduct,
      message,
      syncedProduct,
    };
  }

  private rethrowProviderError(error: unknown): never {
    if (error instanceof IntegrationProviderError) {
      switch (error.code) {
        case "provider_not_configured":
          throw new ServiceUnavailableException(error.message);
        case "callback_invalid":
        case "callback_rejected":
        case "remote_request_failed":
          throw new BadRequestException(error.message);
        default:
          throw new NotFoundException(error.message);
      }
    }

    throw error;
  }

  private toConnectionRecord(
    provider: IntegrationProvider,
    row: MarketplaceConnection | null,
  ): IntegrationConnectionRecord {
    const accountLabel =
      row?.metadata &&
      typeof row.metadata === "object" &&
      "connectedAccountLabel" in row.metadata &&
      typeof row.metadata.connectedAccountLabel === "string"
        ? row.metadata.connectedAccountLabel
        : null;

    if (!row) {
      if (!provider.isConfigured()) {
        return {
          connectAvailable: false,
          connectLabel: "Unavailable",
          connectedAccountId: null,
          connectedAccountLabel: null,
          disconnectAvailable: false,
          disconnectLabel: null,
          displayName: provider.displayName,
          lastSyncedAt: null,
          provider: provider.provider,
          status: "unavailable",
          statusMessage: "Provider credentials are not configured in the API environment yet.",
          tokenExpiresAt: null,
        };
      }

      return {
        connectAvailable: true,
        connectLabel: "Connect account",
        connectedAccountId: null,
        connectedAccountLabel: null,
        disconnectAvailable: false,
        disconnectLabel: null,
        displayName: provider.displayName,
        lastSyncedAt: null,
        provider: provider.provider,
        status: "disconnected",
        statusMessage: "No marketplace account is connected yet.",
        tokenExpiresAt: null,
      };
    }

    const expired = isExpired(row.tokenExpiresAt);
    const connected = row.status === "connected" && !expired;
    const needsReconnect = row.status === "connected" && expired;

    return {
      connectAvailable: provider.isConfigured(),
      connectLabel:
        connected && provider.isConfigured()
          ? "Reconnect account"
          : needsReconnect && provider.isConfigured()
            ? "Reconnect account"
            : provider.isConfigured()
              ? "Connect account"
              : "Unavailable",
      connectedAccountId: row.externalAccountId ?? null,
      connectedAccountLabel: accountLabel,
      disconnectAvailable: row.status !== "disconnected",
      disconnectLabel: row.status !== "disconnected" ? "Disconnect" : null,
      displayName: provider.displayName,
      lastSyncedAt: toIsoString(row.lastSyncedAt),
      provider: provider.provider,
      status: connected
        ? "connected"
        : needsReconnect
          ? "needs_reconnect"
          : provider.isConfigured() || row.status === "disconnected"
            ? "disconnected"
            : "unavailable",
      statusMessage: connected
        ? "Account connected and ready for sync."
        : needsReconnect
          ? "Stored token expired. Reconnect this provider before the next sync."
          : provider.isConfigured()
            ? "Account disconnected."
            : "Provider credentials are missing, so reconnect is unavailable right now.",
      tokenExpiresAt: toIsoString(row.tokenExpiresAt),
    };
  }

  private async requireSyncedExternalProduct(
    organizationId: string,
    providerSlug: IntegrationProviderSlug,
    externalProductId: string,
  ) {
    const row =
      (await this.db.query.externalProducts.findFirst({
        where: (table) =>
          and(
            eq(table.organizationId, organizationId),
            eq(table.provider, providerSlug),
            eq(table.externalProductId, externalProductId),
          ),
        with: {
          linkedProduct: true,
          orderItems: {
            with: {
              externalOrder: true,
            },
          },
        },
      })) ?? null;

    if (!row) {
      throw new NotFoundException("Synced product not found.");
    }

    return row;
  }

  private selectLatestUnitPrice(orderItems: ExternalProductOrderItemRow[]) {
    const latestItem = [...orderItems].sort((left, right) => {
      const leftTime = left.externalOrder?.orderedAt?.getTime() ?? left.updatedAt.getTime();
      const rightTime = right.externalOrder?.orderedAt?.getTime() ?? right.updatedAt.getTime();
      return rightTime - leftTime;
    })[0];

    return latestItem ? toDecimalString(latestItem.unitPrice) : null;
  }

  private toLinkedProductSummary(product: Product | null): SyncedProductLinkedProduct | null {
    if (!product) {
      return null;
    }

    return {
      id: product.id,
      isActive: product.isActive,
      name: product.name,
      sku: product.sku,
    };
  }

  private toSuggestedMatches(
    externalProduct: ExternalProduct,
    productsList: Product[],
    reviewStatus: SyncedProductReviewStatus,
  ): SyncedProductSuggestedMatch[] {
    if (
      externalProduct.linkedProductId ||
      reviewStatus === "ignored" ||
      reviewStatus === "imported_as_internal_product"
    ) {
      return [];
    }

    const normalizedExternalSku = normalizeSku(externalProduct.sku);

    if (!normalizedExternalSku) {
      return [];
    }

    return productsList
      .filter((product) => normalizeSku(product.sku) === normalizedExternalSku)
      .slice(0, 3)
      .map((product) => ({
        isActive: product.isActive,
        name: product.name,
        productId: product.id,
        reason: "sku_exact",
        sku: product.sku,
      }));
  }

  private toSyncedProductRecord(
    row: SyncedExternalProductRow,
    productsList: Product[],
  ): SyncedProductRecord {
    const uniqueOrderIds = new Set<string>();
    let unitsSold = 0;
    let grossRevenue = 0;
    let lastOrderedAt: string | null = null;

    for (const item of row.orderItems) {
      uniqueOrderIds.add(item.externalOrderId);
      unitsSold += item.quantity;
      grossRevenue += Number(item.totalPrice) || 0;

      const orderedAt = item.externalOrder?.orderedAt ?? null;
      const orderedAtIso = orderedAt ? orderedAt.toISOString() : null;

      if (orderedAtIso && (!lastOrderedAt || orderedAtIso > lastOrderedAt)) {
        lastOrderedAt = orderedAtIso;
      }
    }

    return {
      externalProductId: row.externalProductId,
      grossRevenue: toDecimalString(grossRevenue),
      id: row.id,
      lastOrderedAt,
      latestUnitPrice: this.selectLatestUnitPrice(row.orderItems),
      linkedProduct: this.toLinkedProductSummary(row.linkedProduct),
      orderCount: uniqueOrderIds.size,
      provider: row.provider as IntegrationProviderSlug,
      reviewStatus: row.reviewStatus as SyncedProductReviewStatus,
      sku: row.sku,
      suggestedMatches: this.toSuggestedMatches(
        row,
        productsList,
        row.reviewStatus as SyncedProductReviewStatus,
      ),
      title: row.title,
      unitsSold,
    };
  }
}
