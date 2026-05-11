import { afterEach, describe, expect, it, vi } from "vitest";
import { readServerBillingState } from "./server-billing";

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({ cookie: "better-auth.session_token=token" })),
}));

describe("readServerBillingState", () => {
  const originalFetch = global.fetch;
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  const originalApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalAppUrl) {
      process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
    } else {
      delete process.env.NEXT_PUBLIC_APP_URL;
    }
    if (originalApiBaseUrl) {
      process.env.NEXT_PUBLIC_API_BASE_URL = originalApiBaseUrl;
    } else {
      delete process.env.NEXT_PUBLIC_API_BASE_URL;
    }
    vi.restoreAllMocks();
  });

  it("returns null on 401", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000";
    global.fetch = vi.fn(async () => new Response(null, { status: 401 })) as typeof fetch;

    await expect(readServerBillingState()).resolves.toBeNull();
  });

  it("parses billing snapshot payload", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000";
    global.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            data: {
              customer: {
                externalCustomerId: "cus_123",
                id: "billing_customer_123",
              },
              entitled: false,
              organizationId: "org_123",
              pendingCheckout: null,
              status: "inactive",
              subscription: {
                cancelAtPeriodEnd: false,
                currentPeriodEnd: null,
                currentPeriodStart: null,
                externalSubscriptionId: null,
                id: "subscription_123",
                interval: "monthly",
                planCode: "marginflow",
                status: "inactive",
              },
            },
            error: null,
          }),
          {
            headers: {
              "content-type": "application/json",
            },
            status: 200,
          },
        ),
    ) as typeof fetch;

    await expect(readServerBillingState()).resolves.toEqual({
      customer: {
        externalCustomerId: "cus_123",
        id: "billing_customer_123",
      },
      entitled: false,
      organizationId: "org_123",
      pendingCheckout: null,
      status: "inactive",
      subscription: {
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
        currentPeriodStart: null,
        externalSubscriptionId: null,
        id: "subscription_123",
        interval: "monthly",
        planCode: "marginflow",
        status: "inactive",
      },
    });
  });
});
