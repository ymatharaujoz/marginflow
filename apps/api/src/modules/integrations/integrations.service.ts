import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { randomBytes } from "node:crypto";
import {
  externalProducts,
  marketplaceConnections,
  type DatabaseClient,
  type MarketplaceConnection,
} from "@marginflow/database";
import type {
  IntegrationConnectionRecord,
  IntegrationConnectResponse,
  IntegrationProviderSlug,
  SyncedProductActionResult,
  SyncedProductRecord,
} from "@marginflow/types";
import { and, desc, eq } from "drizzle-orm";
import type { ApiRuntimeEnv } from "@/common/config/api-env";
import { API_RUNTIME_ENV, DATABASE_CLIENT } from "@/common/tokens";
import { ProductsService } from "@/modules/products/products.service";
import { SyncService } from "@/modules/sync/sync.service";
import {
  createSignedIntegrationState,
  readSignedIntegrationState,
} from "./integration-state";
import { listSyncedProductsReadModel } from "./synced-products.read-model";
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

type MercadoLivreNotification = {
  _id?: string;
  application_id?: string | number;
  attempts?: number;
  resource?: string;
  sent?: string;
  topic?: string;
  user_id?: string | number;
};

type ShopeeCallbackQuery = {
  code?: string;
  shop_id?: string | number;
  state?: string;
};

type ShopeeNotification = {
  code?: number;
  data?: Record<string, unknown>;
  shop_id?: string | number;
  timestamp?: number;
};

type ExternalProductOrderItemRow = Awaited<
  ReturnType<IntegrationsService["requireSyncedExternalProduct"]>
>["orderItems"][number];

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

@Injectable()
export class IntegrationsService {
  private readonly providers: IntegrationProvider[];
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(
    @Inject(DATABASE_CLIENT)
    private readonly db: DatabaseClient,
    @Inject(ProductsService)
    private readonly productsService: ProductsService,
    @Inject(SyncService)
    private readonly syncService: SyncService,
    @Inject(API_RUNTIME_ENV)
    private readonly env: ApiRuntimeEnv,
  ) {
    this.providers = createIntegrationProviders(env);
  }

  private getStateSecret() {
    return this.env.AUTH_SESSION_SECRET ?? this.env.BETTER_AUTH_SECRET ?? this.env.STRIPE_WEBHOOK_SECRET;
  }

