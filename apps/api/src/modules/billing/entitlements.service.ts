import { HttpException, Inject, Injectable, Logger } from "@nestjs/common";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import type { DatabaseClient } from "@marginflow/database";
import { DATABASE_CLIENT } from "@/common/tokens";
import type { BillingSnapshot } from "./billing.types";

const ENTITLED_STATUSES = new Set(["active", "trialing"]);

function readPostgresErrorCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < 6 && current; depth += 1) {
    if (typeof current === "object" && current !== null && "code" in current) {
      const code = (current as { code?: unknown }).code;
      if (typeof code === "string") {
        return code;
      }
    }
    if (current instanceof Error && current.cause !== undefined) {
      current = current.cause;
      continue;
    }
    if (typeof current === "object" && current !== null && "cause" in current) {
      current = (current as { cause?: unknown }).cause;
      continue;
    }
    break;
  }
  return undefined;
}

function errorMessageChain(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < 6 && current; depth += 1) {
    if (current instanceof Error) {
      parts.push(current.message);
      current = current.cause;
    } else if (typeof current === "object" && current !== null && "message" in current) {
      parts.push(String((current as { message: unknown }).message));
      current =
        "cause" in current ? (current as { cause?: unknown }).cause : undefined;
    } else {
      parts.push(String(current));
      break;
    }
  }
  return parts.join(" | ");
}

/** Banco sem migração `0004` (tabela `pending_checkouts`). */
function isMissingPendingCheckoutsRelationError(error: unknown): boolean {
  const code = readPostgresErrorCode(error);
  const text = errorMessageChain(error).toLowerCase();
  if (!text.includes("pending_checkouts")) {
    return false;
  }
  return (
    code === "42P01" ||
    text.includes("does not exist") ||
    text.includes("não existe") ||
    text.includes("nao existe")
  );
}

@Injectable()
export class EntitlementsService {
  private readonly logger = new Logger(EntitlementsService.name);

  constructor(
    @Inject(DATABASE_CLIENT)
    private readonly db: DatabaseClient,
  ) {}

  async getBillingSnapshot(input: {
    organizationId: string | null;
    userId: string;
  } | string): Promise<BillingSnapshot> {
    if (typeof input === "string") {
      return this.getOrganizationSnapshot(input);
    }

    const [customer, subscription, pendingCheckout] = await Promise.all([
      input.organizationId
        ? this.db.query.billingCustomers.findFirst({
            where: (table, { and, eq }) =>
              and(eq(table.organizationId, input.organizationId!), eq(table.provider, "stripe")),
          })
        : Promise.resolve(null),
      input.organizationId
        ? this.db.query.subscriptions.findFirst({
            where: (table, { and, eq }) =>
              and(
                eq(table.organizationId, input.organizationId!),
                eq(table.provider, "stripe"),
                isNotNull(table.billingCustomerId),
              ),
            orderBy: (table, { desc }) => [desc(table.updatedAt)],
          })
        : Promise.resolve(null),
      this.loadLatestPendingCheckoutForUser(input.userId),
    ]);

    const entitled = subscription != null && ENTITLED_STATUSES.has(subscription.status);
    const hasConfirmedPendingCheckout =
      pendingCheckout != null &&
      (pendingCheckout.status === "confirmed" || pendingCheckout.status === "completed") &&
      Boolean(pendingCheckout.stripeSubscriptionId);

    let status: BillingSnapshot["status"];

    if (entitled) {
      status = "active";
    } else if (!input.organizationId && hasConfirmedPendingCheckout) {
      status = "pending_onboarding";
    } else if (!input.organizationId) {
      status = "no_checkout";
    } else {
      status = "inactive";
    }

    return {
      organizationId: input.organizationId,
      entitled,
      status,
      customer: customer
        ? {
            externalCustomerId: customer.externalCustomerId,
            id: customer.id,
          }
        : null,
      subscription: subscription
        ? {
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            currentPeriodEnd: this.toIsoString(subscription.currentPeriodEnd),
            currentPeriodStart: this.toIsoString(subscription.currentPeriodStart),
            externalSubscriptionId: subscription.externalSubscriptionId,
            id: subscription.id,
            interval: subscription.interval,
            planCode: subscription.planCode,
            status: subscription.status,
          }
        : null,
      pendingCheckout: pendingCheckout
        ? {
            id: pendingCheckout.id,
            checkoutSessionId: pendingCheckout.checkoutSessionId,
            stripeCustomerId: pendingCheckout.stripeCustomerId,
            stripeSubscriptionId: pendingCheckout.stripeSubscriptionId,
            interval: pendingCheckout.interval,
            planCode: pendingCheckout.planCode,
            status: pendingCheckout.status,
          }
        : null,
    };
  }

  async isOrganizationEntitled(organizationId: string) {
    const snapshot = await this.getOrganizationSnapshot(organizationId);
    return snapshot.entitled;
  }

  async requireActiveEntitlement(organizationId: string) {
    const snapshot = await this.getOrganizationSnapshot(organizationId);

    if (!snapshot.entitled) {
      throw new HttpException("Active subscription required.", 402);
    }

    return snapshot;
  }

  private async getOrganizationSnapshot(organizationId: string): Promise<BillingSnapshot> {
    const [customer, subscription] = await Promise.all([
      this.db.query.billingCustomers.findFirst({
        where: (table, { and, eq }) =>
          and(eq(table.organizationId, organizationId), eq(table.provider, "stripe")),
      }),
      this.db.query.subscriptions.findFirst({
        where: (table, { and, eq }) =>
          and(
            eq(table.organizationId, organizationId),
            eq(table.provider, "stripe"),
            isNotNull(table.billingCustomerId),
          ),
        orderBy: (table, { desc }) => [desc(table.updatedAt)],
      }),
    ]);

    return {
      organizationId,
      entitled: subscription != null && ENTITLED_STATUSES.has(subscription.status),
      status: subscription != null && ENTITLED_STATUSES.has(subscription.status) ? "active" : "inactive",
      customer: customer
        ? {
            externalCustomerId: customer.externalCustomerId,
            id: customer.id,
          }
        : null,
      subscription: subscription
        ? {
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            currentPeriodEnd: this.toIsoString(subscription.currentPeriodEnd),
            currentPeriodStart: this.toIsoString(subscription.currentPeriodStart),
            externalSubscriptionId: subscription.externalSubscriptionId,
            id: subscription.id,
            interval: subscription.interval,
            planCode: subscription.planCode,
            status: subscription.status,
          }
        : null,
      pendingCheckout: null,
    };
  }

  private toIsoString(value: Date | null) {
    return value ? value.toISOString() : null;
  }

  /**
   * Isolado para não derrubar `GET /billing/subscription` quando a migração
   * que cria `pending_checkouts` ainda não foi aplicada no Postgres local.
   */
  private async loadLatestPendingCheckoutForUser(userId: string) {
    try {
      return await this.db.query.pendingCheckouts.findFirst({
        where: (table, { eq }) => eq(table.userId, userId),
        orderBy: (table, { desc }) => [desc(table.updatedAt)],
      });
    } catch (error) {
      if (isMissingPendingCheckoutsRelationError(error)) {
        this.logger.warn(
          `Skipping pending checkout lookup: ensure migration 0004 is applied (table pending_checkouts). Postgres code: ${readPostgresErrorCode(error) ?? "unknown"}`,
        );
        return null;
      }
      throw error;
    }
  }
}
