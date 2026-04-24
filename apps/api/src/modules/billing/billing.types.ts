export const BILLING_INTERVALS = ["monthly", "annual"] as const;

export type BillingInterval = (typeof BILLING_INTERVALS)[number];

export type BillingSnapshot = {
  organizationId: string;
  entitled: boolean;
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
};
