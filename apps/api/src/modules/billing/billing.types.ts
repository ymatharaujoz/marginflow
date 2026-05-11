export const BILLING_INTERVALS = ["monthly", "annual"] as const;
export const BILLING_STATE_STATUSES = [
  "active",
  "inactive",
  "no_checkout",
  "pending_onboarding",
] as const;

export type BillingInterval = (typeof BILLING_INTERVALS)[number];
export type BillingStateStatus = (typeof BILLING_STATE_STATUSES)[number];

export type BillingSnapshot = {
  organizationId: string | null;
  entitled: boolean;
  status?: BillingStateStatus;
  customer: {
    externalCustomerId: string;
    id: string;
  } | null;
  subscription: {
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: string | null;
    currentPeriodStart: string | null;
    externalSubscriptionId: string | null;
    id: string;
    interval: string;
    planCode: string;
    status: string;
  } | null;
  pendingCheckout?: {
    id: string;
    checkoutSessionId: string;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    interval: string;
    planCode: string;
    status: string;
  } | null;
};
