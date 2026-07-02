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
  productImages,
  products,
  type DatabaseClient,
  type MarketplaceConnection,
} from "@lucreii/database";
import type {
  IntegrationConnectionRecord,
  IntegrationConnectResponse,
  IntegrationProviderSlug,
  MarketplaceCatalogImportResult,
  SyncedProductActionResult,
  SyncedProductRecord,
} from "@lucreii/types";
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

type SheinCallbackQuery = {
  code?: string;
  seller_id?: string | number;
  state?: string;
};

type SheinNotification = {
  event?: string;
  order_id?: string | number;
  seller_id?: string | number;
  shop_id?: string | number;
  timestamp?: number;
};

type ExternalProductOrderItemRow = Awaited<
  ReturnType<IntegrationsService["requireSyncedExternalProduct"]>
>["orderItems"][number];
type SyncedExternalProductRow = Awaited<
  ReturnType<IntegrationsService["requireSyncedExternalProduct"]>
>;

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
  const normalized = value?.trim().toUpperCase();
  return normalized ? normalized : null;
}

function extractMercadoLivreItemId(externalProductId: string) {
  const [itemId] = externalProductId.split(":");
  return itemId?.trim() ? itemId.trim() : null;
}

function readMercadoLivreExternalProductMetadata(
  externalProduct: Pick<
    SyncedExternalProductRow,
    "externalProductId" | "metadata" | "provider"
  >,
) {
  if (externalProduct.provider !== "mercadolivre") {
    return {
      hasVariations: false,
      isVariation: false,
      itemId: null,
      variationId: null,
    };
  }

  const metadata = externalProduct.metadata;
  const itemId =
    metadata &&
    typeof metadata === "object" &&
    "itemId" in metadata &&
    typeof metadata.itemId === "string" &&
    metadata.itemId.trim().length > 0
      ? metadata.itemId.trim()
      : extractMercadoLivreItemId(externalProduct.externalProductId);
  const variationId =
    metadata &&
    typeof metadata === "object" &&
    "variationId" in metadata &&
    typeof metadata.variationId === "string" &&
    metadata.variationId.trim().length > 0
      ? metadata.variationId.trim()
      : null;

  return {
    hasVariations: variationId !== null,
    isVariation:
      variationId !== null || externalProduct.externalProductId.includes(":"),
    itemId,
    variationId,
  };
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
    return (
      this.env.AUTH_SESSION_SECRET ??
      this.env.BETTER_AUTH_SECRET ??
      this.env.STRIPE_WEBHOOK_SECRET
    );
  }

  private createCodeVerifier() {
    return randomBytes(32).toString("base64url");
  }

  async listConnections(
    organizationId: string,
    companyId: string,
  ): Promise<IntegrationConnectionRecord[]> {
    const existingRows = await this.db.query.marketplaceConnections.findMany({
      where: (table) =>
        and(
          eq(table.organizationId, organizationId),
          eq(table.companyId, companyId),
        ),
    });
    const rowsByProvider = new Map(
      existingRows.map((row) => [row.provider, row] as const),
    );

    return this.providers.map((provider) =>
      this.toConnectionRecord(
        provider,
        rowsByProvider.get(provider.provider) ?? null,
      ),
    );
  }

  async createConnectUrl(
    organizationId: string,
    companyId: string,
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
          companyId,
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
        providerSlug === "mercadolivre"
          ? new URL(this.getMercadoLivreRedirectUri()).host
          : "n/a";

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
        `Mercado Livre callback received (hasCode=${query.code ? "yes" : "no"}, code=${query.code ?? "missing"}, hasError=${query.error ? "yes" : "no"}, hasState=${query.state ? "yes" : "no"})`,
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

      const state = readSignedIntegrationState(
        query.state,
        this.getStateSecret(),
      );

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
          companyId: state.companyId,
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
            marketplaceConnections.companyId,
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

      const state = readSignedIntegrationState(
        query.state,
        this.getStateSecret(),
      );
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
          companyId: state.companyId,
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
            marketplaceConnections.companyId,
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

  async handleSheinCallback(query: SheinCallbackQuery) {
    const baseRedirect = `${this.env.WEB_APP_ORIGIN.replace(/\/$/, "")}/app/integrations`;

    try {
      if (!query.code || !query.state || query.seller_id === undefined) {
        throw new IntegrationProviderError(
          "A resposta da Shein não incluiu code, seller_id e state obrigatórios",
          "callback_invalid",
        );
      }

      const state = readSignedIntegrationState(
        query.state,
        this.getStateSecret(),
      );
      if (state.provider !== "shein") {
        throw new IntegrationProviderError(
          "O state retornado não corresponde ao provedor esperado (Shein)",
          "callback_invalid",
        );
      }

      const provider = this.getProvider("shein");
      const connection = await provider.exchangeCode(query.code, {
        externalAccountId: String(query.seller_id),
      });

      await this.db
        .insert(marketplaceConnections)
        .values({
          accessToken: connection.accessToken,
          companyId: state.companyId,
          externalAccountId: connection.connectedAccountId,
          metadata: {
            ...connection.metadata,
            connectedAccountLabel: connection.connectedAccountLabel,
          },
          organizationId: state.organizationId,
          provider: "shein",
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
            marketplaceConnections.companyId,
            marketplaceConnections.provider,
          ],
        });

      return this.buildRedirectUrl(baseRedirect, {
        provider: "shein",
        status: "success",
      });
    } catch (error) {
      const message =
        error instanceof IntegrationProviderError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Falha ao conectar a Shein";

      return this.buildRedirectUrl(baseRedirect, {
        message,
        provider: "shein",
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
    companyId: string,
    providerSlug: IntegrationProviderSlug,
  ) {
    const provider = this.getProvider(providerSlug);
    const existing = await this.db.query.marketplaceConnections.findFirst({
      where: (table) =>
        and(
          eq(table.organizationId, organizationId),
          eq(table.companyId, companyId),
          eq(table.provider, providerSlug),
        ),
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
        companyId,
        provider: providerSlug,
        status: "disconnected",
      })
      .returning();

    return this.toConnectionRecord(provider, createdRow);
  }

  async listSyncedProducts(
    organizationId: string,
    companyId: string,
    providerSlug: IntegrationProviderSlug,
  ): Promise<SyncedProductRecord[]> {
    this.assertSyncProductProvider(providerSlug);

    const productRows = await this.db.query.products.findMany({
      orderBy: (table) => [desc(table.createdAt)],
      where: (table) =>
        and(eq(table.organizationId, organizationId), eq(table.companyId, companyId)),
    });

    return listSyncedProductsReadModel({
      db: this.db,
      companyId,
      organizationId,
      productsList: productRows,
      providerSlug,
    });
  }

  async importMarketplaceCatalog(context: {
    companyId: string;
    organizationId: string;
    providerSlug: IntegrationProviderSlug;
    userId: string;
  }): Promise<MarketplaceCatalogImportResult> {
    this.assertSyncProductProvider(context.providerSlug);
    if (context.providerSlug === "mercadolivre") {
      return this.importMercadoLivreCatalog({
        companyId: context.companyId,
        organizationId: context.organizationId,
        userId: context.userId,
      });
    }

    await this.productsService.assertCatalogImportAllowed(context);

    const provider = this.getProvider(context.providerSlug);
    const connection = await this.db.query.marketplaceConnections.findFirst({
      where: (table) =>
        and(
          eq(table.organizationId, context.organizationId),
          eq(table.companyId, context.companyId),
          eq(table.provider, context.providerSlug),
        ),
    });

    if (
      !connection ||
      connection.status !== "connected" ||
      !connection.accessToken ||
      !connection.externalAccountId ||
      isExpired(connection.tokenExpiresAt)
    ) {
      throw new UnauthorizedException(
        `Conecte novamente sua conta do ${provider.displayName} antes de importar o catálogo`,
      );
    }

    if (!provider.importCatalog) {
      throw new ServiceUnavailableException(
        `Importação de catálogo não está disponível para ${provider.displayName}`,
      );
    }

    let catalogProducts;
    try {
      catalogProducts = await provider.importCatalog({
        connection,
        organizationId: context.organizationId,
      });
    } catch (error) {
      this.rethrowProviderError(error);
    }

    const [productRows, externalProductRows, imageRows] = await Promise.all([
      this.db.query.products.findMany({
        where: (table) => eq(table.organizationId, context.organizationId),
      }),
      this.db.query.externalProducts.findMany({
        where: (table) =>
          and(
            eq(table.organizationId, context.organizationId),
            eq(table.companyId, context.companyId),
            eq(table.provider, context.providerSlug),
          ),
      }),
      this.db.query.productImages.findMany({
        where: (table) => eq(table.organizationId, context.organizationId),
      }),
    ]);
    const productsById = new Map(
      productRows.map((product) => [product.id, product] as const),
    );
    const productsBySku = new Map<string, typeof productRows>();
    for (const product of productRows) {
      const sku = normalizeSku(product.sku);
      if (sku) {
        productsBySku.set(sku, [...(productsBySku.get(sku) ?? []), product]);
      }
    }
    const externalProductsById = new Map(
      externalProductRows.map(
        (product) => [product.externalProductId, product] as const,
      ),
    );
    const imagesByProductId = new Map<string, typeof imageRows>();
    for (const image of imageRows) {
      imagesByProductId.set(image.productId, [
        ...(imagesByProductId.get(image.productId) ?? []),
        image,
      ]);
    }

    const result: MarketplaceCatalogImportResult = {
      conflicts: [],
      created: 0,
      errors: [],
      found: catalogProducts.length,
      unchanged: 0,
      updated: 0,
    };

    for (const catalogProduct of catalogProducts) {
      const externalProduct = externalProductsById.get(
        catalogProduct.externalProductId,
      );
      let matchedProduct = externalProduct?.linkedProductId
        ? productsById.get(externalProduct.linkedProductId)
        : undefined;

      if (!matchedProduct) {
        const skuMatches =
          productsBySku.get(normalizeSku(catalogProduct.sku) ?? "") ?? [];
        if (skuMatches.length > 1) {
          result.conflicts.push({
            externalProductId: catalogProduct.externalProductId,
            message: `SKU "${catalogProduct.sku}" corresponde a mais de um produto interno`,
            sku: catalogProduct.sku,
          });
          continue;
        }
        matchedProduct = skuMatches[0];
      }

      try {
        const existingProviderImages = matchedProduct
          ? (imagesByProductId.get(matchedProduct.id) ?? [])
              .filter((image) => image.source === context.providerSlug)
              .sort((left, right) => left.position - right.position)
              .map((image) => image.url)
          : [];
        const productChanged =
          !matchedProduct ||
          matchedProduct.name !== catalogProduct.title ||
          normalizeSku(matchedProduct.sku) !==
            normalizeSku(catalogProduct.sku) ||
          String(matchedProduct.sellingPrice) !== catalogProduct.sellingPrice ||
          matchedProduct.isActive !== catalogProduct.isActive;
        const imagesChanged =
          existingProviderImages.length !== catalogProduct.images.length ||
          existingProviderImages.some(
            (image, index) => image !== catalogProduct.images[index],
          );

        const storedProduct = await this.db.transaction(async (tx) => {
          let product = matchedProduct;

          if (!product) {
            [product] = await tx
              .insert(products)
              .values({
                isActive: catalogProduct.isActive,
                companyId: context.companyId,
                name: catalogProduct.title,
                organizationId: context.organizationId,
                sellingPrice: catalogProduct.sellingPrice,
                sku: normalizeSku(catalogProduct.sku),
              })
              .returning();
          } else if (productChanged) {
            [product] = await tx
              .update(products)
              .set({
                isActive: catalogProduct.isActive,
                name: catalogProduct.title,
                sellingPrice: catalogProduct.sellingPrice,
                sku: normalizeSku(catalogProduct.sku),
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(products.id, product.id),
                  eq(products.organizationId, context.organizationId),
                ),
              )
              .returning();
          }

          await tx
            .insert(externalProducts)
            .values({
              externalProductId: catalogProduct.externalProductId,
              linkedProductId: product.id,
              companyId: context.companyId,
              marketplaceConnectionId: connection.id,
              metadata: catalogProduct.metadata,
              organizationId: context.organizationId,
              provider: context.providerSlug,
              reviewStatus: matchedProduct
                ? "linked_to_existing_product"
                : "imported_as_internal_product",
              sku: catalogProduct.sku,
              title: catalogProduct.title,
            })
            .onConflictDoUpdate({
              set: {
                linkedProductId: product.id,
                marketplaceConnectionId: connection.id,
                metadata: catalogProduct.metadata,
                reviewStatus: matchedProduct
                  ? "linked_to_existing_product"
                  : "imported_as_internal_product",
                sku: catalogProduct.sku,
                title: catalogProduct.title,
                updatedAt: new Date(),
              },
              target: [
                externalProducts.organizationId,
                externalProducts.companyId,
                externalProducts.provider,
                externalProducts.externalProductId,
              ],
            })
            .returning({ id: externalProducts.id });

          if (imagesChanged) {
            await tx
              .delete(productImages)
              .where(
                and(
                  eq(productImages.productId, product.id),
                  eq(productImages.source, context.providerSlug),
                ),
              );

            if (catalogProduct.images.length > 0) {
              await tx.insert(productImages).values(
                catalogProduct.images.map((url, position) => ({
                  externalIdentifier: `${catalogProduct.externalProductId}:${position}`,
                  organizationId: context.organizationId,
                  position,
                  productId: product.id,
                  source: context.providerSlug,
                  url,
                })),
              );
            }
          }

          return product;
        });

        productsById.set(storedProduct.id, storedProduct);
        productsBySku.set(normalizeSku(storedProduct.sku) ?? "", [
          storedProduct,
        ]);
        externalProductsById.set(catalogProduct.externalProductId, {
          ...externalProduct,
          externalProductId: catalogProduct.externalProductId,
          linkedProductId: storedProduct.id,
        } as (typeof externalProductRows)[number]);
        const preservedImages = (
          imagesByProductId.get(storedProduct.id) ?? []
        ).filter((image) => image.source !== context.providerSlug);
        imagesByProductId.set(storedProduct.id, [
          ...preservedImages,
          ...(catalogProduct.images.map((url, position) => ({
            externalIdentifier: `${catalogProduct.externalProductId}:${position}`,
            position,
            productId: storedProduct.id,
            source: context.providerSlug,
            url,
          })) as typeof imageRows),
        ]);

        if (!matchedProduct) {
          result.created += 1;
        } else if (productChanged || imagesChanged) {
          result.updated += 1;
        } else {
          result.unchanged += 1;
        }
      } catch (error) {
        result.errors.push({
          externalProductId: catalogProduct.externalProductId,
          message:
            error instanceof Error
              ? error.message
              : "Falha desconhecida ao importar produto",
          sku: catalogProduct.sku,
        });
      }
    }

    return result;
  }

  async handleSheinNotification(body: SheinNotification) {
    return this.syncService.handleSheinNotification({
      event: body.event,
      orderId: body.order_id,
      sellerId: body.seller_id ?? body.shop_id,
      timestamp: body.timestamp,
    });
  }

  async importMercadoLivreCatalog(context: {
    companyId: string;
    organizationId: string;
    userId: string;
  }): Promise<MarketplaceCatalogImportResult> {
    await this.productsService.assertCatalogImportAllowed(context);

    const connection = await this.db.query.marketplaceConnections.findFirst({
      where: (table) =>
        and(
          eq(table.organizationId, context.organizationId),
          eq(table.companyId, context.companyId),
          eq(table.provider, "mercadolivre"),
        ),
    });

    if (
      !connection ||
      connection.status !== "connected" ||
      !connection.accessToken ||
      !connection.externalAccountId ||
      isExpired(connection.tokenExpiresAt)
    ) {
      throw new UnauthorizedException(
        "Conecte novamente sua conta do Mercado Livre antes de importar o catálogo",
      );
    }

    const provider = this.getProvider("mercadolivre");
    if (!provider.importCatalog) {
      throw new ServiceUnavailableException(
        "Importação de catálogo não está disponível para o Mercado Livre",
      );
    }

    let catalogProducts;
    try {
      catalogProducts = await provider.importCatalog({
        connection,
        organizationId: context.organizationId,
      });
    } catch (error) {
      this.rethrowProviderError(error);
    }

    const [productRows, externalProductRows, imageRows] = await Promise.all([
      this.db.query.products.findMany({
        where: (table) => eq(table.organizationId, context.organizationId),
      }),
      this.db.query.externalProducts.findMany({
        where: (table) =>
          and(
            eq(table.organizationId, context.organizationId),
            eq(table.companyId, context.companyId),
            eq(table.provider, "mercadolivre"),
          ),
      }),
      this.db.query.productImages.findMany({
        where: (table) => eq(table.organizationId, context.organizationId),
      }),
    ]);
    const productsById = new Map(
      productRows.map((product) => [product.id, product] as const),
    );
    const productsBySku = new Map<string, typeof productRows>();
    for (const product of productRows) {
      const sku = normalizeSku(product.sku);
      if (sku) {
        productsBySku.set(sku, [...(productsBySku.get(sku) ?? []), product]);
      }
    }
    const externalProductsById = new Map(
      externalProductRows.map(
        (product) => [product.externalProductId, product] as const,
      ),
    );
    const imagesByProductId = new Map<string, typeof imageRows>();
    for (const image of imageRows) {
      imagesByProductId.set(image.productId, [
        ...(imagesByProductId.get(image.productId) ?? []),
        image,
      ]);
    }

    const result: MarketplaceCatalogImportResult = {
      conflicts: [],
      created: 0,
      errors: [],
      found: catalogProducts.length,
      unchanged: 0,
      updated: 0,
    };
    let shouldRematerialize = false;

    for (const catalogProduct of catalogProducts) {
      const externalProduct = externalProductsById.get(
        catalogProduct.externalProductId,
      );
      let matchedProduct = externalProduct?.linkedProductId
        ? productsById.get(externalProduct.linkedProductId)
        : undefined;

      if (!matchedProduct) {
        const skuMatches =
          productsBySku.get(normalizeSku(catalogProduct.sku) ?? "") ?? [];
        if (skuMatches.length > 1) {
          result.conflicts.push({
            externalProductId: catalogProduct.externalProductId,
            message: `SKU "${catalogProduct.sku}" corresponde a mais de um produto interno`,
            sku: catalogProduct.sku,
          });
          continue;
        }
        matchedProduct = skuMatches[0];
      }

      try {
        const existingMercadoLivreImages = matchedProduct
          ? (imagesByProductId.get(matchedProduct.id) ?? [])
              .filter((image) => image.source === "mercadolivre")
              .sort((left, right) => left.position - right.position)
              .map((image) => image.url)
          : [];
        const currentInternalSku = normalizeSku(matchedProduct?.sku);
        const desiredInternalSku =
          currentInternalSku ?? normalizeSku(catalogProduct.sku);
        const productChanged =
          !matchedProduct ||
          matchedProduct.name !== catalogProduct.title ||
          currentInternalSku !== desiredInternalSku ||
          String(matchedProduct.sellingPrice) !== catalogProduct.sellingPrice ||
          matchedProduct.isActive !== catalogProduct.isActive;
        const imagesChanged =
          existingMercadoLivreImages.length !== catalogProduct.images.length ||
          existingMercadoLivreImages.some(
            (image, index) => image !== catalogProduct.images[index],
          );

        const storedProduct = await this.db.transaction(async (tx) => {
          let product = matchedProduct;

          if (!product) {
            [product] = await tx
              .insert(products)
              .values({
                isActive: catalogProduct.isActive,
                companyId: context.companyId,
                name: catalogProduct.title,
                organizationId: context.organizationId,
                sellingPrice: catalogProduct.sellingPrice,
                sku: desiredInternalSku,
              })
              .returning();
          } else if (productChanged) {
            [product] = await tx
              .update(products)
              .set({
                isActive: catalogProduct.isActive,
                name: catalogProduct.title,
                sellingPrice: catalogProduct.sellingPrice,
                sku: desiredInternalSku,
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(products.id, product.id),
                  eq(products.organizationId, context.organizationId),
                ),
              )
              .returning();
          }

          await tx
            .insert(externalProducts)
            .values({
              externalProductId: catalogProduct.externalProductId,
              linkedProductId: product.id,
              companyId: context.companyId,
              marketplaceConnectionId: connection.id,
              metadata: catalogProduct.metadata,
              organizationId: context.organizationId,
              provider: "mercadolivre",
              reviewStatus: matchedProduct
                ? "linked_to_existing_product"
                : "imported_as_internal_product",
              sku: catalogProduct.sku,
              title: catalogProduct.title,
            })
            .onConflictDoUpdate({
              set: {
                linkedProductId: product.id,
                marketplaceConnectionId: connection.id,
                metadata: catalogProduct.metadata,
                reviewStatus: matchedProduct
                  ? "linked_to_existing_product"
                  : "imported_as_internal_product",
                sku: catalogProduct.sku,
                title: catalogProduct.title,
                updatedAt: new Date(),
              },
              target: [
                externalProducts.organizationId,
                externalProducts.companyId,
                externalProducts.provider,
                externalProducts.externalProductId,
              ],
            })
            .returning({ id: externalProducts.id });

          if (imagesChanged) {
            await tx
              .delete(productImages)
              .where(
                and(
                  eq(productImages.productId, product.id),
                  eq(productImages.source, "mercadolivre"),
                ),
              );

            if (catalogProduct.images.length > 0) {
              await tx.insert(productImages).values(
                catalogProduct.images.map((url, position) => ({
                  externalIdentifier: `${catalogProduct.externalProductId}:${position}`,
                  organizationId: context.organizationId,
                  position,
                  productId: product.id,
                  source: "mercadolivre",
                  url,
                })),
              );
            }
          }

          return product;
        });
        const linkChanged = externalProduct?.linkedProductId !== storedProduct.id;
        const internalSkuChanged =
          normalizeSku(matchedProduct?.sku) !== normalizeSku(storedProduct.sku);

        productsById.set(storedProduct.id, storedProduct);
        productsBySku.set(normalizeSku(storedProduct.sku) ?? "", [
          storedProduct,
        ]);
        externalProductsById.set(catalogProduct.externalProductId, {
          ...externalProduct,
          externalProductId: catalogProduct.externalProductId,
          linkedProductId: storedProduct.id,
        } as (typeof externalProductRows)[number]);
        const preservedImages = (
          imagesByProductId.get(storedProduct.id) ?? []
        ).filter((image) => image.source !== "mercadolivre");
        imagesByProductId.set(storedProduct.id, [
          ...preservedImages,
          ...(catalogProduct.images.map((url, position) => ({
            externalIdentifier: `${catalogProduct.externalProductId}:${position}`,
            position,
            productId: storedProduct.id,
            source: "mercadolivre",
            url,
          })) as typeof imageRows),
        ]);

        if (!matchedProduct) {
          result.created += 1;
        } else if (productChanged || imagesChanged) {
          result.updated += 1;
        } else {
          result.unchanged += 1;
        }

        if (!shouldRematerialize && (!matchedProduct || linkChanged || internalSkuChanged)) {
          shouldRematerialize = true;
        }
      } catch (error) {
        result.errors.push({
          externalProductId: catalogProduct.externalProductId,
          message:
            error instanceof Error
              ? error.message
              : "Falha desconhecida ao importar produto",
          sku: catalogProduct.sku,
        });
      }
    }

    if (shouldRematerialize) {
      await this.syncService.rematerializeProviderMetrics({
        companyId: context.companyId,
        organizationId: context.organizationId,
        providerSlug: "mercadolivre",
        userId: context.userId,
      });
    }

    return result;
  }

  async importSyncedProduct(
    organizationId: string,
    companyId: string,
    providerSlug: IntegrationProviderSlug,
    externalProductId: string,
  ): Promise<SyncedProductActionResult> {
    this.assertSyncProductProvider(providerSlug);

    const externalProduct = await this.requireSyncedExternalProduct(
      organizationId,
      companyId,
      providerSlug,
      externalProductId,
    );
    const importContext = await this.resolveSyncedProductImportContext({
      companyId,
      externalProduct,
      organizationId,
      providerSlug,
    });

    if (
      !importContext.isFamilyImport &&
      externalProduct.linkedProductId &&
      externalProduct.reviewStatus === "linked_to_existing_product"
    ) {
      throw new ConflictException(
        "Este produto sincronizado já está vinculado a um produto do catálogo",
      );
    }

    if (
      !importContext.isFamilyImport &&
      externalProduct.linkedProductId &&
      externalProduct.reviewStatus === "imported_as_internal_product"
    ) {
      return this.buildSyncedProductActionResult(
        organizationId,
        companyId,
        providerSlug,
        externalProductId,
        "Este produto sincronizado já foi importado para o catálogo",
      );
    }

    let importedCount = 0;

    for (const target of importContext.externalProducts) {
      if (
        target.linkedProductId &&
        (target.reviewStatus === "linked_to_existing_product" ||
          target.reviewStatus === "imported_as_internal_product")
      ) {
        continue;
      }

      const sellingPrice =
        this.selectLatestUnitPrice(target.orderItems) ?? "0.00";
      const createdProduct = await this.productsService.createProduct(
        {
          organizationId,
          selectedCompanyId: companyId,
          userId: "",
        },
        {
          isActive: true,
          name:
            target.title?.trim() ||
            `Produto ${this.getProvider(providerSlug).displayName} ${target.externalProductId}`,
          sellingPrice,
          sku: target.sku,
        },
      );

      await this.db
        .update(externalProducts)
        .set({
          linkedProductId: createdProduct.id,
          reviewStatus: "imported_as_internal_product",
          updatedAt: new Date(),
        })
        .where(eq(externalProducts.id, target.id));

      importedCount += 1;
    }

    if (importedCount === 0) {
      return this.buildSyncedProductActionResult(
        organizationId,
        companyId,
        providerSlug,
        externalProductId,
        importContext.isFamilyImport
          ? "Esta familia de produtos sincronizados ja esta importada ou vinculada ao catalogo"
          : "Este produto sincronizado ja foi importado para o catalogo",
      );
    }

    await this.syncService.rematerializeProviderMetrics({
      companyId,
      organizationId,
      providerSlug,
      userId: null,
    });

    return this.buildSyncedProductActionResult(
      organizationId,
      companyId,
      providerSlug,
      externalProductId,
      "Produto sincronizado importado para o catálogo",
    );
  }

  async linkSyncedProduct(
    organizationId: string,
    companyId: string,
    providerSlug: IntegrationProviderSlug,
    externalProductId: string,
    productId: string,
  ): Promise<SyncedProductActionResult> {
    this.assertSyncProductProvider(providerSlug);

    const externalProduct = await this.requireSyncedExternalProduct(
      organizationId,
      companyId,
      providerSlug,
      externalProductId,
    );
    const product = await this.productsService.requireProductAccess(
      organizationId,
      productId,
    );

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
        companyId,
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

    await this.syncService.rematerializeProviderMetrics({
      companyId,
      organizationId,
      providerSlug,
      userId: null,
    });

    return this.buildSyncedProductActionResult(
      organizationId,
      companyId,
      providerSlug,
      externalProductId,
      "Produto sincronizado vinculado ao produto existente",
    );
  }

  async ignoreSyncedProduct(
    organizationId: string,
    companyId: string,
    providerSlug: IntegrationProviderSlug,
    externalProductId: string,
  ): Promise<SyncedProductActionResult> {
    this.assertSyncProductProvider(providerSlug);
    await this.requireSyncedExternalProduct(
      organizationId,
      companyId,
      providerSlug,
      externalProductId,
    );

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
          eq(externalProducts.companyId, companyId),
          eq(externalProducts.provider, providerSlug),
          eq(externalProducts.externalProductId, externalProductId),
        ),
      );

    await this.syncService.rematerializeProviderMetrics({
      companyId,
      organizationId,
      providerSlug,
      userId: null,
    });

    return this.buildSyncedProductActionResult(
      organizationId,
      companyId,
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
    const provider = this.providers.find(
      (entry) => entry.provider === providerSlug,
    );

    if (!provider) {
      throw new NotFoundException(
        `Provedor de integração não suportado: "${providerSlug}"`,
      );
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
    if (
      providerSlug !== "mercadolivre" &&
      providerSlug !== "shopee" &&
      providerSlug !== "shein"
    ) {
      throw new BadRequestException(
        "Marketplace não suporta produtos sincronizados",
      );
    }
  }

  private async buildSyncedProductActionResult(
    organizationId: string,
    companyIdOrProviderSlug: string,
    providerSlugOrExternalProductId: IntegrationProviderSlug | string,
    externalProductIdOrMessage: string,
    message?: string,
  ): Promise<SyncedProductActionResult> {
    const companyId = message ? companyIdOrProviderSlug : undefined;
    const providerSlug = (
      message ? providerSlugOrExternalProductId : companyIdOrProviderSlug
    ) as IntegrationProviderSlug;
    const externalProductId = message
      ? externalProductIdOrMessage
      : (providerSlugOrExternalProductId as string);
    const resolvedMessage = message ?? externalProductIdOrMessage;
    const syncedProducts = await this.listSyncedProducts(
      organizationId,
      companyId ?? providerSlug,
      providerSlug,
    );
    const syncedProduct = syncedProducts.find(
      (product) => product.externalProductId === externalProductId,
    );

    if (!syncedProduct) {
      throw new NotFoundException("Produto sincronizado não encontrado");
    }

    return {
      linkedProduct: syncedProduct.linkedProduct,
      message: resolvedMessage,
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

  private async resolveSyncedProductImportContext(input: {
    companyId: string;
    externalProduct: SyncedExternalProductRow;
    organizationId: string;
    providerSlug: IntegrationProviderSlug;
  }) {
    const metadata = readMercadoLivreExternalProductMetadata(input.externalProduct);
    if (input.providerSlug !== "mercadolivre" || !metadata.itemId) {
      return {
        externalProducts: [input.externalProduct],
        isFamilyImport: false,
      };
    }

    await this.hydrateMercadoLivreFamilyExternalProducts(input);
    const companyProducts = await this.readCompanyExternalProducts(input);

    const familyProducts = companyProducts
      .filter((row) => {
        const rowMetadata = readMercadoLivreExternalProductMetadata(row);
        return rowMetadata.itemId === metadata.itemId;
      })
      .sort((left, right) => {
        const leftMetadata = readMercadoLivreExternalProductMetadata(left);
        const rightMetadata = readMercadoLivreExternalProductMetadata(right);

        if (leftMetadata.isVariation !== rightMetadata.isVariation) {
          return leftMetadata.isVariation ? 1 : -1;
        }

        return left.externalProductId.localeCompare(right.externalProductId);
      });

    const hasChildVariations = familyProducts.some((row) => {
      const rowMetadata = readMercadoLivreExternalProductMetadata(row);
      return rowMetadata.isVariation;
    });

    return {
      externalProducts: hasChildVariations ? familyProducts : [input.externalProduct],
      isFamilyImport: hasChildVariations,
    };
  }

  private async hydrateMercadoLivreFamilyExternalProducts(input: {
    companyId: string;
    externalProduct: SyncedExternalProductRow;
    organizationId: string;
    providerSlug: IntegrationProviderSlug;
  }) {
    if (input.providerSlug !== "mercadolivre") {
      return;
    }

    const provider = this.getProvider(input.providerSlug);
    if (!provider.importCatalogByExternalProductId) {
      return;
    }

    const connection =
      (await this.db.query.marketplaceConnections.findFirst({
        where: (table) =>
          and(
            eq(table.organizationId, input.organizationId),
            eq(table.companyId, input.companyId),
            eq(table.provider, input.providerSlug),
          ),
      })) ?? null;

    if (!connection) {
      return;
    }

    const remoteCatalogProducts = await provider.importCatalogByExternalProductId({
      connection,
      externalProductId: input.externalProduct.externalProductId,
      organizationId: input.organizationId,
    });

    for (const catalogProduct of remoteCatalogProducts) {
      await this.db
        .insert(externalProducts)
        .values({
          companyId: input.companyId,
          externalProductId: catalogProduct.externalProductId,
          linkedProductId: null,
          marketplaceConnectionId: connection.id,
          metadata: catalogProduct.metadata,
          organizationId: input.organizationId,
          provider: input.providerSlug,
          reviewStatus: "unreviewed",
          sku: catalogProduct.sku,
          title: catalogProduct.title,
        })
        .onConflictDoUpdate({
          set: {
            marketplaceConnectionId: connection.id,
            metadata: catalogProduct.metadata,
            sku: catalogProduct.sku,
            title: catalogProduct.title,
            updatedAt: new Date(),
          },
          target: [
            externalProducts.organizationId,
            externalProducts.companyId,
            externalProducts.provider,
            externalProducts.externalProductId,
          ],
        });
    }
  }

  private async readCompanyExternalProducts(input: {
    companyId: string;
    organizationId: string;
    providerSlug: IntegrationProviderSlug;
  }) {
    return (
      (await this.db.query.externalProducts.findMany({
        where: (table) =>
          and(
            eq(table.organizationId, input.organizationId),
            eq(table.companyId, input.companyId),
            eq(table.provider, input.providerSlug),
          ),
        with: {
          linkedProduct: true,
          orderItems: {
            with: {
              externalOrder: true,
            },
          },
        },
      })) ?? []
    );
  }

  private async requireSyncedExternalProduct(
    organizationId: string,
    companyId: string,
    providerSlug: IntegrationProviderSlug,
    externalProductId: string,
  ) {
    const row =
      (await this.db.query.externalProducts.findFirst({
        where: (table) =>
          and(
            eq(table.organizationId, organizationId),
            eq(table.companyId, companyId),
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
      const leftTime =
        left.externalOrder?.orderedAt?.getTime() ?? left.updatedAt.getTime();
      const rightTime =
        right.externalOrder?.orderedAt?.getTime() ?? right.updatedAt.getTime();
      return rightTime - leftTime;
    })[0];

    return latestItem ? toDecimalString(latestItem.unitPrice) : null;
  }
}
