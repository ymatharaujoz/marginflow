import { afterEach, describe, expect, it, vi } from "vitest";
import { createSignedWebAuthSession } from "./web-auth-session";
import { readServerBillingState } from "./server-billing";

const cookiesMock = vi.hoisted(() => vi.fn());

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

function buildCookieValue() {
  return createSignedWebAuthSession(
    {
      authState: {
        onboardingStatus: "complete",
        organization: {
          id: "org_123",
          name: "MarginFlow",
          role: "owner",
          slug: "marginflow",
        },
        session: {
          expiresAt: "2026-04-22T00:00:00.000Z",
          id: "session_123",
        },
        user: {
          email: "owner@marginflow.local",
          emailVerified: true,
          id: "user_123",
          image: null,
          name: "Mateus",
        },
      },
      remoteSessionToken: "remote_session_token_123",
    },
    "marginflow-web-session-dev-secret",
  );
}

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
    cookiesMock.mockReset();
    vi.restoreAllMocks();
  });

  it("returns null when mirrored web session is missing", async () => {
    cookiesMock.mockResolvedValue({
      get: vi.fn(() => undefined),
    });

    await expect(readServerBillingState()).resolves.toBeNull();
  });

  it("parses billing snapshot payload from Railway", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000";
    cookiesMock.mockResolvedValue({
      get: vi.fn(() => ({ value: buildCookieValue() })),
    });
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
    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:4000/billing/subscription",
      expect.objectContaining({
        cache: "no-store",
        headers: {
          cookie: "__Secure-better-auth.session_token=remote_session_token_123; better-auth.session_token=remote_session_token_123",
        },
      }),
    );
  });
});
