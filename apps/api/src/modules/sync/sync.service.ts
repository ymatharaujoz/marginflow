import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
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
} from "@lucreii/database";
import type {
  ClearSyncHistoryResponse,
  IntegrationProviderSlug,
  RunSyncResponse,
  SyncAvailability,
  SyncImportCounts,
  SyncRunOrigin,
  SyncRunRecord,
  SyncStatusResponse,
} from "@lucreii/types";
import { and, desc, eq, ne } from "drizzle-orm";
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
import { resolveSyncWindowState, resolveSyncWindowStateAtNextOpenHour } from "./sync-window";
import { SyncPerformanceMaterializerService } from "./sync-performance-materializer.service";

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

function getMetadataObject(value: Record<string, unknown> | null | undefined) {
  return value && typeof value === "object" ? value : {};
}

function normalizeRunOrigin(value: Record<string, unknown> | null | undefined): SyncRunOrigin {
  return value?.origin === "automatic" ? "automatic" : "manual";
}

function normalizeString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

type SyncTriggerSummary = {
  applicationId: string | null;
  attempts: number | null;
  notificationId: string | null;
  resource: string | null;
  sent: string | null;
  topic: string | null;
  userId: string | null;
};

type ExecuteSyncInput = {
  connection: MarketplaceConnection;
  organizationId: string;
  providerSlug: IntegrationProviderSlug;
  triggerMetadata: Record<string, unknown>;
  triggerOrigin: SyncRunOrigin;
  userId: string | null;
};

type MercadoLivreNotificationInput = {
  applicationId?: string | number;
  attempts?: number;
  notificationId?: string;
  resource?: string;
  sent?: string;
  topic?: string;
  userId?: string | number;
};

type MercadoLivreNotificationResult = {
  accepted: boolean;
  reason:
    | "active_run_pending_rerun"
    | "connection_not_found"
    | "ignored_topic"
    | "missing_user_id"
    | "provider_unavailable"
    | "provider_unsupported"
    | "started"
    | "token_expired";
  status: "ignored" | "rerun_marked" | "started";
  summary: SyncTriggerSummary;
};

type ShopeeNotificationInput = {
  code?: number;
  data?: Record<string, unknown>;
  shopId?: string | number;
  timestamp?: number;
};

@Injectable()
export class SyncService {
  private readonly providers: IntegrationProvider[];
  private readonly logger = new Logger(SyncService.name);

