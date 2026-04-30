import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  externalFees,
  externalOrderItems,
  externalOrders,
  externalProducts,
  marketplaceConnections,
  syncRuns,
  type DatabaseClient,
  type MarketplaceConnection,
  type SyncRun,
} from "@marginflow/database";
import type {
  IntegrationProviderSlug,
  RunSyncResponse,
  SyncAvailability,
  SyncImportCounts,
  SyncRunRecord,
  SyncStatusResponse,
} from "@marginflow/types";
import { and, desc, eq } from "drizzle-orm";
import { API_RUNTIME_ENV, DATABASE_CLIENT } from "@/common/tokens";
import type { ApiRuntimeEnv } from "@/common/config/api-env";
import { FinanceService } from "@/modules/finance/finance.service";
import { createIntegrationProviders } from "@/modules/integrations/provider-registry";
import {
  IntegrationProviderError,
  type IntegrationProvider,
  type IntegrationSyncCursor,
  type IntegrationSyncResult,
} from "@/modules/integrations/integrations.types";
import { resolveSyncWindowState } from "./sync-window";

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

function normalizeMetadataCounts(value: Record<string, unknown> | null | undefined): SyncImportCounts {
  const counts = (
    value &&
    typeof value === "object" &&
    "importCounts" in value &&
    value.importCounts &&
    typeof value.importCounts === "object"
      ? value.importCounts
      : null
  ) as Partial<Record<keyof SyncImportCounts, unknown>> | null;

  return {
    fees:
      counts && typeof counts.fees === "number" && Number.isFinite(counts.fees) ? counts.fees : 0,
    items:
      counts && typeof counts.items === "number" && Number.isFinite(counts.items)
        ? counts.items
        : 0,
    orders:
      counts && typeof counts.orders === "number" && Number.isFinite(counts.orders)
        ? counts.orders
        : 0,
    products:
      counts && typeof counts.products === "number" && Number.isFinite(counts.products)
        ? counts.products
        : 0,
  };
}

function normalizeCursor(value: Record<string, unknown> | null | undefined) {
  if (!value || typeof value !== "object" || !("resultCursor" in value)) {
    return null;
  }

  return value.resultCursor && typeof value.resultCursor === "object"
    ? (value.resultCursor as Record<string, unknown>)
    : null;
}

@Injectable()
export class SyncService {
  private readonly providers: IntegrationProvider[];

  constructor(
    @Inject(DATABASE_CLIENT)
    private readonly db: DatabaseClient,
    @Inject(API_RUNTIME_ENV)
    env: ApiRuntimeEnv,
    @Inject(FinanceService)
    private readonly financeService: FinanceService,
  ) {
    this.providers = createIntegrationProviders(env);
  }

  async getStatus(
    organizationId: string,
    providerSlug: IntegrationProviderSlug,
  ): Promise<SyncStatusResponse> {
    const provider = this.getProvider(providerSlug);
    const [connection, activeRun, lastCompletedRun] = await Promise.all([
      this.findConnection(organizationId, providerSlug),
      this.findLatestRun(organizationId, providerSlug, "processing"),
      this.findLatestRun(organizationId, providerSlug, "completed"),
    ]);

    return {
      activeRun: activeRun ? this.toRunRecord(activeRun) : null,
      availability: this.buildAvailability(provider, connection, activeRun, lastCompletedRun),
      lastCompletedRun: lastCompletedRun ? this.toRunRecord(lastCompletedRun) : null,
    };
  }

  async getHistory(organizationId: string, providerSlug: IntegrationProviderSlug) {
    const rows = await this.db.query.syncRuns.findMany({
      limit: 10,
      orderBy: (table) => [desc(table.createdAt)],
      where: (table) =>
        and(eq(table.organizationId, organizationId), eq(table.provider, providerSlug)),
    });

    return rows.map((row) => this.toRunRecord(row));
  }

