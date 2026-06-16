import type {
  BillingInterval,
  BillingPlanCode,
} from "@lucreii/types";
import { BILLING_INTERVALS, BILLING_PLAN_CODES } from "@lucreii/types";

export const BILLING_STATE_STATUSES = [
  "active",
  "inactive",
  "no_checkout",
  "pending_onboarding",
] as const;

export { BILLING_INTERVALS, BILLING_PLAN_CODES };
export type { BillingInterval, BillingPlanCode };
export type BillingStateStatus = (typeof BILLING_STATE_STATUSES)[number];

export type BillingSnapshot = {
  organizationId: string | null;
  entitled: boolean;
  trialEligible?: boolean;
  trialDays?: number;
  status?: BillingStateStatus;
  customer: {
    externalCustomerId: string;
    id: string;
  } | null;
  subscription: {
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: string | null;
    currentPeriodStart: string | null;
    trialEnd?: string | null;
    trialStart?: string | null;
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
