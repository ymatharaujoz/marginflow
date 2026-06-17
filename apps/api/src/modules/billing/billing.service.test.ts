import {
  billingCustomers,
  billingTrials,
  pendingCheckouts,
  subscriptionEvents,
  subscriptions,
} from "@lucreii/database";
import { InternalServerErrorException } from "@nestjs/common";
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
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/lucreii",
  NODE_ENV: "test",
  STRIPE_PRICE_BUSINESS_ANNUAL: "price_business_annual",
  STRIPE_PRICE_BUSINESS_MONTHLY: "price_business_monthly",
  STRIPE_PRICE_PRO_ANNUAL: "price_pro_annual",
  STRIPE_PRICE_PRO_MONTHLY: "price_pro_monthly",
  STRIPE_PRICE_START_ANNUAL: "price_start_annual",
  STRIPE_PRICE_START_MONTHLY: "price_start_monthly",
  STRIPE_SECRET_KEY: "stripe",
  STRIPE_WEBHOOK_SECRET: "webhook",
  SYNC_RELAX_GUARDS: false,
  WEB_APP_ORIGIN: "http://localhost:3000",
} as const;

function createInsertMock() {
  const insertSubscriptionValues = vi.fn().mockReturnValue({
    returning: vi.fn().mockResolvedValue([{ id: "subscription_local_123" }]),
  });
  const insertEventValues = vi.fn().mockResolvedValue(undefined);
  const insertPendingCheckoutValues = vi.fn().mockReturnValue({
    returning: vi.fn().mockResolvedValue([{ id: "pending_checkout_123" }]),
  });
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
  const insertTrialValues = vi.fn().mockReturnValue({
    onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
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

    if (table === pendingCheckouts) {
      return {
        values: insertPendingCheckoutValues,
      };
    }

    if (table === billingCustomers) {
      return {
        values: insertCustomerValues,
      };
    }

    if (table === billingTrials) {
      return {
        values: insertTrialValues,
      };
    }

    throw new Error("Unexpected insert target.");
  });

  return {
    insert,
    insertCustomerValues,
    insertEventValues,
    insertPendingCheckoutValues,
    insertSubscriptionValues,
    insertTrialValues,
  };
}

