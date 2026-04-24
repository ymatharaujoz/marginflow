import {
  billingCustomers,
  subscriptionEvents,
  subscriptions,
} from "@marginflow/database";
import Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";
import { BillingService } from "./billing.service";

const env = {
  API_DB_POOL_MAX: 5,
  API_HOST: "127.0.0.1",
  API_PORT: 4000,
  AUTH_TRUSTED_ORIGINS: undefined,
  BETTER_AUTH_SECRET: "secret",
  BETTER_AUTH_URL: "http://localhost:4000",
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/marginflow",
  GOOGLE_CLIENT_ID: "google-client-id",
  GOOGLE_CLIENT_SECRET: "google-client-secret",
  NODE_ENV: "test",
  STRIPE_PRICE_ANNUAL: "price_annual",
  STRIPE_PRICE_MONTHLY: "price_monthly",
  STRIPE_SECRET_KEY: "stripe",
  STRIPE_WEBHOOK_SECRET: "webhook",
  WEB_APP_ORIGIN: "http://localhost:3000",
} as const;

function createInsertMock() {
  const insertSubscriptionValues = vi.fn().mockReturnValue({
    returning: vi.fn().mockResolvedValue([{ id: "subscription_local_123" }]),
  });
  const insertEventValues = vi.fn().mockResolvedValue(undefined);
  const insertCustomerValues = vi.fn().mockReturnValue({
    returning: vi.fn().mockResolvedValue([
      {
        externalCustomerId: "cus_123",
        id: "billing_customer_123",
        organizationId: "org_123",
        provider: "stripe",
      },
    ]),
  });
  const insert = vi.fn((table: unknown) => {
    if (table === subscriptions) {
      return {
        values: insertSubscriptionValues,
      };
    }

    if (table === subscriptionEvents) {
      return {
        values: insertEventValues,
      };
    }

    if (table === billingCustomers) {
      return {
        values: insertCustomerValues,
      };
    }

    throw new Error("Unexpected insert target.");
  });

  return {
    insert,
    insertCustomerValues,
    insertEventValues,
    insertSubscriptionValues,
  };
}

function createService() {
  const { insert, insertCustomerValues, insertEventValues, insertSubscriptionValues } =
    createInsertMock();
  const db = {
    insert,
    query: {
      billingCustomers: {
        findFirst: vi.fn(),
      },
      subscriptions: {
        findFirst: vi.fn(),
      },
    },
    update: vi.fn(),
  };
  const stripe = {
    checkout: {
      sessions: {
        create: vi.fn(),
      },
    },
    customers: {
      create: vi.fn(),
    },
    subscriptions: {
      retrieve: vi.fn(),
    },
    webhooks: {
      constructEvent: vi.fn(),
    },
  };

  return {
    db,
    insertCustomerValues,
    insertEventValues,
    insertSubscriptionValues,
    service: new BillingService(db as never, stripe as never, env),
    stripe,
  };
}

describe("BillingService", () => {
  it("creates a checkout session for an existing organization billing customer", async () => {
    const { db, service, stripe } = createService();
    const existingCustomer = {
      externalCustomerId: "cus_123",
      id: "billing_customer_123",
      organizationId: "org_123",
      provider: "stripe",
    };
    db.query.billingCustomers.findFirst.mockResolvedValue(existingCustomer);
    stripe.checkout.sessions.create.mockResolvedValue({
      id: "cs_123",
      url: "https://checkout.stripe.test/session",
    });

    await expect(
      service.createCheckoutSession(
        {
          organization: {
            id: "org_123",
            name: "MarginFlow Org",
            role: "owner",
            slug: "marginflow-org",
          },
          session: {
            expiresAt: new Date("2026-04-23T00:00:00.000Z"),
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
        "monthly",
      ),
    ).resolves.toEqual({
      checkoutUrl: "https://checkout.stripe.test/session",
      sessionId: "cs_123",
    });

    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cus_123",
        line_items: [
          {
            price: "price_monthly",
            quantity: 1,
          },
        ],
        mode: "subscription",
      }),
    );
  });

  it("rejects webhook requests when Stripe signature verification fails", async () => {
    const { service, stripe } = createService();
    stripe.webhooks.constructEvent.mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    await expect(service.processWebhook(Buffer.from("{}"), "bad_signature")).rejects.toThrow(
      "Invalid signature",
    );
  });

  it("mirrors subscription state locally from Stripe subscription events", async () => {
    const { db, insertEventValues, insertSubscriptionValues, service, stripe } = createService();
    db.query.billingCustomers.findFirst
      .mockResolvedValueOnce({
        externalCustomerId: "cus_123",
        id: "billing_customer_123",
        organizationId: "org_123",
        provider: "stripe",
      })
      .mockResolvedValueOnce({
        externalCustomerId: "cus_123",
        id: "billing_customer_123",
        organizationId: "org_123",
        provider: "stripe",
      });
    db.query.subscriptions.findFirst.mockResolvedValueOnce(null);
    stripe.webhooks.constructEvent.mockReturnValue({
      created: 1_777_777_777,
      data: {
        object: {
          cancel_at_period_end: false,
          current_period_end: 1_777_888_888,
          current_period_start: 1_777_000_000,
          customer: "cus_123",
          id: "sub_123",
          items: {
            data: [
              {
                price: {
                  id: "price_monthly",
                  recurring: {
                    interval: "month",
                  } as never,
                },
              },
            ],
          },
          status: "active",
        } as unknown as Stripe.Subscription,
      },
      type: "customer.subscription.created",
    });

    await service.processWebhook(Buffer.from("{}"), "good_signature");

    expect(insertSubscriptionValues).toHaveBeenCalledWith(
      expect.objectContaining({
        billingCustomerId: "billing_customer_123",
        externalSubscriptionId: "sub_123",
        interval: "monthly",
        organizationId: "org_123",
        planCode: "marginflow",
        status: "active",
      }),
    );
    expect(insertEventValues).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "customer.subscription.created",
        organizationId: "org_123",
        provider: "stripe",
        subscriptionId: "subscription_local_123",
      }),
    );
  });
});
