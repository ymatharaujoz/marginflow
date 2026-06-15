import { describe, expect, it, vi } from "vitest";
import { EntitlementsService } from "./entitlements.service";

function createService({
  billingCustomer = null,
  billingTrial = null,
  subscription = null,
  pendingCheckout = null,
  pendingCheckoutError,
}: {
  billingCustomer?: unknown;
  billingTrial?: unknown;
  subscription?: unknown;
  pendingCheckout?: unknown;
  pendingCheckoutError?: unknown;
} = {}) {
  const pendingFindFirst = vi.fn();
  if (pendingCheckoutError !== undefined) {
    pendingFindFirst.mockRejectedValue(pendingCheckoutError);
  } else {
    pendingFindFirst.mockResolvedValue(pendingCheckout);
  }

  const db = {
    query: {
      billingCustomers: {
        findFirst: vi.fn().mockResolvedValue(billingCustomer),
      },
      billingTrials: {
        findFirst: vi.fn().mockResolvedValue(billingTrial),
      },
      subscriptions: {
        findFirst: vi.fn().mockResolvedValue(subscription),
      },
      pendingCheckouts: {
        findFirst: pendingFindFirst,
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

  it("returns trial eligibility and trial dates in billing snapshot", async () => {
    const { service } = createService({
      billingTrial: {
        redeemedAt: null,
      },
      subscription: {
        billingCustomerId: "billing_customer_row",
        cancelAtPeriodEnd: false,
        currentPeriodEnd: new Date("2026-06-21T00:00:00.000Z"),
        currentPeriodStart: new Date("2026-06-14T00:00:00.000Z"),
        externalSubscriptionId: "sub_trial",
        id: "subscription_123",
        interval: "monthly",
        planCode: "marginflow",
        status: "trialing",
        trialEnd: new Date("2026-06-21T00:00:00.000Z"),
        trialStart: new Date("2026-06-14T00:00:00.000Z"),
      },
    });

    await expect(
      service.getBillingSnapshot({
        organizationId: "org_123",
        userId: "user_123",
      }),
    ).resolves.toMatchObject({
      trialDays: 7,
      trialEligible: true,
      subscription: {
        trialEnd: "2026-06-21T00:00:00.000Z",
        trialStart: "2026-06-14T00:00:00.000Z",
      },
    });
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

  it("blocks past-due subscriptions immediately", async () => {
    const { service } = createService({
      subscription: {
        billingCustomerId: "billing_customer_row",
        cancelAtPeriodEnd: false,
        currentPeriodEnd: new Date("2026-06-21T00:00:00.000Z"),
        currentPeriodStart: new Date("2026-06-14T00:00:00.000Z"),
        externalSubscriptionId: "sub_past_due",
        id: "subscription_123",
        interval: "monthly",
        planCode: "marginflow",
        status: "past_due",
        trialEnd: new Date("2026-06-21T00:00:00.000Z"),
        trialStart: new Date("2026-06-14T00:00:00.000Z"),
      },
    });

    await expect(service.isOrganizationEntitled("org_123")).resolves.toBe(
      false,
    );
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
      pendingCheckout: null,
      status: "inactive",
      subscription: null,
      trialDays: 7,
      trialEligible: false,
    });
  });

  it("treats a missing pending_checkouts table as no pending checkout", async () => {
    const err = Object.assign(
      new Error('relation "pending_checkouts" does not exist'),
      {
        code: "42P01",
      },
    );
    const { service } = createService({
      subscription: null,
      pendingCheckoutError: err,
    });

    await expect(
      service.getBillingSnapshot({
        organizationId: null,
        userId: "user_123",
      }),
    ).resolves.toMatchObject({
      entitled: false,
      organizationId: null,
      pendingCheckout: null,
      status: "no_checkout",
      subscription: null,
    });
  });
});