  async runSync(
    organizationId: string,
    providerSlug: IntegrationProviderSlug,
  ): Promise<RunSyncResponse> {
    const provider = this.getProvider(providerSlug);
    const [connection, activeRun, lastCompletedRun] = await Promise.all([
      this.findConnection(organizationId, providerSlug),
      this.findLatestRun(organizationId, providerSlug, "processing"),
      this.findLatestRun(organizationId, providerSlug, "completed"),
    ]);
    const availability = this.buildAvailability(provider, connection, activeRun, lastCompletedRun);

    if (!availability.canRun || !connection) {
      throw this.toAvailabilityException(availability);
    }

    const [pendingRun] = await this.db
      .insert(syncRuns)
      .values({
        marketplaceConnectionId: connection.id,
        metadata: {
          requestedCursor: this.readCursorFromRun(lastCompletedRun),
        },
        organizationId,
        provider: providerSlug,
        status: "pending",
        windowKey: availability.currentWindowKey,
      })
      .returning();

    const [processingRun] = await this.db
      .update(syncRuns)
      .set({
        startedAt: new Date(),
        status: "processing",
        updatedAt: new Date(),
      })
      .where(eq(syncRuns.id, pendingRun.id))
      .returning();

    try {
      const requestedCursor = this.readCursorFromRun(lastCompletedRun);
      const syncResult = await provider.syncOrders({
        connection,
        cursor: requestedCursor,
        organizationId,
      });
      const counts = await this.persistSyncResult({
        connection,
        organizationId,
        providerSlug,
        syncResult,
        syncRunId: processingRun.id,
      });

      await this.db
        .update(marketplaceConnections)
        .set({
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(marketplaceConnections.id, connection.id));

      const [completedRun] = await this.db
        .update(syncRuns)
        .set({
          errorSummary: null,
          finishedAt: new Date(),
          metadata: {
            importCounts: counts,
            requestedCursor,
            resultCursor: syncResult.cursor,
          },
          status: "completed",
          updatedAt: new Date(),
        })
        .where(eq(syncRuns.id, processingRun.id))
        .returning();

      await this.financeService.materializeOrganizationMetrics(organizationId);

      return {
        availability: (await this.getStatus(organizationId, providerSlug)).availability,
        run: this.toRunRecord(completedRun),
      };
    } catch (error) {
      await this.db
        .update(syncRuns)
        .set({
          errorSummary: error instanceof Error ? error.message : "Sync failed.",
          finishedAt: new Date(),
          status: "failed",
          updatedAt: new Date(),
        })
        .where(eq(syncRuns.id, processingRun.id));

      this.rethrowProviderError(error);
    }
  }

  private buildAvailability(
    provider: IntegrationProvider,
    connection: MarketplaceConnection | null,
    activeRun: SyncRun | null,
    lastCompletedRun: SyncRun | null,
  ): SyncAvailability {
    const windowState = resolveSyncWindowState();
    const lastSuccessfulSyncAt =
      toIsoString(lastCompletedRun?.finishedAt) ?? toIsoString(connection?.lastSyncedAt);

    if (!provider.isConfigured()) {
      return {
        canRun: false,
        currentWindowKey: windowState.currentWindowKey,
        currentWindowLabel: windowState.currentWindowLabel,
        currentWindowSlot: windowState.currentWindowSlot,
        lastSuccessfulSyncAt,
        message: "Provider credentials are not configured in the API environment yet.",
        nextAvailableAt: windowState.nextAvailableAt,
        provider: provider.provider,
        reason: "provider_unavailable",
      };
    }

    if (!provider.supportsSync()) {
      return {
        canRun: false,
        currentWindowKey: windowState.currentWindowKey,
        currentWindowLabel: windowState.currentWindowLabel,
        currentWindowSlot: windowState.currentWindowSlot,
        lastSuccessfulSyncAt,
        message: "This provider is connected structurally but does not support live sync yet.",
        nextAvailableAt: windowState.nextAvailableAt,
        provider: provider.provider,
        reason: "provider_sync_unsupported",
      };
    }

    if (!connection || connection.status !== "connected" || !connection.accessToken) {
      return {
        canRun: false,
        currentWindowKey: windowState.currentWindowKey,
        currentWindowLabel: windowState.currentWindowLabel,
        currentWindowSlot: windowState.currentWindowSlot,
        lastSuccessfulSyncAt,
        message: "Connect this marketplace account before running the first sync.",
        nextAvailableAt: windowState.nextAvailableAt,
        provider: provider.provider,
        reason: "provider_disconnected",
      };
    }

    if (isExpired(connection.tokenExpiresAt)) {
      return {
        canRun: false,
        currentWindowKey: windowState.currentWindowKey,
        currentWindowLabel: windowState.currentWindowLabel,
        currentWindowSlot: windowState.currentWindowSlot,
        lastSuccessfulSyncAt,
        message: "Stored provider token expired. Reconnect the account before syncing again.",
        nextAvailableAt: windowState.nextAvailableAt,
        provider: provider.provider,
        reason: "provider_needs_reconnect",
      };
    }

    if (activeRun) {
      return {
        canRun: false,
        currentWindowKey: windowState.currentWindowKey,
        currentWindowLabel: windowState.currentWindowLabel,
        currentWindowSlot: windowState.currentWindowSlot,
        lastSuccessfulSyncAt,
        message: "A sync is already in progress for this provider.",
        nextAvailableAt: windowState.nextAvailableAt,
        provider: provider.provider,
        reason: "sync_in_progress",
      };
    }

    if (!windowState.syncOpen) {
      return {
        canRun: false,
        currentWindowKey: null,
        currentWindowLabel: null,
        currentWindowSlot: null,
        lastSuccessfulSyncAt,
        message: "Sync is unavailable overnight. The next daily window opens at 06:00.",
        nextAvailableAt: windowState.nextAvailableAt,
        provider: provider.provider,
        reason: "outside_window",
      };
    }

    if (lastCompletedRun?.windowKey && lastCompletedRun.windowKey === windowState.currentWindowKey) {
      return {
        canRun: false,
        currentWindowKey: windowState.currentWindowKey,
        currentWindowLabel: windowState.currentWindowLabel,
        currentWindowSlot: windowState.currentWindowSlot,
        lastSuccessfulSyncAt,
        message: "This daily sync window was already used. Wait for the next window to open.",
        nextAvailableAt: windowState.nextAvailableAt,
        provider: provider.provider,
        reason: "window_already_used",
      };
    }

    return {
      canRun: true,
      currentWindowKey: windowState.currentWindowKey,
      currentWindowLabel: windowState.currentWindowLabel,
      currentWindowSlot: windowState.currentWindowSlot,
      lastSuccessfulSyncAt,
      message: "Sync is available for the current daily window.",
      nextAvailableAt: windowState.nextAvailableAt,
      provider: provider.provider,
      reason: "available",
    };
  }

  private async persistSyncResult(input: {
    organizationId: string;
    providerSlug: IntegrationProviderSlug;
    connection: MarketplaceConnection;
    syncRunId: string;
    syncResult: IntegrationSyncResult;
  }) {
    return this.db.transaction(async (tx) => {
      const productIdsByExternalId = new Map<string, string>();

      for (const product of input.syncResult.products.filter((entry) => entry.externalProductId)) {
        const [storedProduct] = await tx
          .insert(externalProducts)
          .values({
            marketplaceConnectionId: input.connection.id,
            metadata: product.metadata,
            organizationId: input.organizationId,
            provider: input.providerSlug,
            externalProductId: product.externalProductId,
            sku: product.sku,
            title: product.title,
          })
          .onConflictDoUpdate({
            set: {
              marketplaceConnectionId: input.connection.id,
              metadata: product.metadata,
              sku: product.sku,
              title: product.title,
              updatedAt: new Date(),
            },
            target: [
              externalProducts.organizationId,
              externalProducts.provider,
              externalProducts.externalProductId,
            ],
          })
          .returning({
            id: externalProducts.id,
          });

        productIdsByExternalId.set(product.externalProductId, storedProduct.id);
      }

      let feeCount = 0;
      let itemCount = 0;

      for (const order of input.syncResult.orders) {
        const [storedOrder] = await tx
          .insert(externalOrders)
          .values({
            currency: order.currency,
            marketplaceConnectionId: input.connection.id,
            metadata: order.metadata,
            orderedAt: order.orderedAt ? new Date(order.orderedAt) : null,
            organizationId: input.organizationId,
            provider: input.providerSlug,
            status: order.status,
            syncRunId: input.syncRunId,
            totalAmount: order.totalAmount,
            externalOrderId: order.externalOrderId,
          })
          .onConflictDoUpdate({
            set: {
              currency: order.currency,
              marketplaceConnectionId: input.connection.id,
              metadata: order.metadata,
              orderedAt: order.orderedAt ? new Date(order.orderedAt) : null,
              status: order.status,
              syncRunId: input.syncRunId,
              totalAmount: order.totalAmount,
              updatedAt: new Date(),
            },
            target: [
              externalOrders.organizationId,
              externalOrders.provider,
              externalOrders.externalOrderId,
            ],
          })
          .returning({
            id: externalOrders.id,
          });

        await tx.delete(externalOrderItems).where(eq(externalOrderItems.externalOrderId, storedOrder.id));
        await tx.delete(externalFees).where(eq(externalFees.externalOrderId, storedOrder.id));

        for (const item of order.items) {
          itemCount += 1;

          await tx.insert(externalOrderItems).values({
            externalOrderId: storedOrder.id,
            externalProductId:
              item.externalProductId ? (productIdsByExternalId.get(item.externalProductId) ?? null) : null,
            organizationId: input.organizationId,
            quantity: item.quantity,
            totalPrice: item.totalPrice,
            unitPrice: item.unitPrice,
          });
        }

        for (const fee of order.fees) {
          feeCount += 1;
          await tx.insert(externalFees).values({
            amount: fee.amount,
            currency: fee.currency,
            externalOrderId: storedOrder.id,
            feeType: fee.feeType,
            metadata: fee.metadata,
            organizationId: input.organizationId,
            provider: input.providerSlug,
          });
        }
      }

      return {
        fees: feeCount,
        items: itemCount,
        orders: input.syncResult.orders.length,
        products: input.syncResult.products.length,
      } satisfies SyncImportCounts;
    });
  }

  private getProvider(providerSlug: IntegrationProviderSlug) {
    const provider = this.providers.find((entry) => entry.provider === providerSlug);

    if (!provider) {
      throw new BadRequestException(`Unsupported sync provider "${providerSlug}".`);
    }

    return provider;
  }

  private async findConnection(organizationId: string, providerSlug: IntegrationProviderSlug) {
    return (
      (await this.db.query.marketplaceConnections.findFirst({
        where: (table) =>
          and(eq(table.organizationId, organizationId), eq(table.provider, providerSlug)),
      })) ?? null
    );
  }

  private async findLatestRun(
    organizationId: string,
    providerSlug: IntegrationProviderSlug,
    status: string,
  ) {
    return (
      (await this.db.query.syncRuns.findFirst({
        orderBy: (table) => [desc(table.createdAt)],
        where: (table) =>
          and(
            eq(table.organizationId, organizationId),
            eq(table.provider, providerSlug),
            eq(table.status, status),
          ),
      })) ?? null
    );
  }

  private readCursorFromRun(run: SyncRun | null): IntegrationSyncCursor {
    if (!run?.metadata || typeof run.metadata !== "object") {
      return null;
    }

    return normalizeCursor(run.metadata as Record<string, unknown>);
  }

  private toAvailabilityException(availability: SyncAvailability) {
    switch (availability.reason) {
      case "provider_unavailable":
      case "provider_sync_unsupported":
        return new ServiceUnavailableException(availability.message);
      case "sync_in_progress":
      case "window_already_used":
        return new ConflictException(availability.message);
      default:
        return new BadRequestException(availability.message);
    }
  }

  private toRunRecord(run: SyncRun): SyncRunRecord {
    const metadata =
      run.metadata && typeof run.metadata === "object"
        ? (run.metadata as Record<string, unknown>)
        : null;

    return {
      counts: normalizeMetadataCounts(metadata),
      createdAt: run.createdAt.toISOString(),
      cursor: normalizeCursor(metadata),
      errorSummary: run.errorSummary ?? null,
      finishedAt: toIsoString(run.finishedAt),
      id: run.id,
      provider: run.provider as IntegrationProviderSlug,
      startedAt: toIsoString(run.startedAt),
      status: run.status,
      updatedAt: run.updatedAt.toISOString(),
      windowKey: run.windowKey ?? null,
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
          throw new InternalServerErrorException(error.message);
      }
    }

    throw error;
  }
}
