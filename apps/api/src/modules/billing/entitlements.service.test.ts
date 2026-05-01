import { describe, expect, it, vi } from "vitest";
import { EntitlementsService } from "./entitlements.service";

function createService({
  billingCustomer = null,
  subscription = null,
}: {
  billingCustomer?: unknown;
  subscription?: unknown;
} = {}) {
  const db = {
    query: {
      billingCustomers: {
        findFirst: vi.fn().mockResolvedValue(billingCustomer),
      },
      subscriptions: {
        findFirst: vi.fn().mockResolvedValue(subscription),
      },
    },
  };

  return {
    db,
    service: new EntitlementsService(db as never),
  };
}

describe("EntitlementsService", () => {
  it("treats active subscriptions as entitled", async () => {
    const { service } = createService({
      subscription: {
        billingCustomerId: "billing_customer_row",
        cancelAtPeriodEnd: false,
        currentPeriodEnd: new Date("2026-05-01T00:00:00.000Z"),
        currentPeriodStart: new Date("2026-04-01T00:00:00.000Z"),
        externalSubscriptionId: "sub_123",
        id: "subscription_123",
        interval: "monthly",
        planCode: "marginflow",
        status: "active",
      },
    });

    await expect(service.isOrganizationEntitled("org_123")).resolves.toBe(true);
  });

  it("treats trialing subscriptions as entitled", async () => {
    const { service } = createService({
      subscription: {
        billingCustomerId: "billing_customer_row",
        cancelAtPeriodEnd: false,
        currentPeriodEnd: new Date("2026-05-01T00:00:00.000Z"),
        currentPeriodStart: new Date("2026-04-01T00:00:00.000Z"),
        externalSubscriptionId: "sub_123",
        id: "subscription_123",
        interval: "monthly",
        planCode: "marginflow",
        status: "trialing",
      },
    });

    await expect(service.isOrganizationEntitled("org_123")).resolves.toBe(true);
  });

  it("returns an inactive snapshot when no subscription exists", async () => {
    const { service } = createService({
      billingCustomer: {
        externalCustomerId: "cus_123",
        id: "billing_customer_123",
      },
    });

    await expect(service.getBillingSnapshot("org_123")).resolves.toEqual({
      customer: {
        externalCustomerId: "cus_123",
        id: "billing_customer_123",
      },
      entitled: false,
      organizationId: "org_123",
      subscription: null,
    });
  });
});
