import { describe, expect, it } from "vitest";
import { hasManageableBillingSubscription } from "./protected-app-route";

describe("hasManageableBillingSubscription", () => {
  it.each(["trialing", "active", "past_due", "unpaid", "paused"])(
    "allows Stripe Portal access for %s subscriptions",
    (status) => {
      expect(
        hasManageableBillingSubscription({
          customer: null,
          entitled: status === "trialing" || status === "active",
          organizationId: "org_123",
          pendingCheckout: null,
          status:
            status === "trialing" || status === "active"
              ? "active"
              : "inactive",
          subscription: {
            cancelAtPeriodEnd: false,
            currentPeriodEnd: null,
            currentPeriodStart: null,
            externalSubscriptionId: "sub_123",
            id: "subscription_123",
            interval: "monthly",
            planCode: "lucreii",
            status,
            trialEnd: null,
            trialStart: null,
          },
          trialDays: 7,
          trialEligible: false,
        }),
      ).toBe(true);
    },
  );

  it("does not treat canceled subscriptions as manageable", () => {
    expect(
      hasManageableBillingSubscription({
        customer: null,
        entitled: false,
        organizationId: "org_123",
        pendingCheckout: null,
        status: "inactive",
        subscription: {
          cancelAtPeriodEnd: false,
          currentPeriodEnd: null,
          currentPeriodStart: null,
          externalSubscriptionId: "sub_123",
          id: "subscription_123",
          interval: "monthly",
          planCode: "lucreii",
          status: "canceled",
          trialEnd: null,
          trialStart: null,
        },
        trialDays: 7,
        trialEligible: false,
      }),
    ).toBe(false);
  });
});
