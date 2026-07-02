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
  IntegrationProviderSlug,
  ManualSyncRange,
  RunSyncResponse,
  SyncAvailability,
  SyncImportCounts,
  SyncRunOrigin,
  SyncRunRecord,
  SyncStatusResponse,
} from "@lucreii/types";
import { and, desc, eq } from "drizzle-orm";
import { API_RUNTIME_ENV, DATABASE_CLIENT } from "@/common/tokens";
import type { ApiRuntimeEnv } from "@/common/config/api-env";
import { FinanceService } from "@/modules/finance/finance.service";
import { createIntegrationProviders } from "@/modules/integrations/provider-registry";
import {
  IntegrationProviderError,
  type IntegrationProvider,
  type IntegrationSyncNotification,
  type IntegrationSyncCursor,
  type IntegrationSyncResult,
} from "@/modules/integrations/integrations.types";
import {
  resolveSyncWindowState,
  resolveSyncWindowStateAtNextOpenHour,
} from "./sync-window";
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

function normalizeMetadataCounts(
  value: Record<string, unknown> | null | undefined,
): SyncImportCounts {
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
      counts && typeof counts.fees === "number" && Number.isFinite(counts.fees)
        ? counts.fees
        : 0,
    items:
      counts &&
      typeof counts.items === "number" &&
      Number.isFinite(counts.items)
        ? counts.items
        : 0,
    orders:
      counts &&
      typeof counts.orders === "number" &&
      Number.isFinite(counts.orders)
        ? counts.orders
        : 0,
    products:
      counts &&
      typeof counts.products === "number" &&
      Number.isFinite(counts.products)
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

function buildOrderMetadata(order: {
  items: Array<{
    metadata?: Record<string, unknown>;
    quantity: number;
    sku?: string | null;
  }>;
  metadata: Record<string, unknown>;
}) {
  const metadata = { ...order.metadata };
  const returnQuantityBySku: Record<string, number> = {};

  const existingReturnMap =
    metadata.returnQuantityBySku &&
    typeof metadata.returnQuantityBySku === "object"
      ? metadata.returnQuantityBySku
      : null;

  if (existingReturnMap) {
    for (const [sku, quantity] of Object.entries(existingReturnMap)) {
      if (
        typeof quantity === "number" &&
        Number.isFinite(quantity) &&
        quantity > 0
      ) {
        returnQuantityBySku[sku] = Math.max(0, Math.trunc(quantity));
      }
    }
  }

  for (const item of order.items) {
    const rawReturnQuantity =
      item.metadata &&
      typeof item.metadata === "object" &&
      "returnQuantity" in item.metadata &&
      typeof item.metadata.returnQuantity === "number" &&
      Number.isFinite(item.metadata.returnQuantity)
        ? item.metadata.returnQuantity
        : 0;

    if (!item.sku || rawReturnQuantity <= 0) {
      continue;
    }

    returnQuantityBySku[item.sku] =
      (returnQuantityBySku[item.sku] ?? 0) +
      Math.max(0, Math.min(item.quantity, Math.trunc(rawReturnQuantity)));
  }

  metadata.returnQuantityBySku = returnQuantityBySku;

  return metadata;
}

function normalizeRunOrigin(
  value: Record<string, unknown> | null | undefined,
): SyncRunOrigin {
  return value?.origin === "automatic" ? "automatic" : "manual";
}

function normalizeString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function normalizeNullableUpdateString(value: string | null | undefined) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

type ManualSyncRequest = {
  startDate: string;
  endDate: string;
};

function parseDateOnlyAsUtc(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    throw new BadRequestException("Periodo de sincronizacao invalido.");
  }

  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

function endOfUtcDay(value: Date) {
  return new Date(
    Date.UTC(
      value.getUTCFullYear(),
      value.getUTCMonth(),
      value.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );
}

function addUtcMonths(value: Date, months: number) {
  const targetYear = value.getUTCFullYear();
  const targetMonth = value.getUTCMonth() + months;
  const lastDayOfTargetMonth = new Date(
    Date.UTC(targetYear, targetMonth + 1, 0),
  ).getUTCDate();
  const targetDay = Math.min(value.getUTCDate(), lastDayOfTargetMonth);

  return new Date(
    Date.UTC(
      targetYear,
      targetMonth,
      targetDay,
      value.getUTCHours(),
      value.getUTCMinutes(),
      value.getUTCSeconds(),
      value.getUTCMilliseconds(),
    ),
  );
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
  companyId: string;
  manualRange: ManualSyncRange | null;
  notification: IntegrationSyncNotification | null;
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

type SheinNotificationInput = {
  event?: string;
  orderId?: string | number;
  sellerId?: string | number;
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
    companyIdOrProviderSlug: string,
    providerSlug?: IntegrationProviderSlug,
  ): Promise<SyncStatusResponse> {
    const companyId = providerSlug ? companyIdOrProviderSlug : organizationId;
    const resolvedProviderSlug = (providerSlug ??
      companyIdOrProviderSlug) as IntegrationProviderSlug;
    const provider = this.getProvider(resolvedProviderSlug);
    const [connection, activeRun, lastCompletedRun] = await Promise.all([
      this.findConnection(organizationId, companyId, resolvedProviderSlug),
      this.findLatestRun(
        organizationId,
        companyId,
        resolvedProviderSlug,
        "processing",
      ),
      this.findLatestRun(
        organizationId,
        companyId,
        resolvedProviderSlug,
        "completed",
      ),
    ]);

    return {
      activeRun: activeRun ? this.toRunRecord(activeRun) : null,
      availability: this.buildAvailability(
        provider,
        connection,
        activeRun,
        lastCompletedRun,
      ),
      lastCompletedRun: lastCompletedRun
        ? this.toRunRecord(lastCompletedRun)
        : null,
    };
  }

  async rematerializeProviderMetrics(input: {
    companyId: string;
    organizationId: string;
    providerSlug: IntegrationProviderSlug;
    userId: string | null;
  }) {
    await this.syncPerformanceMaterializer.rematerializeProviderMetrics(input);
    await this.financeService.materializeOrganizationMetrics(
      input.organizationId,
      input.companyId,
    );
  }

  async runSync(
    organizationId: string,
    companyIdOrUserId: string,
    userIdOrProviderSlug: string,
    providerSlug?: IntegrationProviderSlug,
    manualSyncRequest?: ManualSyncRequest,
  ): Promise<RunSyncResponse> {
    const companyId = providerSlug ? companyIdOrUserId : organizationId;
    const userId = providerSlug ? userIdOrProviderSlug : companyIdOrUserId;
    const resolvedProviderSlug = (providerSlug ??
      userIdOrProviderSlug) as IntegrationProviderSlug;
    const provider = this.getProvider(resolvedProviderSlug);
    const [connection, activeRun, lastCompletedRun] = await Promise.all([
      this.findConnection(organizationId, companyId, resolvedProviderSlug),
      this.findLatestRun(
        organizationId,
        companyId,
        resolvedProviderSlug,
        "processing",
      ),
      this.findLatestRun(
        organizationId,
        companyId,
        resolvedProviderSlug,
        "completed",
      ),
    ]);
    const availability = this.buildAvailability(
      provider,
      connection,
      activeRun,
      lastCompletedRun,
    );

    if (!availability.canRun || !connection) {
      throw this.toAvailabilityException(availability);
    }

    const manualRange = this.normalizeManualSyncRequest(manualSyncRequest);

    return this.executeSync({
      connection,
      companyId,
      manualRange,
      notification: null,
      organizationId,
      providerSlug: resolvedProviderSlug,
      triggerMetadata: {
        manualRange,
      },
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

    const connection = await this.findMercadoLivreConnectionByExternalAccountId(
      summary.userId,
    );

    if (
      !connection ||
      connection.status !== "connected" ||
      !connection.accessToken
    ) {
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

    const activeRun = await this.findLatestRun(
      connection.organizationId,
      connection.companyId,
      "mercadolivre",
      "processing",
    );

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
      companyId: connection.companyId,
      manualRange: null,
      notification: this.toIntegrationNotification(summary),
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

  async handleShopeeNotification(
    input: ShopeeNotificationInput,
  ): Promise<MercadoLivreNotificationResult> {
    const shopId =
      input.shopId !== undefined && input.shopId !== null
        ? String(input.shopId).trim()
        : null;
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
      sent: input.timestamp
        ? new Date(input.timestamp * 1000).toISOString()
        : null,
      topic: input.code !== undefined ? `shopee:${input.code}` : "shopee",
      userId: shopId,
    };
    const provider = this.getProvider("shopee");

    if (!shopId) {
      return {
        accepted: true,
        reason: "missing_user_id",
        status: "ignored",
        summary,
      };
    }
    if (input.code !== 3 || !orderNumber) {
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

    const connection = await this.findConnectionByExternalAccountId(
      "shopee",
      shopId,
    );
    if (
      !connection ||
      connection.status !== "connected" ||
      !connection.accessToken
    ) {
      return {
        accepted: true,
        reason: "connection_not_found",
        status: "ignored",
        summary,
      };
    }

    const activeRun = await this.findLatestRun(
      connection.organizationId,
      connection.companyId,
      "shopee",
      "processing",
    );
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
      companyId: connection.companyId,
      manualRange: null,
      notification: this.toIntegrationNotification(summary),
      organizationId: connection.organizationId,
      providerSlug: "shopee",
      triggerMetadata: { notification: summary },
      triggerOrigin: "automatic",
      userId: null,
    });

    return { accepted: true, reason: "started", status: "started", summary };
  }

  async handleSheinNotification(
    input: SheinNotificationInput,
  ): Promise<MercadoLivreNotificationResult> {
    const sellerId =
      input.sellerId !== undefined && input.sellerId !== null
        ? String(input.sellerId).trim()
        : null;
    const orderId =
      input.orderId !== undefined && input.orderId !== null
        ? String(input.orderId).trim()
        : null;
    const event = input.event?.trim().toLowerCase() ?? "";
    const summary: SyncTriggerSummary = {
      applicationId: null,
      attempts: null,
      notificationId: orderId,
      resource: orderId ? `/orders/${orderId}` : null,
      sent: input.timestamp
        ? new Date(input.timestamp * 1000).toISOString()
        : null,
      topic: event ? `shein:${event}` : "shein",
      userId: sellerId,
    };
    const provider = this.getProvider("shein");

    if (!sellerId) {
      return {
        accepted: true,
        reason: "missing_user_id",
        status: "ignored",
        summary,
      };
    }
    if (!orderId || !event.includes("order")) {
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

    const connection = await this.findConnectionByExternalAccountId(
      "shein",
      sellerId,
    );
    if (
      !connection ||
      connection.status !== "connected" ||
      !connection.accessToken
    ) {
      return {
        accepted: true,
        reason: "connection_not_found",
        status: "ignored",
        summary,
      };
    }

    const activeRun = await this.findLatestRun(
      connection.organizationId,
      connection.companyId,
      "shein",
      "processing",
    );
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
      companyId: connection.companyId,
      manualRange: null,
      notification: this.toIntegrationNotification(summary),
      organizationId: connection.organizationId,
      providerSlug: "shein",
      triggerMetadata: { notification: summary },
      triggerOrigin: "automatic",
      userId: null,
    });

    return { accepted: true, reason: "started", status: "started", summary };
  }

  private async executeSync(input: ExecuteSyncInput): Promise<RunSyncResponse> {
    const provider = this.getProvider(input.providerSlug);
    const connection = await this.refreshConnectionIfNeeded(
      provider,
      input.connection,
    );
    const lastCursorSourceRun = input.manualRange
      ? null
      : await this.findLatestCursorSourceRun(
          input.organizationId,
          input.companyId,
          input.providerSlug,
        );
    const requestedCursor = this.readCursorFromRun(lastCursorSourceRun);
    const [pendingRun] = await this.db
      .insert(syncRuns)
      .values({
        companyId: input.companyId,
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
      const syncResult = await provider.syncOrders(
        input.manualRange
          ? {
              connection,
              mode: "manual_range",
              organizationId: input.organizationId,
              range: input.manualRange,
            }
          : {
              connection,
              cursor: requestedCursor,
              mode: "incremental",
              notification: input.notification,
              organizationId: input.organizationId,
            },
      );
      const counts = await this.persistSyncResult({
        companyId: input.companyId,
        connection,
        organizationId: input.organizationId,
        providerSlug: input.providerSlug,
        syncResult,
        syncRunId: processingRun.id,
      });
      await this.syncPerformanceMaterializer.materializeForSync({
        companyId: input.companyId,
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
            ...(syncResult.metadata ? { providerMetadata: syncResult.metadata } : {}),
            requestedCursor,
            trigger: input.triggerMetadata,
            ...(input.manualRange ? {} : { resultCursor: syncResult.cursor }),
          },
          status: "completed",
          updatedAt: new Date(),
        })
        .where(eq(syncRuns.id, processingRun.id))
        .returning();

      if (input.manualRange && syncResult.metadata) {
        this.logger.log(
          `${input.providerSlug} manual sync diagnostics ${JSON.stringify(syncResult.metadata)}`,
        );
      }

      await this.financeService.materializeOrganizationMetrics(
        input.organizationId,
        input.companyId,
      );

      response = {
        availability: (
          await this.getStatus(
            input.organizationId,
            input.companyId,
            input.providerSlug,
          )
        ).availability,
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
            ...(getMetadataObject(processingRun.metadata) as Record<
              string,
              unknown
            >),
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
          input.companyId,
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
        input.userId !== undefined && input.userId !== null
          ? String(input.userId).trim()
          : null,
    };
  }

  private isMercadoLivreOrderNotification(summary: SyncTriggerSummary) {
    const topic = summary.topic?.toLowerCase() ?? "";
    const resource = summary.resource?.toLowerCase() ?? "";

    return topic.includes("order") || resource.includes("/orders/");
  }

  private async markAutomaticRerunPending(
    connectionId: string,
    summary: SyncTriggerSummary,
  ) {
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
    companyId: string,
    organizationId: string,
    providerSlug: IntegrationProviderSlug,
  ) {
    const connection = await this.db.query.marketplaceConnections.findFirst({
      where: (table) => eq(table.id, connectionId),
    });

    if (!connection || !this.readAutomaticRerunPending(connection)) {
      return;
    }

    const notificationSummary =
      this.readLastAutomaticNotificationSummary(connection);

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

    const activeRun = await this.findLatestRun(
      organizationId,
      companyId,
      providerSlug,
      "processing",
    );

    if (
      activeRun ||
      connection.status !== "connected" ||
      !connection.accessToken
    ) {
      return;
    }

    this.logger.log(
      `Running queued ${providerSlug} automatic rerun for org ${organizationId} after previous sync finished.`,
    );

    await this.executeSync({
      connection,
      companyId,
      manualRange: null,
      notification: notificationSummary
        ? this.toIntegrationNotification(notificationSummary)
        : null,
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
        typeof notification.attempts === "number" &&
        Number.isFinite(notification.attempts)
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
    return this.isRealtimeProvider(providerSlug)
      ? null
      : resolveSyncWindowState().currentWindowKey;
  }

  private toIntegrationNotification(
    summary: SyncTriggerSummary | null,
  ): IntegrationSyncNotification | null {
    if (!summary) {
      return null;
    }

    return {
      notificationId: summary.notificationId,
      resource: summary.resource,
      topic: summary.topic,
    };
  }

  private normalizeManualSyncRequest(
    input?: ManualSyncRequest,
  ): ManualSyncRange {
    if (!input?.startDate || !input.endDate) {
      throw new BadRequestException(
        "Selecione data inicial e final para a sincronizacao manual.",
      );
    }

    const startAtDate = parseDateOnlyAsUtc(input.startDate);
    const endAtDate = endOfUtcDay(parseDateOnlyAsUtc(input.endDate));

    if (startAtDate.getTime() > endAtDate.getTime()) {
      throw new BadRequestException(
        "Data inicial nao pode ser maior que data final.",
      );
    }

    const now = new Date();
    const todayStart = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0,
        0,
        0,
        0,
      ),
    );
    const oldestAllowedStart = addUtcMonths(todayStart, -3);
    const newestAllowedEnd = endOfUtcDay(todayStart);

    if (
      startAtDate.getTime() < oldestAllowedStart.getTime() ||
      endAtDate.getTime() > newestAllowedEnd.getTime()
    ) {
      throw new BadRequestException(
        "Periodo manual deve ficar dentro dos ultimos 3 meses.",
      );
    }

    return {
      endAt: endAtDate.toISOString(),
      startAt: startAtDate.toISOString(),
    };
  }

  private async findLatestCursorSourceRun(
    organizationId: string,
    companyId: string,
    providerSlug: IntegrationProviderSlug,
  ) {
    const runs =
      (await this.db.query.syncRuns.findMany({
        orderBy: (table) => [desc(table.createdAt)],
        where: (table) =>
          and(
            eq(table.organizationId, organizationId),
            eq(table.companyId, companyId),
            eq(table.provider, providerSlug),
            eq(table.status, "completed"),
          ),
      })) ?? [];

    for (const run of runs) {
      if (!this.readManualRangeFromMetadata(run.metadata)) {
        return run;
      }
    }

    return null;
  }

  private buildAvailability(
    provider: IntegrationProvider,
    connection: MarketplaceConnection | null,
    activeRun: SyncRun | null,
    lastCompletedRun: SyncRun | null,
  ): SyncAvailability {
    const isRealtimeProvider = this.isRealtimeProvider(provider.provider);
    const relaxGuards =
      Boolean(this.env.SYNC_RELAX_GUARDS) && this.env.NODE_ENV !== "production";
    const rawWindowState = resolveSyncWindowState();
    const windowState =
      !isRealtimeProvider && relaxGuards && !rawWindowState.syncOpen
        ? resolveSyncWindowStateAtNextOpenHour()
        : rawWindowState;
    const lastSuccessfulSyncAt =
      toIsoString(lastCompletedRun?.finishedAt) ??
      toIsoString(connection?.lastSyncedAt);

    if (!provider.isConfigured()) {
      return {
        canRun: false,
        currentWindowKey: isRealtimeProvider
          ? null
          : windowState.currentWindowKey,
        currentWindowLabel: isRealtimeProvider
          ? null
          : windowState.currentWindowLabel,
        currentWindowSlot: isRealtimeProvider
          ? null
          : windowState.currentWindowSlot,
        lastSuccessfulSyncAt,
        message:
          "Provider credentials are not configured in the API environment yet.",
        nextAvailableAt: isRealtimeProvider
          ? null
          : windowState.nextAvailableAt,
        provider: provider.provider,
        reason: "provider_unavailable",
      };
    }

    if (!provider.supportsSync()) {
      return {
        canRun: false,
        currentWindowKey: isRealtimeProvider
          ? null
          : windowState.currentWindowKey,
        currentWindowLabel: isRealtimeProvider
          ? null
          : windowState.currentWindowLabel,
        currentWindowSlot: isRealtimeProvider
          ? null
          : windowState.currentWindowSlot,
        lastSuccessfulSyncAt,
        message:
          "This provider is connected structurally but does not support live sync yet.",
        nextAvailableAt: isRealtimeProvider
          ? null
          : windowState.nextAvailableAt,
        provider: provider.provider,
        reason: "provider_sync_unsupported",
      };
    }

    if (
      !connection ||
      connection.status !== "connected" ||
      !connection.accessToken
    ) {
      return {
        canRun: false,
        currentWindowKey: isRealtimeProvider
          ? null
          : windowState.currentWindowKey,
        currentWindowLabel: isRealtimeProvider
          ? null
          : windowState.currentWindowLabel,
        currentWindowSlot: isRealtimeProvider
          ? null
          : windowState.currentWindowSlot,
        lastSuccessfulSyncAt,
        message:
          "Connect this marketplace account before running the first sync.",
        nextAvailableAt: isRealtimeProvider
          ? null
          : windowState.nextAvailableAt,
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
        currentWindowKey: isRealtimeProvider
          ? null
          : windowState.currentWindowKey,
        currentWindowLabel: isRealtimeProvider
          ? null
          : windowState.currentWindowLabel,
        currentWindowSlot: isRealtimeProvider
          ? null
          : windowState.currentWindowSlot,
        lastSuccessfulSyncAt,
        message:
          "Stored provider token expired. Reconnect the account before syncing again.",
        nextAvailableAt: isRealtimeProvider
          ? null
          : windowState.nextAvailableAt,
        provider: provider.provider,
        reason: "provider_needs_reconnect",
      };
    }

    if (activeRun) {
      return {
        canRun: false,
        currentWindowKey: isRealtimeProvider
          ? null
          : windowState.currentWindowKey,
        currentWindowLabel: isRealtimeProvider
          ? null
          : windowState.currentWindowLabel,
        currentWindowSlot: isRealtimeProvider
          ? null
          : windowState.currentWindowSlot,
        lastSuccessfulSyncAt,
        message: "A sync is already in progress for this provider.",
        nextAvailableAt: isRealtimeProvider
          ? null
          : windowState.nextAvailableAt,
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
          message:
            "Sync is unavailable overnight. The next daily window opens at 06:00.",
          nextAvailableAt: windowState.nextAvailableAt,
          provider: provider.provider,
          reason: "outside_window",
        };
      }

      if (
        lastCompletedRun?.windowKey &&
        lastCompletedRun.windowKey === windowState.currentWindowKey
      ) {
        return {
          canRun: false,
          currentWindowKey: windowState.currentWindowKey,
          currentWindowLabel: windowState.currentWindowLabel,
          currentWindowSlot: windowState.currentWindowSlot,
          lastSuccessfulSyncAt,
          message:
            "This daily sync window was already used. Wait for the next window to open.",
          nextAvailableAt: windowState.nextAvailableAt,
          provider: provider.provider,
          reason: "window_already_used",
        };
      }
    }

    return {
      canRun: true,
      currentWindowKey: isRealtimeProvider
        ? null
        : windowState.currentWindowKey,
      currentWindowLabel: isRealtimeProvider
        ? null
        : windowState.currentWindowLabel,
      currentWindowSlot: isRealtimeProvider
        ? null
        : windowState.currentWindowSlot,
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
    companyId: string;
    organizationId: string;
    providerSlug: IntegrationProviderSlug;
    connection: MarketplaceConnection;
    syncRunId: string;
    syncResult: IntegrationSyncResult;
  }) {
    return this.db.transaction(async (tx) => {
      const productIdsByExternalId = new Map<string, string>();

      for (const product of input.syncResult.products.filter(
        (entry) => entry.externalProductId,
      )) {
        const nextSku = normalizeNullableUpdateString(product.sku);
        const nextTitle = normalizeNullableUpdateString(product.title);
        const [storedProduct] = await tx
          .insert(externalProducts)
          .values({
            companyId: input.companyId,
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
              ...(nextSku !== undefined ? { sku: nextSku } : {}),
              ...(nextTitle !== undefined ? { title: nextTitle } : {}),
              updatedAt: new Date(),
            },
            target: [
              externalProducts.organizationId,
              externalProducts.companyId,
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
        const orderMetadata = buildOrderMetadata(order);
        const [storedOrder] = await tx
          .insert(externalOrders)
          .values({
            companyId: input.companyId,
            currency: order.currency,
            marketplaceConnectionId: input.connection.id,
            metadata: orderMetadata,
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
              metadata: orderMetadata,
              orderedAt: order.orderedAt ? new Date(order.orderedAt) : null,
              status: order.status,
              syncRunId: input.syncRunId,
              totalAmount: order.totalAmount,
              updatedAt: new Date(),
            },
            target: [
              externalOrders.organizationId,
              externalOrders.companyId,
              externalOrders.provider,
              externalOrders.externalOrderId,
            ],
          })
          .returning({
            id: externalOrders.id,
          });

        await tx
          .delete(externalOrderItems)
          .where(eq(externalOrderItems.externalOrderId, storedOrder.id));
        await tx
          .delete(externalFees)
          .where(eq(externalFees.externalOrderId, storedOrder.id));

        for (const item of order.items) {
          itemCount += 1;

          await tx.insert(externalOrderItems).values({
            externalOrderId: storedOrder.id,
            externalProductId: item.externalProductId
              ? (productIdsByExternalId.get(item.externalProductId) ?? null)
              : null,
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
    const provider = this.providers.find(
      (entry) => entry.provider === providerSlug,
    );

    if (!provider) {
      throw new BadRequestException(
        `Unsupported sync provider "${providerSlug}".`,
      );
    }

    return provider;
  }

  private async findConnection(
    organizationId: string,
    companyId: string,
    providerSlug: IntegrationProviderSlug,
  ) {
    return (
      (await this.db.query.marketplaceConnections.findFirst({
        where: (table) =>
          and(
            eq(table.organizationId, organizationId),
            eq(table.companyId, companyId),
            eq(table.provider, providerSlug),
          ),
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

    if (
      !refreshSoon ||
      !provider.refreshAccessToken ||
      !connection.refreshToken
    ) {
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

  private async findMercadoLivreConnectionByExternalAccountId(
    externalAccountId: string,
  ) {
    return this.findConnectionByExternalAccountId(
      "mercadolivre",
      externalAccountId,
    );
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
    return (
      providerSlug === "mercadolivre" ||
      providerSlug === "shopee" ||
      providerSlug === "shein"
    );
  }

  private async findLatestRun(
    organizationId: string,
    companyId: string,
    providerSlug: IntegrationProviderSlug,
    status: string,
  ) {
    return (
      (await this.db.query.syncRuns.findFirst({
        orderBy: (table) => [desc(table.createdAt)],
        where: (table) =>
          and(
            eq(table.organizationId, organizationId),
            eq(table.companyId, companyId),
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

  private readManualRangeFromMetadata(
    value: Record<string, unknown> | null | undefined,
  ): ManualSyncRange | null {
    if (!value || typeof value !== "object") {
      return null;
    }

    const trigger =
      "trigger" in value && value.trigger && typeof value.trigger === "object"
        ? (value.trigger as Record<string, unknown>)
        : null;
    const manualRange =
      trigger &&
      "manualRange" in trigger &&
      trigger.manualRange &&
      typeof trigger.manualRange === "object"
        ? (trigger.manualRange as Record<string, unknown>)
        : null;

    if (
      !manualRange ||
      typeof manualRange.startAt !== "string" ||
      typeof manualRange.endAt !== "string"
    ) {
      return null;
    }

    return {
      endAt: manualRange.endAt,
      startAt: manualRange.startAt,
    };
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
      manualRange: this.readManualRangeFromMetadata(metadata),
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
