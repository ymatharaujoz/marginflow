import type { ServerAuthState } from "./server-auth";
import type { ServerBillingState } from "./server-billing";

const MOCK_ORG_ID = "mock-org-local";
const MOCK_USER_ID = "mock-user-local";

/**
 * Fixtures para testes ou telas que simulam estado sem API.
 * Rotas server (readServerAuthState / readServerBillingState) usam a API real para gating.
 */
export function getMockServerAuthState(): ServerAuthState {
  return {
    session: {
      id: "mock-session-local",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    user: {
      id: MOCK_USER_ID,
      email: "dev@marginflow.local",
      name: "Conta de demonstração",
      image: null,
      emailVerified: true,
    },
    organization: {
      id: MOCK_ORG_ID,
      name: "Loja demo (mock)",
      slug: "loja-demo-mock",
      role: "owner",
    },
  };
}

export function getMockServerBillingState(): ServerBillingState {
  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  return {
    organizationId: MOCK_ORG_ID,
    entitled: true,
    status: "active",
    customer: {
      id: "mock-customer-local",
      externalCustomerId: "cus_mock_local",
    },
    subscription: {
      id: "mock-subscription-local",
      externalSubscriptionId: "sub_mock_local",
      planCode: "pro_monthly_mock",
      status: "active",
      interval: "month",
      cancelAtPeriodEnd: false,
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
    },
    pendingCheckout: null,
  };
}