  private createCodeVerifier() {
    return randomBytes(32).toString("base64url");
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
      const codeVerifier =
        providerSlug === "mercadolivre" && this.env.MERCADOLIVRE_USE_PKCE
          ? this.createCodeVerifier()
          : undefined;
      const state = createSignedIntegrationState(
        {
          codeVerifier,
          organizationId,
          provider: providerSlug,
        },
        this.getStateSecret(),
      );
      const authorization = await provider.createAuthorization({
        codeVerifier,
        organizationId,
        state,
      });
      const callbackHost =
        providerSlug === "mercadolivre" ? new URL(this.getMercadoLivreRedirectUri()).host : "n/a";

      this.logger.log(
        `Starting ${providerSlug} authorization flow (callbackHost=${callbackHost}, statePresent=${state ? "yes" : "no"}, pkce=${codeVerifier ? "enabled" : "disabled"})`,
      );

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
      this.logger.log(
        `Mercado Livre callback received (hasCode=${query.code ? "yes" : "no"}, hasError=${query.error ? "yes" : "no"}, hasState=${query.state ? "yes" : "no"})`,
      );
      if (query.error) {
        throw new IntegrationProviderError(
          query.error_description?.trim() ||
            "O Mercado Livre recusou a solicitação de conexão",
          "callback_rejected",
        );
      }

      if (!query.code || !query.state) {
        throw new IntegrationProviderError(
          "A resposta do Mercado Livre não incluiu o state e o code obrigatórios",
          "callback_invalid",
        );
      }

      const state = readSignedIntegrationState(query.state, this.getStateSecret());

      if (state.provider !== "mercadolivre") {
        throw new IntegrationProviderError(
          "O state retornado não corresponde ao provedor esperado (Mercado Livre)",
          "callback_invalid",
        );
      }

      const provider = this.getProvider("mercadolivre");
      const connection = await provider.exchangeCode(query.code, {
        codeVerifier: state.codeVerifier,
      });

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
        provider: "mercadolivre",
        status: "success",
      });
    } catch (error) {
      const message =
        error instanceof IntegrationProviderError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Falha ao conectar o Mercado Livre";

      return this.buildRedirectUrl(baseRedirect, {
        message,
        provider: "mercadolivre",
        status: "error",
      });
    }
  }

  async handleShopeeCallback(query: ShopeeCallbackQuery) {
    const baseRedirect = `${this.env.WEB_APP_ORIGIN.replace(/\/$/, "")}/app/integrations`;

    try {
      if (!query.code || !query.state || query.shop_id === undefined) {
        throw new IntegrationProviderError(
          "A resposta da Shopee não incluiu code, shop_id e state obrigatórios",
          "callback_invalid",
        );
      }

      const state = readSignedIntegrationState(query.state, this.getStateSecret());
      if (state.provider !== "shopee") {
        throw new IntegrationProviderError(
          "O state retornado não corresponde ao provedor esperado (Shopee)",
          "callback_invalid",
        );
      }

      const provider = this.getProvider("shopee");
      const connection = await provider.exchangeCode(query.code, {
        externalAccountId: String(query.shop_id),
      });

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
          provider: "shopee",
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
        provider: "shopee",
        status: "success",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Falha ao conectar a Shopee";
      return this.buildRedirectUrl(baseRedirect, {
        message,
        provider: "shopee",
        status: "error",
      });
    }
  }

  async handleShopeeNotification(input: {
    authorization: string;
    body: ShopeeNotification;
    rawBody: Buffer;
  }) {
    const provider = this.getProvider("shopee");
    const callbackUrl =
      this.env.SHOPEE_WEBHOOK_URL ??
      `${(this.env.API_PUBLIC_BASE_URL ?? this.env.BETTER_AUTH_URL ?? "http://localhost:4000").replace(/\/$/, "")}/integrations/shopee/webhook`;

    if (
      !provider.verifyWebhookSignature ||
      !provider.verifyWebhookSignature({
        authorization: input.authorization,
        callbackUrl,
        rawBody: input.rawBody,
      })
    ) {
      throw new UnauthorizedException("Assinatura do webhook Shopee inválida");
    }

    return this.syncService.handleShopeeNotification({
      code: input.body.code,
      data: input.body.data,
      shopId: input.body.shop_id,
      timestamp: input.body.timestamp,
    });
  }

  async handleMercadoLivreNotification(
    body: MercadoLivreNotification,
    route = "/integrations/mercadolivre/webhook",
  ) {
    const result = await this.syncService.handleMercadoLivreNotification({
      applicationId: body.application_id,
      attempts: body.attempts,
      notificationId: body._id,
      resource: body.resource,
      sent: body.sent,
      topic: body.topic,
      userId: body.user_id,
    });

    this.logger.log(
      `Mercado Livre notification received: route=${route} topic=${body.topic ?? "unknown"} resource=${body.resource ?? "unknown"} userId=${body.user_id ?? "unknown"} status=${result.status} reason=${result.reason}`,
    );

    if (result.status !== "started" && result.status !== "rerun_marked") {
      this.logger.log(
        `Ignored Mercado Livre notification: route=${route} reason=${result.reason ?? "unknown"} topic=${result.summary.topic ?? "unknown"} resource=${result.summary.resource ?? "unknown"} userId=${result.summary.userId ?? "unknown"} summary=${JSON.stringify(result.summary)}`,
      );
    }

    return result;
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

    const productRows = await this.db.query.products.findMany({
      orderBy: (table) => [desc(table.createdAt)],
      where: (table) => eq(table.organizationId, organizationId),
    });

    return listSyncedProductsReadModel({
      db: this.db,
      organizationId,
      productsList: productRows,
      providerSlug,
    });
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
        "Este produto sincronizado já está vinculado a um produto do catálogo",
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
        "Este produto sincronizado já foi importado para o catálogo",
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
      "Produto sincronizado importado para o catálogo",
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
        "Este produto sincronizado já foi importado como produto interno do catálogo",
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
        "Produto sincronizado j\u00e1 vinculado ao cat\u00e1logo selecionado",
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
      "Produto sincronizado vinculado ao produto existente",
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
      "Produto sincronizado marcado para revisão posterior",
    );
  }

  private buildRedirectUrl(
    baseRedirect: string,
    input: {
      message?: string;
      provider: IntegrationProviderSlug;
      status: "error" | "success";
    },
  ) {
    const url = new URL(baseRedirect);
    if (input.message) {
      url.searchParams.set("message", input.message);
    }
    url.searchParams.set("provider", input.provider);
    url.searchParams.set("status", input.status);

    return url.toString();
  }

  private getProvider(providerSlug: IntegrationProviderSlug) {
    const provider = this.providers.find((entry) => entry.provider === providerSlug);

    if (!provider) {
      throw new NotFoundException(`Provedor de integração não suportado: "${providerSlug}"`);
    }

    return provider;
  }

  private getMercadoLivreRedirectUri() {
    const apiBaseUrl =
      this.env.API_PUBLIC_BASE_URL ??
      this.env.BETTER_AUTH_URL ??
      "http://localhost:4000";

    return (
      this.env.MERCADOLIVRE_REDIRECT_URI ??
      `${apiBaseUrl.replace(/\/$/, "")}/integrations/mercadolivre/callback`
    );
  }

  private assertSyncProductProvider(providerSlug: IntegrationProviderSlug) {
    if (providerSlug !== "mercadolivre" && providerSlug !== "shopee") {
      throw new BadRequestException(
        "Marketplace não suporta produtos sincronizados",
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
      throw new NotFoundException("Produto sincronizado não encontrado");
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
          connectLabel: "Indisponível",
          connectedAccountId: null,
          connectedAccountLabel: null,
          disconnectAvailable: false,
          disconnectLabel: null,
          displayName: provider.displayName,
          lastSyncedAt: null,
          provider: provider.provider,
          status: "unavailable",
          statusMessage:
            "As credenciais do provedor ainda não estão configuradas no ambiente da API",
          tokenExpiresAt: null,
        };
      }

      return {
        connectAvailable: true,
        connectLabel: "Conectar conta",
        connectedAccountId: null,
        connectedAccountLabel: null,
        disconnectAvailable: false,
        disconnectLabel: null,
        displayName: provider.displayName,
        lastSyncedAt: null,
        provider: provider.provider,
        status: "disconnected",
        statusMessage: "Nenhuma conta do marketplace está conectada ainda",
        tokenExpiresAt: null,
      };
    }

    const expired = isExpired(row.tokenExpiresAt);
    const canRefresh = Boolean(provider.refreshAccessToken && row.refreshToken);
    const connected = row.status === "connected" && (!expired || canRefresh);
    const needsReconnect = row.status === "connected" && expired && !canRefresh;

    return {
      connectAvailable: provider.isConfigured(),
      connectLabel:
        connected && provider.isConfigured()
          ? "Renovar autorização"
          : needsReconnect && provider.isConfigured()
            ? "Reconectar conta"
            : provider.isConfigured()
              ? "Conectar conta"
              : "Indisponível",
      connectedAccountId: row.externalAccountId ?? null,
      connectedAccountLabel: accountLabel,
      disconnectAvailable: row.status !== "disconnected",
      disconnectLabel: row.status !== "disconnected" ? "Desconectar" : null,
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
        ? "Conta conectada e pronta para sincronizar"
        : needsReconnect
          ? "O token armazenado expirou. Reconecte este provedor antes da próxima sincronização"
          : provider.isConfigured()
            ? "Conta desconectada."
            : "Faltam credenciais do provedor; não é possível reconectar neste momento",
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
      throw new NotFoundException("Produto sincronizado não encontrado");
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
}
