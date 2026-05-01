import { HttpException, Inject, Injectable } from "@nestjs/common";
import { isNotNull } from "drizzle-orm";
import type { DatabaseClient } from "@marginflow/database";
import { DATABASE_CLIENT } from "@/common/tokens";
import type { BillingSnapshot } from "./billing.types";

const ENTITLED_STATUSES = new Set(["active", "trialing"]);

@Injectable()
export class EntitlementsService {
  constructor(
    @Inject(DATABASE_CLIENT)
    private readonly db: DatabaseClient,
  ) {}

  async getBillingSnapshot(organizationId: string): Promise<BillingSnapshot> {
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
            /** Seed placeholder rows omit a billing row; entitlement always tracks Stripe-linked rows only. */
            isNotNull(table.billingCustomerId),
          ),
        orderBy: (table, { desc }) => [desc(table.updatedAt)],
      }),
    ]);

    return {
      organizationId,
      entitled: subscription != null && ENTITLED_STATUSES.has(subscription.status),
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
    };
  }

  async isOrganizationEntitled(organizationId: string) {
    const snapshot = await this.getBillingSnapshot(organizationId);

    return snapshot.entitled;
  }

  async requireActiveEntitlement(organizationId: string) {
    const snapshot = await this.getBillingSnapshot(organizationId);

    if (!snapshot.entitled) {
      throw new HttpException("Active subscription required.", 402);
    }

    return snapshot;
  }

  private toIsoString(value: Date | null) {
    return value ? value.toISOString() : null;
  }
}