  constructor(
    @Inject(DATABASE_CLIENT)
    private readonly db: DatabaseClient,
    @Inject(API_RUNTIME_ENV)
    private readonly env: ApiRuntimeEnv,
    @Inject(FinanceService)
    private readonly financeService: FinanceService,
    @Inject(SyncPerformanceMaterializerService)
    private readonly syncPerformanceMaterializer: SyncPerformanceMaterializerService,
  ) {
    this.providers = createIntegrationProviders(this.env);
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

  async clearHistory(
    organizationId: string,
    providerSlug: IntegrationProviderSlug,
  ): Promise<ClearSyncHistoryResponse> {
    const rows = await this.db
      .delete(syncRuns)
      .where(
        and(
          eq(syncRuns.organizationId, organizationId),
          eq(syncRuns.provider, providerSlug),
          ne(syncRuns.status, "processing"),
        ),
      )
      .returning({ id: syncRuns.id });

    return {
      clearedCount: rows.length,
    };
  }

  async runSync(
    organizationId: string,
    userId: string,
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

    return this.executeSync({
      connection,
      organizationId,
      providerSlug,
      triggerMetadata: {},
      triggerOrigin: "manual",
      userId,
    });
  }

  async handleMercadoLivreNotification(
    input: MercadoLivreNotificationInput,
  ): Promise<MercadoLivreNotificationResult> {
    const summary = this.summarizeMercadoLivreNotification(input);
    const provider = this.getProvider("mercadolivre");

    if (!summary.userId) {
      return {
        accepted: true,
        reason: "missing_user_id",
        status: "ignored",
        summary,
      };
    }

    if (!this.isMercadoLivreOrderNotification(summary)) {
      return {
        accepted: true,
        reason: "ignored_topic",
        status: "ignored",
        summary,
      };
    }

    if (!provider.isConfigured()) {
      return {
        accepted: true,
        reason: "provider_unavailable",
        status: "ignored",
        summary,
      };
    }

    if (!provider.supportsSync()) {
      return {
        accepted: true,
        reason: "provider_unsupported",
        status: "ignored",
        summary,
      };
    }

    const connection = await this.findMercadoLivreConnectionByExternalAccountId(summary.userId);

    if (!connection || connection.status !== "connected" || !connection.accessToken) {
      return {
        accepted: true,
        reason: "connection_not_found",
        status: "ignored",
        summary,
      };
    }

    if (isExpired(connection.tokenExpiresAt)) {
      return {
        accepted: true,
        reason: "token_expired",
        status: "ignored",
        summary,
      };
    }

    const activeRun = await this.findLatestRun(connection.organizationId, "mercadolivre", "processing");

    if (activeRun) {
      await this.markAutomaticRerunPending(connection.id, summary);

      return {
        accepted: true,
        reason: "active_run_pending_rerun",
        status: "rerun_marked",
        summary,
      };
    }

    await this.executeSync({
      connection,
      organizationId: connection.organizationId,
      providerSlug: "mercadolivre",
      triggerMetadata: {
        notification: summary,
      },
      triggerOrigin: "automatic",
      userId: null,
    });

    return {
      accepted: true,
      reason: "started",
      status: "started",
      summary,
    };
  }

  async handleShopeeNotification(input: ShopeeNotificationInput): Promise<MercadoLivreNotificationResult> {
    const shopId =
      input.shopId !== undefined && input.shopId !== null ? String(input.shopId).trim() : null;
    const orderNumber =
      input.data && typeof input.data.ordersn === "string"
        ? input.data.ordersn
        : input.data && typeof input.data.order_sn === "string"
          ? input.data.order_sn
          : null;
    const summary: SyncTriggerSummary = {
      applicationId: null,
      attempts: null,
      notificationId: orderNumber,
      resource: orderNumber ? `/orders/${orderNumber}` : null,
      sent: input.timestamp ? new Date(input.timestamp * 1000).toISOString() : null,
      topic: input.code !== undefined ? `shopee:${input.code}` : "shopee",
      userId: shopId,
    };
    const provider = this.getProvider("shopee");

    if (!shopId) {
      return { accepted: true, reason: "missing_user_id", status: "ignored", summary };
    }
    if (input.code !== 3 || !orderNumber) {
      return { accepted: true, reason: "ignored_topic", status: "ignored", summary };
    }
    if (!provider.isConfigured()) {
      return { accepted: true, reason: "provider_unavailable", status: "ignored", summary };
    }
    if (!provider.supportsSync()) {
      return { accepted: true, reason: "provider_unsupported", status: "ignored", summary };
    }

    const connection = await this.findConnectionByExternalAccountId("shopee", shopId);
    if (!connection || connection.status !== "connected" || !connection.accessToken) {
      return { accepted: true, reason: "connection_not_found", status: "ignored", summary };
    }

    const activeRun = await this.findLatestRun(connection.organizationId, "shopee", "processing");
    if (activeRun) {
      await this.markAutomaticRerunPending(connection.id, summary);
      return {
        accepted: true,
        reason: "active_run_pending_rerun",
        status: "rerun_marked",
        summary,
      };
    }

    await this.executeSync({
      connection,
      organizationId: connection.organizationId,
      providerSlug: "shopee",
      triggerMetadata: { notification: summary },
      triggerOrigin: "automatic",
      userId: null,
    });

    return { accepted: true, reason: "started", status: "started", summary };
  }

  private async executeSync(input: ExecuteSyncInput): Promise<RunSyncResponse> {
    const provider = this.getProvider(input.providerSlug);
    const connection = await this.refreshConnectionIfNeeded(provider, input.connection);
    const lastCompletedRun = await this.findLatestRun(
      input.organizationId,
      input.providerSlug,
      "completed",
    );
    const requestedCursor = this.readCursorFromRun(lastCompletedRun);
    const [pendingRun] = await this.db
      .insert(syncRuns)
      .values({
        marketplaceConnectionId: connection.id,
        metadata: {
          origin: input.triggerOrigin,
          requestedCursor,
          trigger: input.triggerMetadata,
        },
        organizationId: input.organizationId,
        provider: input.providerSlug,
        status: "pending",
        windowKey: this.resolveWindowKeyForRun(input.providerSlug),
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

    let rethrowError: unknown = null;
    let response: RunSyncResponse | null = null;

    try {
      const syncResult = await provider.syncOrders({
        connection,
        cursor: requestedCursor,
        organizationId: input.organizationId,
      });
      const counts = await this.persistSyncResult({
        connection,
        organizationId: input.organizationId,
        providerSlug: input.providerSlug,
        syncResult,
        syncRunId: processingRun.id,
      });
      await this.syncPerformanceMaterializer.materializeForSync({
        organizationId: input.organizationId,
        providerSlug: input.providerSlug,
        syncRunId: processingRun.id,
        userId: input.userId,
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
            origin: input.triggerOrigin,
            requestedCursor,
            resultCursor: syncResult.cursor,
            trigger: input.triggerMetadata,
          },
          status: "completed",
          updatedAt: new Date(),
        })
        .where(eq(syncRuns.id, processingRun.id))
        .returning();

      await this.financeService.materializeOrganizationMetrics(input.organizationId);

      response = {
        availability: (await this.getStatus(input.organizationId, input.providerSlug)).availability,
        run: this.toRunRecord(completedRun),
      };
    } catch (error) {
      rethrowError = error;

      await this.db
        .update(syncRuns)
        .set({
          errorSummary: error instanceof Error ? error.message : "Sync failed.",
          finishedAt: new Date(),
          metadata: {
            ...(getMetadataObject(processingRun.metadata) as Record<string, unknown>),
            origin: input.triggerOrigin,
            requestedCursor,
            trigger: input.triggerMetadata,
          },
          status: "failed",
          updatedAt: new Date(),
        })
        .where(eq(syncRuns.id, processingRun.id));
    }

    if (this.isRealtimeProvider(input.providerSlug)) {
      try {
        await this.flushAutomaticRerunIfNeeded(
          connection.id,
          input.organizationId,
          input.providerSlug,
        );
      } catch (rerunError) {
        this.logger.error(
          `${input.providerSlug} automatic rerun failed for org ${input.organizationId}.`,
          rerunError instanceof Error ? rerunError.stack : undefined,
        );
      }
    }

    if (rethrowError) {
      this.rethrowProviderError(rethrowError);
    }

    return response!;
  }

  private summarizeMercadoLivreNotification(
    input: MercadoLivreNotificationInput,
  ): SyncTriggerSummary {
    return {
      applicationId:
        input.applicationId !== undefined && input.applicationId !== null
          ? String(input.applicationId)
          : null,
      attempts: typeof input.attempts === "number" ? input.attempts : null,
      notificationId: normalizeString(input.notificationId),
      resource: normalizeString(input.resource),
      sent: normalizeString(input.sent),
      topic: normalizeString(input.topic),
      userId:
        input.userId !== undefined && input.userId !== null ? String(input.userId).trim() : null,
    };
  }

  private isMercadoLivreOrderNotification(summary: SyncTriggerSummary) {
    const topic = summary.topic?.toLowerCase() ?? "";
    const resource = summary.resource?.toLowerCase() ?? "";

    return topic.includes("order") || resource.includes("/orders/");
  }

  private async markAutomaticRerunPending(connectionId: string, summary: SyncTriggerSummary) {
    const connection = await this.db.query.marketplaceConnections.findFirst({
      where: (table) => eq(table.id, connectionId),
    });

    if (!connection) {
      return;
    }

    await this.db
      .update(marketplaceConnections)
      .set({
        metadata: {
          ...getMetadataObject(connection.metadata),
          automaticRerunPending: true,
          lastAutomaticNotification: summary,
        },
        updatedAt: new Date(),
      })
      .where(eq(marketplaceConnections.id, connectionId));
  }

  private async flushAutomaticRerunIfNeeded(
    connectionId: string,
    organizationId: string,
    providerSlug: IntegrationProviderSlug,
  ) {
    const connection = await this.db.query.marketplaceConnections.findFirst({
      where: (table) => eq(table.id, connectionId),
    });

    if (!connection || !this.readAutomaticRerunPending(connection)) {
      return;
    }

    const notificationSummary = this.readLastAutomaticNotificationSummary(connection);

    await this.db
      .update(marketplaceConnections)
      .set({
        metadata: {
          ...getMetadataObject(connection.metadata),
          automaticRerunPending: false,
        },
        updatedAt: new Date(),
      })
      .where(eq(marketplaceConnections.id, connectionId));

    const activeRun = await this.findLatestRun(organizationId, providerSlug, "processing");

    if (activeRun || connection.status !== "connected" || !connection.accessToken) {
      return;
    }

    this.logger.log(
      `Running queued ${providerSlug} automatic rerun for org ${organizationId} after previous sync finished.`,
    );

    await this.executeSync({
      connection,
      organizationId,
      providerSlug,
      triggerMetadata: {
        notification: notificationSummary,
        rerun: true,
      },
      triggerOrigin: "automatic",
      userId: null,
    });
  }

  private readAutomaticRerunPending(connection: MarketplaceConnection) {
    return Boolean(
      connection.metadata &&
        typeof connection.metadata === "object" &&
        "automaticRerunPending" in connection.metadata &&
        connection.metadata.automaticRerunPending,
    );
  }

  private readLastAutomaticNotificationSummary(
    connection: MarketplaceConnection,
  ): SyncTriggerSummary | null {
    const metadata = getMetadataObject(connection.metadata);
    const notification =
      "lastAutomaticNotification" in metadata &&
      metadata.lastAutomaticNotification &&
      typeof metadata.lastAutomaticNotification === "object"
        ? (metadata.lastAutomaticNotification as Record<string, unknown>)
        : null;

    if (!notification) {
      return null;
    }

    return {
      applicationId: normalizeString(notification.applicationId),
      attempts:
        typeof notification.attempts === "number" && Number.isFinite(notification.attempts)
          ? notification.attempts
          : null,
      notificationId: normalizeString(notification.notificationId),
      resource: normalizeString(notification.resource),
      sent: normalizeString(notification.sent),
      topic: normalizeString(notification.topic),
      userId: normalizeString(notification.userId),
    };
  }

  private resolveWindowKeyForRun(providerSlug: IntegrationProviderSlug) {
    return this.isRealtimeProvider(providerSlug) ? null : resolveSyncWindowState().currentWindowKey;
  }

  private buildAvailability(
    provider: IntegrationProvider,
    connection: MarketplaceConnection | null,
    activeRun: SyncRun | null,
    lastCompletedRun: SyncRun | null,
  ): SyncAvailability {
    const isRealtimeProvider = this.isRealtimeProvider(provider.provider);
    const relaxGuards = Boolean(this.env.SYNC_RELAX_GUARDS) && this.env.NODE_ENV !== "production";
    const rawWindowState = resolveSyncWindowState();
    const windowState =
      !isRealtimeProvider && relaxGuards && !rawWindowState.syncOpen
        ? resolveSyncWindowStateAtNextOpenHour()
        : rawWindowState;
    const lastSuccessfulSyncAt =
      toIsoString(lastCompletedRun?.finishedAt) ?? toIsoString(connection?.lastSyncedAt);

    if (!provider.isConfigured()) {
      return {
        canRun: false,
        currentWindowKey: isRealtimeProvider ? null : windowState.currentWindowKey,
        currentWindowLabel: isRealtimeProvider ? null : windowState.currentWindowLabel,
        currentWindowSlot: isRealtimeProvider ? null : windowState.currentWindowSlot,
        lastSuccessfulSyncAt,
        message: "Provider credentials are not configured in the API environment yet.",
        nextAvailableAt: isRealtimeProvider ? null : windowState.nextAvailableAt,
        provider: provider.provider,
        reason: "provider_unavailable",
      };
    }

    if (!provider.supportsSync()) {
      return {
        canRun: false,
        currentWindowKey: isRealtimeProvider ? null : windowState.currentWindowKey,
        currentWindowLabel: isRealtimeProvider ? null : windowState.currentWindowLabel,
        currentWindowSlot: isRealtimeProvider ? null : windowState.currentWindowSlot,
        lastSuccessfulSyncAt,
        message: "This provider is connected structurally but does not support live sync yet.",
        nextAvailableAt: isRealtimeProvider ? null : windowState.nextAvailableAt,
        provider: provider.provider,
        reason: "provider_sync_unsupported",
      };
    }

    if (!connection || connection.status !== "connected" || !connection.accessToken) {
      return {
        canRun: false,
        currentWindowKey: isRealtimeProvider ? null : windowState.currentWindowKey,
        currentWindowLabel: isRealtimeProvider ? null : windowState.currentWindowLabel,
        currentWindowSlot: isRealtimeProvider ? null : windowState.currentWindowSlot,
        lastSuccessfulSyncAt,
        message: "Connect this marketplace account before running the first sync.",
        nextAvailableAt: isRealtimeProvider ? null : windowState.nextAvailableAt,
        provider: provider.provider,
        reason: "provider_disconnected",
      };
    }

    if (
      isExpired(connection.tokenExpiresAt) &&
      !(provider.refreshAccessToken && connection.refreshToken)
    ) {
      return {
        canRun: false,
        currentWindowKey: isRealtimeProvider ? null : windowState.currentWindowKey,
        currentWindowLabel: isRealtimeProvider ? null : windowState.currentWindowLabel,
        currentWindowSlot: isRealtimeProvider ? null : windowState.currentWindowSlot,
        lastSuccessfulSyncAt,
        message: "Stored provider token expired. Reconnect the account before syncing again.",
        nextAvailableAt: isRealtimeProvider ? null : windowState.nextAvailableAt,
        provider: provider.provider,
        reason: "provider_needs_reconnect",
      };
    }

    if (activeRun) {
      return {
        canRun: false,
        currentWindowKey: isRealtimeProvider ? null : windowState.currentWindowKey,
        currentWindowLabel: isRealtimeProvider ? null : windowState.currentWindowLabel,
        currentWindowSlot: isRealtimeProvider ? null : windowState.currentWindowSlot,
        lastSuccessfulSyncAt,
        message: "A sync is already in progress for this provider.",
        nextAvailableAt: isRealtimeProvider ? null : windowState.nextAvailableAt,
        provider: provider.provider,
        reason: "sync_in_progress",
      };
    }

    if (!isRealtimeProvider && !relaxGuards) {
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
    }

    return {
      canRun: true,
      currentWindowKey: isRealtimeProvider ? null : windowState.currentWindowKey,
      currentWindowLabel: isRealtimeProvider ? null : windowState.currentWindowLabel,
      currentWindowSlot: isRealtimeProvider ? null : windowState.currentWindowSlot,
      lastSuccessfulSyncAt,
      message: isRealtimeProvider
        ? `${provider.displayName} auto-sync is active. New sales also trigger synchronization automatically.`
        : "Sync is available for the current daily window.",
      nextAvailableAt: isRealtimeProvider ? null : windowState.nextAvailableAt,
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

  private async refreshConnectionIfNeeded(
    provider: IntegrationProvider,
    connection: MarketplaceConnection,
  ) {
    const expiresAt = connection.tokenExpiresAt
      ? new Date(connection.tokenExpiresAt).getTime()
      : Number.POSITIVE_INFINITY;
    const refreshSoon = expiresAt <= Date.now() + 5 * 60 * 1000;

    if (!refreshSoon || !provider.refreshAccessToken || !connection.refreshToken) {
      return connection;
    }

    const refreshed = await provider.refreshAccessToken(connection);
    await this.db
      .update(marketplaceConnections)
      .set({
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        status: "connected",
        tokenExpiresAt: refreshed.tokenExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(marketplaceConnections.id, connection.id));

    return {
      ...connection,
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      tokenExpiresAt: refreshed.tokenExpiresAt,
      updatedAt: new Date(),
    };
  }

  private async findMercadoLivreConnectionByExternalAccountId(externalAccountId: string) {
    return this.findConnectionByExternalAccountId("mercadolivre", externalAccountId);
  }

  private async findConnectionByExternalAccountId(
    providerSlug: IntegrationProviderSlug,
    externalAccountId: string,
  ) {
    return (
      (await this.db.query.marketplaceConnections.findFirst({
        where: (table) =>
          and(
            eq(table.provider, providerSlug),
            eq(table.externalAccountId, externalAccountId),
          ),
      })) ?? null
    );
  }

  private isRealtimeProvider(providerSlug: IntegrationProviderSlug) {
    return providerSlug === "mercadolivre" || providerSlug === "shopee";
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
      origin: normalizeRunOrigin(metadata),
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
