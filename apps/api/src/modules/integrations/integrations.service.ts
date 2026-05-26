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

      const state = readSignedIntegrationState(query.state, this.env.BETTER_AUTH_SECRET);

      if (state.provider !== "mercadolivre") {
        throw new IntegrationProviderError(
          "O state retornado não corresponde ao provedor esperado (Mercado Livre)",
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

  private assertSyncProductProvider(providerSlug: IntegrationProviderSlug) {
    if (providerSlug !== "mercadolivre") {
      throw new BadRequestException(
        "Por enquanto, só há produtos sincronizados do Mercado Livre neste workspace",
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
    const connected = row.status === "connected" && !expired;
    const needsReconnect = row.status === "connected" && expired;

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