function createService(envOverrides: Partial<typeof env> = {}) {
  const {
    insert,
    insertCustomerValues,
    insertEventValues,
    insertPendingCheckoutValues,
    insertSubscriptionValues,
    insertTrialValues,
  } = createInsertMock();
  const updateReturning = vi.fn().mockResolvedValue([{ id: "trial_123" }]);
  const updateWhere = vi.fn().mockReturnValue({ returning: updateReturning });
  const updateSet = vi.fn().mockReturnValue({ where: updateWhere });
  const db = {
    insert,
    query: {
      billingCustomers: {
        findFirst: vi.fn(),
      },
      pendingCheckouts: {
        findFirst: vi.fn(),
      },
      subscriptions: {
        findFirst: vi.fn(),
      },
      billingTrials: {
        findFirst: vi.fn(),
      },
    },
    update: vi.fn().mockReturnValue({ set: updateSet }),
  };
  const stripe = {
    checkout: {
      sessions: {
        create: vi.fn(),
        expire: vi.fn(),
        retrieve: vi.fn(),
      },
    },
    customers: {
      create: vi.fn(),
      retrieve: vi.fn(),
    },
    prices: {
      retrieve: vi.fn(),
    },
    subscriptions: {
      retrieve: vi.fn(),
    },
    webhooks: {
      constructEvent: vi.fn(),
    },
  };
  stripe.prices.retrieve.mockImplementation(async (priceId: string) => ({
    active: true,
    id: priceId,
  }));

  return {
    db,
    insertCustomerValues,
    insertEventValues,
    insertPendingCheckoutValues,
    insertSubscriptionValues,
    insertTrialValues,
    service: new BillingService(
      db as never,
      stripe as never,
      {
        ...env,
        ...envOverrides,
      },
    ),
    stripe,
    updateSet,
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
    db.query.billingTrials.findFirst.mockResolvedValue({
      checkoutSessionId: null,
      email: "owner@lucreii.local",
      id: "trial_123",
      interval: null,
      redeemedAt: null,
      reservedUntil: null,
      userId: "user_123",
    });
    stripe.customers.retrieve.mockResolvedValue({
      id: "cus_123",
    } as Stripe.Response<Stripe.Customer>);
    stripe.prices.retrieve.mockResolvedValue({
      active: true,
      id: "price_start_monthly",
    } as Stripe.Response<Stripe.Price>);
    stripe.checkout.sessions.create.mockResolvedValue({
      id: "cs_123",
      url: "https://checkout.stripe.test/session",
    });

    await expect(
      service.createCheckoutSession(
        {
          organization: {
            id: "org_123",
            name: "Lucreii Org",
            role: "owner",
            slug: "lucreii-org",
          },
          session: {
            expiresAt: new Date("2026-04-23T00:00:00.000Z"),
            id: "session_123",
          },
          user: {
            email: "owner@lucreii.local",
            emailVerified: true,
            id: "user_123",
            image: null,
            name: "Mateus",
          },
        },
        "start",
        "monthly",
      ),
    ).resolves.toEqual({
      checkoutUrl: "https://checkout.stripe.test/session",
      sessionId: "cs_123",
    });

    expect(stripe.customers.retrieve).toHaveBeenCalledWith("cus_123");

    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cus_123",
        line_items: [
          {
            price: "price_start_monthly",
            quantity: 1,
          },
        ],
        mode: "subscription",
        payment_method_collection: "always",
        subscription_data: expect.objectContaining({
          trial_period_days: 7,
        }),
      }),
    );
    expect(stripe.prices.retrieve).toHaveBeenCalledWith("price_start_monthly");
  });

  it("reuses an open trial checkout for the same interval", async () => {
    const { db, service, stripe } = createService();
    db.query.billingCustomers.findFirst.mockResolvedValue({
      externalCustomerId: "cus_123",
      id: "billing_customer_123",
      organizationId: "org_123",
      provider: "stripe",
    });
    db.query.billingTrials.findFirst.mockResolvedValue({
      checkoutSessionId: "cs_open",
      email: "owner@lucreii.local",
      id: "trial_123",
      interval: "annual",
      planCode: "start",
      redeemedAt: null,
      reservedUntil: new Date("2099-01-01T00:00:00.000Z"),
      userId: "user_123",
    });
    stripe.customers.retrieve.mockResolvedValue({ id: "cus_123" });
    stripe.checkout.sessions.retrieve.mockResolvedValue({
      id: "cs_open",
      status: "open",
      url: "https://checkout.stripe.test/open",
    });

    await expect(
      service.createCheckoutSession(
        {
          organization: {
            id: "org_123",
            name: "Org",
            role: "owner",
            slug: "org",
          },
          session: { expiresAt: new Date("2099-01-01"), id: "session_123" },
          user: {
            email: "owner@lucreii.local",
            emailVerified: true,
            id: "user_123",
            image: null,
            name: "Owner",
          },
        },
        "start",
        "annual",
      ),
    ).resolves.toEqual({
      checkoutUrl: "https://checkout.stripe.test/open",
      sessionId: "cs_open",
    });

    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it("creates an immediate subscription checkout after trial redemption", async () => {
    const { db, service, stripe } = createService();
    db.query.billingCustomers.findFirst.mockResolvedValue({
      externalCustomerId: "cus_123",
      id: "billing_customer_123",
      organizationId: "org_123",
      provider: "stripe",
    });
    db.query.billingTrials.findFirst.mockResolvedValue({
      checkoutSessionId: "cs_previous",
      email: "owner@lucreii.local",
      id: "trial_123",
      interval: "monthly",
      planCode: "start",
      redeemedAt: new Date("2026-06-01T00:00:00.000Z"),
      reservedUntil: null,
      userId: "user_123",
    });
    stripe.customers.retrieve.mockResolvedValue({ id: "cus_123" });
    stripe.checkout.sessions.create.mockResolvedValue({
      id: "cs_paid",
      url: "https://checkout.stripe.test/paid",
    });

    await service.createCheckoutSession(
      {
        organization: {
          id: "org_123",
          name: "Org",
          role: "owner",
          slug: "org",
        },
        session: { expiresAt: new Date("2099-01-01"), id: "session_123" },
        user: {
          email: "owner@lucreii.local",
          emailVerified: true,
          id: "user_123",
          image: null,
          name: "Owner",
        },
      },
        "start",
        "monthly",
    );

    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_method_collection: "always",
        subscription_data: expect.not.objectContaining({
          trial_period_days: expect.anything(),
        }),
      }),
    );
  });

  it("does not grant trial for Pro checkout even when the user is trial eligible", async () => {
    const { db, service, stripe } = createService();
    db.query.billingCustomers.findFirst.mockResolvedValue({
      externalCustomerId: "cus_123",
      id: "billing_customer_123",
      organizationId: "org_123",
      provider: "stripe",
    });
    db.query.billingTrials.findFirst.mockResolvedValue({
      checkoutSessionId: null,
      email: "owner@lucreii.local",
      id: "trial_123",
      interval: null,
      planCode: null,
      redeemedAt: null,
      reservedUntil: null,
      userId: "user_123",
    });
    stripe.customers.retrieve.mockResolvedValue({ id: "cus_123" });
    stripe.prices.retrieve.mockResolvedValue({
      active: true,
      id: "price_pro_monthly",
    } as Stripe.Response<Stripe.Price>);
    stripe.checkout.sessions.create.mockResolvedValue({
      id: "cs_pro",
      url: "https://checkout.stripe.test/pro",
    });

    await service.createCheckoutSession(
      {
        organization: {
          id: "org_123",
          name: "Org",
          role: "owner",
          slug: "org",
        },
        session: { expiresAt: new Date("2099-01-01"), id: "session_123" },
        user: {
          email: "owner@lucreii.local",
          emailVerified: true,
          id: "user_123",
          image: null,
          name: "Owner",
        },
      },
      "pro",
      "monthly",
    );

    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [
          {
            price: "price_pro_monthly",
            quantity: 1,
          },
        ],
        metadata: expect.objectContaining({
          planCode: "pro",
          trialEligible: "false",
        }),
        subscription_data: expect.not.objectContaining({
          trial_period_days: expect.anything(),
        }),
      }),
    );
  });

  it("throws clear error when configured Stripe price does not exist", async () => {
    const { db, service, stripe } = createService();
    db.query.billingCustomers.findFirst.mockResolvedValue({
      externalCustomerId: "cus_123",
      id: "billing_customer_123",
      organizationId: "org_123",
      provider: "stripe",
    });
    db.query.billingTrials.findFirst.mockResolvedValue({
      checkoutSessionId: null,
      email: "owner@lucreii.local",
      id: "trial_123",
      interval: null,
      planCode: null,
      redeemedAt: null,
      reservedUntil: null,
      userId: "user_123",
    });
    stripe.customers.retrieve.mockResolvedValue({ id: "cus_123" });
    const missingPrice = new Stripe.errors.StripeInvalidRequestError({
      code: "resource_missing",
      message: "No such price: 'price_start_monthly'",
      param: "line_items[0][price]",
      type: "invalid_request_error",
    } as Stripe.StripeRawError);
    stripe.prices.retrieve.mockRejectedValue(missingPrice);

    await expect(
      service.createCheckoutSession(
        {
          organization: {
            id: "org_123",
            name: "Org",
            role: "owner",
            slug: "org",
          },
          session: { expiresAt: new Date("2099-01-01"), id: "session_123" },
          user: {
            email: "owner@lucreii.local",
            emailVerified: true,
            id: "user_123",
            image: null,
            name: "Owner",
          },
        },
        "start",
        "monthly",
      ),
    ).rejects.toThrow(InternalServerErrorException);

    await expect(
      service.createCheckoutSession(
        {
          organization: {
            id: "org_123",
            name: "Org",
            role: "owner",
            slug: "org",
          },
          session: { expiresAt: new Date("2099-01-01"), id: "session_123" },
          user: {
            email: "owner@lucreii.local",
            emailVerified: true,
            id: "user_123",
            image: null,
            name: "Owner",
          },
        },
        "start",
        "monthly",
      ),
    ).rejects.toThrow(
      "Stripe billing configuration is invalid for plan start (monthly).",
    );
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it("throws clear error when required Stripe price configuration is missing", async () => {
    const { db, service, stripe } = createService({
      STRIPE_PRICE_START_MONTHLY: undefined,
    });
    db.query.billingCustomers.findFirst.mockResolvedValue({
      externalCustomerId: "cus_123",
      id: "billing_customer_123",
      organizationId: "org_123",
      provider: "stripe",
    });
    db.query.billingTrials.findFirst.mockResolvedValue({
      checkoutSessionId: null,
      email: "owner@lucreii.local",
      id: "trial_123",
      interval: null,
      planCode: null,
      redeemedAt: null,
      reservedUntil: null,
      userId: "user_123",
    });
    stripe.customers.retrieve.mockResolvedValue({ id: "cus_123" });

    await expect(
      service.createCheckoutSession(
        {
          organization: {
            id: "org_123",
            name: "Org",
            role: "owner",
            slug: "org",
          },
          session: { expiresAt: new Date("2099-01-01"), id: "session_123" },
          user: {
            email: "owner@lucreii.local",
            emailVerified: true,
            id: "user_123",
            image: null,
            name: "Owner",
          },
        },
        "start",
        "monthly",
      ),
    ).rejects.toThrow(
      "Missing Stripe price configuration for plan start (monthly).",
    );

    expect(stripe.prices.retrieve).not.toHaveBeenCalled();
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it("does not grant another trial when a reserved Checkout already completed", async () => {
    const { db, service, stripe } = createService();
    db.query.billingCustomers.findFirst.mockResolvedValue({
      externalCustomerId: "cus_123",
      id: "billing_customer_123",
      organizationId: "org_123",
      provider: "stripe",
    });
    db.query.billingTrials.findFirst.mockResolvedValue({
      checkoutSessionId: "cs_complete",
      email: "owner@lucreii.local",
      id: "trial_123",
      interval: "monthly",
      planCode: "start",
      redeemedAt: null,
      reservedUntil: new Date("2099-01-01T00:00:00.000Z"),
      userId: "user_123",
    });
    stripe.customers.retrieve.mockResolvedValue({ id: "cus_123" });
    stripe.checkout.sessions.retrieve.mockResolvedValue({
      id: "cs_complete",
      status: "complete",
      url: null,
    });
    stripe.checkout.sessions.create.mockResolvedValue({
      id: "cs_paid",
      url: "https://checkout.stripe.test/paid",
    });

    await service.createCheckoutSession(
      {
        organization: {
          id: "org_123",
          name: "Org",
          role: "owner",
          slug: "org",
        },
        session: { expiresAt: new Date("2099-01-01"), id: "session_123" },
        user: {
          email: "owner@lucreii.local",
          emailVerified: true,
          id: "user_123",
          image: null,
          name: "Owner",
        },
      },
        "start",
        "annual",
    );

    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        subscription_data: expect.not.objectContaining({
          trial_period_days: expect.anything(),
        }),
      }),
    );
  });

  it("releases an unredeemed trial reservation when Checkout expires", async () => {
    const { service, stripe, updateSet } = createService();
    stripe.webhooks.constructEvent.mockReturnValue({
      created: 1_777_777_777,
      data: {
        object: {
          id: "cs_expired",
          metadata: {
            userId: "user_123",
          },
        } as unknown as Stripe.Checkout.Session,
      },
      type: "checkout.session.expired",
    });

    await service.processWebhook(Buffer.from("{}"), "good_signature");

    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        checkoutSessionId: null,
        interval: null,
        reservedUntil: null,
      }),
    );
  });

  it("rejects webhook requests when Stripe signature verification fails", async () => {
    const { service, stripe } = createService();
    stripe.webhooks.constructEvent.mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    await expect(
      service.processWebhook(Buffer.from("{}"), "bad_signature"),
    ).rejects.toThrow("Invalid signature");
  });

  it("mirrors subscription state locally from Stripe subscription events", async () => {
    const { db, insertEventValues, insertSubscriptionValues, service, stripe } =
      createService();
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
                  id: "price_business_annual",
                  recurring: {
                    interval: "year",
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
        interval: "annual",
        organizationId: "org_123",
        planCode: "business",
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

  it("mirrors subscription state locally after confirming a completed Checkout session", async () => {
    const { db, insertSubscriptionValues, service, stripe } = createService();

    db.query.billingCustomers.findFirst.mockResolvedValue(null);
    db.query.subscriptions.findFirst.mockResolvedValue(null);

    stripe.checkout.sessions.retrieve.mockResolvedValue({
      customer: "cus_456",
      id: "cs_456",
      metadata: {
        organizationId: "org_888",
        userId: "user_888",
      },
      mode: "subscription",
      status: "complete",
      subscription: "sub_confirm_1",
    } as unknown as Stripe.Response<Stripe.Checkout.Session>);

    stripe.subscriptions.retrieve.mockResolvedValue({
      cancel_at_period_end: false,
      current_period_end: 1_777_888_888,
      current_period_start: 1_777_000_000,
      customer: "cus_456",
      id: "sub_confirm_1",
      items: {
        data: [
          {
            price: {
              id: "price_start_monthly",
              recurring: {
                interval: "month",
              } as never,
            },
          },
        ],
      },
      status: "trialing",
    } as unknown as Stripe.Response<Stripe.Subscription>);

    insertSubscriptionValues.mockReturnValueOnce({
      returning: vi
        .fn()
        .mockResolvedValue([{ id: "subscription_local_confirm" }]),
    });

    await service.confirmCheckoutSession(
      {
        organization: {
          id: "org_888",
          name: "Org",
          role: "owner",
          slug: "org",
        },
        session: {
          expiresAt: new Date("2026-05-01T00:00:00.000Z"),
          id: "session_confirm",
        },
        user: {
          email: "owner@lucreii.local",
          emailVerified: true,
          id: "user_888",
          image: null,
          name: "Owner",
        },
      },
      "cs_456",
    );

    expect(stripe.checkout.sessions.retrieve).toHaveBeenCalledWith("cs_456", {
      expand: ["subscription"],
    });
    expect(insertSubscriptionValues).toHaveBeenCalledWith(
      expect.objectContaining({
        externalSubscriptionId: "sub_confirm_1",
        organizationId: "org_888",
        status: "trialing",
      }),
    );
  });

  it("marks local subscription canceled during reconcile when Stripe returns resource_missing", async () => {
    const { db, service, stripe } = createService();
    db.query.subscriptions.findFirst.mockResolvedValue({
      billingCustomerId: "bc_local",
      externalSubscriptionId: "sub_stale_active",
      id: "local_sub",
      organizationId: "org_retry",
      provider: "stripe",
      status: "active",
    });

    const missing = new Stripe.errors.StripeInvalidRequestError({
      code: "resource_missing",
      message: "No such subscription",
      type: "invalid_request_error",
    } as Stripe.StripeRawError);
    stripe.subscriptions.retrieve.mockRejectedValue(missing);

    const where = vi.fn().mockResolvedValue(undefined);
    const set = vi.fn().mockReturnValue({ where });
    db.update.mockReturnValue({ set });

    await service.reconcileOrganizationSubscriptionWithStripe("org_retry");

    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        cancelAtPeriodEnd: false,
        status: "canceled",
      }),
    );
  });

  it("mirrors a canceled Stripe subscription during reconcile while Postgres showed active", async () => {
    const { db, service, stripe } = createService();

    db.query.subscriptions.findFirst.mockResolvedValueOnce({
      billingCustomerId: "bc_local",
      externalSubscriptionId: "sub_live_cancel",
      id: "local_sub",
      organizationId: "org_retry",
      provider: "stripe",
      status: "active",
    });
    db.query.subscriptions.findFirst.mockResolvedValueOnce({
      id: "local_sub",
      organizationId: "org_retry",
    });

    db.query.billingCustomers.findFirst.mockResolvedValueOnce({
      externalCustomerId: "cus_777",
      id: "bc_local",
      organizationId: "org_retry",
      provider: "stripe",
    });

    stripe.subscriptions.retrieve.mockResolvedValueOnce({
      cancel_at_period_end: false,
      current_period_end: 1_780_888_888,
      current_period_start: 1_780_100_000,
      customer: "cus_777",
      id: "sub_live_cancel",
      items: {
        data: [
          {
            price: {
              id: "price_start_monthly",
              recurring: {
                interval: "month",
              } as never,
            },
          },
        ],
      },
      status: "canceled",
    } as unknown as Stripe.Response<Stripe.Subscription>);

    const returning = vi.fn().mockResolvedValue([{ id: "local_sub" }]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });
    db.update.mockReturnValue({ set });

    await service.reconcileOrganizationSubscriptionWithStripe("org_retry");

    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org_retry",
        status: "canceled",
      }),
    );
  });
});
