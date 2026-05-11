export type OnboardingStatus = "complete" | "organization_missing";

export type AuthenticatedOrganization = {
  id: string;
  name: string;
  slug: string;
  role: string;
};

export type AuthState = {
  session: {
    id: string;
    expiresAt: string;
  };
  user: {
    id: string;
    email: string;
    name: string;
    image: string | null;
    emailVerified: boolean;
  };
  organization: AuthenticatedOrganization | null;
  onboardingStatus: OnboardingStatus;
};

export type BillingStateStatus =
  | "active"
  | "inactive"
  | "no_checkout"
  | "pending_onboarding";

export type BillingPendingCheckout = {
  id: string;
  checkoutSessionId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  interval: string;
  planCode: string;
  status: string;
} | null;

export type BillingState = {
  organizationId: string | null;
  entitled: boolean;
  status: BillingStateStatus;
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
  pendingCheckout: BillingPendingCheckout;
};

export type CreateOrganizationOnboardingValues = {
  name: string;
  slug?: string | null;
};

export type CompleteOnboardingResponse = {
  organization: AuthenticatedOrganization;
  billing: BillingState;
};
