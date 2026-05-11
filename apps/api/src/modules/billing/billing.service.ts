import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, isNotNull, or } from "drizzle-orm";
import type { DatabaseClient } from "@marginflow/database";
import {
  billingCustomers,
  pendingCheckouts,
  subscriptionEvents,
  subscriptions,
} from "@marginflow/database";
import Stripe from "stripe";
import type { ApiRuntimeEnv } from "@/common/config/api-env";
import {
  API_RUNTIME_ENV,
  DATABASE_CLIENT,
  STRIPE_CLIENT,
} from "@/common/tokens";
import type { AuthenticatedRequestContext } from "@/modules/auth/auth.types";
import type { BillingInterval } from "./billing.types";

const PLAN_CODE = "marginflow";

@Injectable()
export class BillingService {
  constructor(
    @Inject(DATABASE_CLIENT)
    private readonly db: DatabaseClient,
    @Inject(STRIPE_CLIENT)
    private readonly stripe: Stripe,
    @Inject(API_RUNTIME_ENV)
    private readonly env: ApiRuntimeEnv,
  ) {}

  async createCheckoutSession(
    authContext: AuthenticatedRequestContext,
    interval: BillingInterval,
  ) {
    const customerId = await this.ensureCheckoutCustomer(authContext);
    const successUrl = `${this.env.WEB_APP_ORIGIN}/app/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${this.env.WEB_APP_ORIGIN}/app/billing?checkout=cancelled`;
    const priceId =
      interval === "annual" ? this.env.STRIPE_PRICE_ANNUAL : this.env.STRIPE_PRICE_MONTHLY;

    const session = await this.stripe.checkout.sessions.create({
      cancel_url: cancelUrl,
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        interval,
        organizationId: authContext.organization?.id ?? "",
        planCode: PLAN_CODE,
        userId: authContext.user.id,
      },
      mode: "subscription",
      subscription_data: {
        metadata: {
          interval,
          organizationId: authContext.organization?.id ?? "",
          planCode: PLAN_CODE,
          userId: authContext.user.id,
        },
      },
      success_url: successUrl,
    });

    if (!session.url) {
      throw new BadRequestException("Stripe checkout session did not return a redirect URL.");
    }

    await this.upsertPendingCheckoutRecord({
      checkoutSessionId: session.id,
      interval,
      organizationId: authContext.organization?.id ?? null,
      stripeCustomerId: customerId,
      stripeSubscriptionId: null,
      userId: authContext.user.id,
      status: "created",
    });

    return {
      checkoutUrl: session.url,
      sessionId: session.id,
    };
  }

  async confirmCheckoutSession(
    authContext: AuthenticatedRequestContext,
    sessionId: string,
  ) {
    const session = await this.stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    if (session.mode !== "subscription") {
      throw new BadRequestException("Checkout session is not a subscription checkout.");
    }

    const sessionUserId = session.metadata?.userId;
    if (!sessionUserId || sessionUserId !== authContext.user.id) {
      throw new BadRequestException("Checkout session does not belong to this user.");
    }

    if (session.status !== "complete") {
      throw new BadRequestException("Checkout session is not complete yet.");
    }

    const customerId = this.readStripeCustomerIdFromSession(session.customer);
    const externalSubscriptionId = this.readStripeSubscriptionIdFromSession(session.subscription);
    const sessionOrganizationId = this.normalizeNullableString(session.metadata?.organizationId);
    const interval = this.resolveIntervalFromCheckoutSession(session);

    await this.upsertPendingCheckoutRecord({
      checkoutSessionId: session.id,
      interval,
      organizationId: sessionOrganizationId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: externalSubscriptionId,
      userId: authContext.user.id,
      status: sessionOrganizationId ? "completed" : "confirmed",
    });

    if (sessionOrganizationId) {
      await this.syncSubscriptionByExternalId(
        externalSubscriptionId,
        sessionOrganizationId,
        customerId,
      );
    }
  }

  async reconcileOrganizationSubscriptionWithStripe(organizationId: string) {
    const subscription = await this.db.query.subscriptions.findFirst({
      where: (table, { and, eq }) =>
        and(
          eq(table.organizationId, organizationId),
          eq(table.provider, "stripe"),
          isNotNull(table.billingCustomerId),
        ),
      orderBy: (table, { desc }) => [desc(table.updatedAt)],
    });

    if (!subscription?.externalSubscriptionId) {
      return;
    }

    if (subscription.status !== "active" && subscription.status !== "trialing") {
      return;
    }

    try {
      const live = await this.stripe.subscriptions.retrieve(subscription.externalSubscriptionId);
      const customerId = this.getStripeCustomerId(live.customer);
      await this.syncSubscriptionObject(live, organizationId, customerId);
    } catch (error: unknown) {
      if (
        error instanceof Stripe.errors.StripeInvalidRequestError &&
        error.code === "resource_missing"
      ) {
        await this.db
          .update(subscriptions)
          .set({
            cancelAtPeriodEnd: false,
            status: "canceled",
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.id, subscription.id));

        return;
      }

      throw error;
    }
  }

  async completePendingCheckoutForOrganization(input: {
    organizationId: string;
    userId: string;
  }) {
    return this.db.transaction((tx) =>
      this.completePendingCheckoutForOrganizationTx(tx as DatabaseClient, input),
    );
  }

  async completePendingCheckoutForOrganizationTx(
    tx: DatabaseClient,
    input: {
      organizationId: string;
      userId: string;
    },
  ) {
    const pendingCheckout = await tx.query.pendingCheckouts.findFirst({
      where: (table, { and, eq }) =>
        and(eq(table.userId, input.userId), eq(table.status, "confirmed")),
      orderBy: (table, { desc }) => [desc(table.updatedAt)],
    });

    if (!pendingCheckout?.stripeSubscriptionId) {
      throw new BadRequestException("No confirmed checkout is waiting for onboarding.");
    }

    const subscription = await this.stripe.subscriptions.retrieve(
      pendingCheckout.stripeSubscriptionId,
    );
    const subscriptionId = await this.syncSubscriptionObjectDb(
      tx,
      subscription,
      input.organizationId,
      pendingCheckout.stripeCustomerId,
    );

    await tx
      .update(pendingCheckouts)
      .set({
        organizationId: input.organizationId,
        status: "completed",
        updatedAt: new Date(),
      })
      .where(eq(pendingCheckouts.id, pendingCheckout.id));

    return subscriptionId;
  }

  async processWebhook(rawBody: Buffer | undefined, signature: string | string[] | undefined) {
    if (!rawBody) {
      throw new BadRequestException("Stripe webhook raw body is required.");
    }

    if (typeof signature !== "string") {
      throw new BadRequestException("Stripe signature header is required.");
    }

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : "Stripe webhook signature verification failed.",
      );
    }

    switch (event.type) {
      case "checkout.session.completed": {
        await this.handleCheckoutSessionCompleted(event);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await this.handleSubscriptionEvent(event);
        break;
      }
      default:
        break;
    }

    return event;
  }

  private async handleCheckoutSessionCompleted(event: Stripe.Event) {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;

    if (!userId) {
      throw new BadRequestException("Unable to resolve user for checkout webhook.");
    }

    const externalSubscriptionId = this.readStripeSubscriptionIdFromSession(session.subscription);
    const customerId = this.readStripeCustomerIdFromSession(session.customer);
    const organizationId = this.normalizeNullableString(session.metadata?.organizationId);
    const interval = this.resolveIntervalFromCheckoutSession(session);

    await this.upsertPendingCheckoutRecord({
      checkoutSessionId: session.id,
      interval,
      organizationId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: externalSubscriptionId,
      userId,
      status: organizationId ? "completed" : "confirmed",
    });

    if (organizationId) {
      const localSubscriptionId = await this.syncSubscriptionByExternalId(
        externalSubscriptionId,
        organizationId,
        customerId,
      );

      await this.recordSubscriptionEvent({
        event,
        organizationId,
        subscriptionId: localSubscriptionId,
      });
    }
  }

  private async handleSubscriptionEvent(event: Stripe.Event) {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = this.getStripeCustomerId(subscription.customer);
    const organizationId = await this.findOrganizationIdByCustomer(customerId);

    if (organizationId) {
      const localSubscriptionId = await this.syncSubscriptionObject(
        subscription,
        organizationId,
        customerId,
      );

      await this.recordSubscriptionEvent({
        event,
        organizationId,
        subscriptionId: localSubscriptionId,
      });
      return;
    }

    await this.syncPendingCheckoutSubscriptionStatus(subscription, customerId);
  }

  private async syncPendingCheckoutSubscriptionStatus(
    subscription: Stripe.Subscription,
    externalCustomerId: string,
  ) {
    const pendingCheckout = await this.db.query.pendingCheckouts.findFirst({
      where: (table, { and, eq, or }) =>
        and(
          eq(table.stripeCustomerId, externalCustomerId),
          or(
            eq(table.stripeSubscriptionId, subscription.id),
            eq(table.checkoutSessionId, subscription.metadata?.checkoutSessionId ?? ""),
          ),
        ),
      orderBy: (table, { desc }) => [desc(table.updatedAt)],
    });

    if (!pendingCheckout) {
      return;
    }

    await this.db
      .update(pendingCheckouts)
      .set({
        stripeCustomerId: externalCustomerId,
        stripeSubscriptionId: subscription.id,
        status:
          subscription.status === "active" || subscription.status === "trialing"
            ? pendingCheckout.organizationId
              ? "completed"
              : "confirmed"
            : pendingCheckout.status,
        updatedAt: new Date(),
      })
      .where(eq(pendingCheckouts.id, pendingCheckout.id));
  }

  private async syncSubscriptionByExternalId(
    externalSubscriptionId: string,
    organizationId: string,
    externalCustomerId: string | null,
  ) {
    const subscription = await this.stripe.subscriptions.retrieve(externalSubscriptionId);

    return this.syncSubscriptionObjectDb(
      this.db,
      subscription,
      organizationId,
      externalCustomerId,
    );
  }

  private async syncSubscriptionObject(
    subscription: Stripe.Subscription,
    organizationId: string,
    externalCustomerId: string | null,
  ) {
    return this.syncSubscriptionObjectDb(
      this.db,
      subscription,
      organizationId,
      externalCustomerId,
    );
  }

  private async syncSubscriptionObjectDb(
    db: DatabaseClient,
    subscription: Stripe.Subscription,
    organizationId: string,
    externalCustomerId: string | null,
  ) {
    const subscriptionPeriod = subscription as Stripe.Subscription & {
      current_period_end?: number;
      current_period_start?: number;
    };
    const customerId = externalCustomerId ?? this.getStripeCustomerId(subscription.customer);
    const billingCustomer = await this.upsertOrganizationBillingCustomerDb(db, {
      externalCustomerId: customerId,
      organizationId,
    });
    const interval = this.resolveInterval(subscription);
    const currentPeriodStart = this.toDate(subscriptionPeriod.current_period_start);
    const currentPeriodEnd = this.toDate(subscriptionPeriod.current_period_end);
    const existingSubscription = await db.query.subscriptions.findFirst({
      where: (table, { eq }) => eq(table.externalSubscriptionId, subscription.id),
    });

    const values = {
      billingCustomerId: billingCustomer.id,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodEnd,
      currentPeriodStart,
      externalSubscriptionId: subscription.id,
      interval,
      organizationId,
      planCode: PLAN_CODE,
      provider: "stripe" as const,
      status: subscription.status,
    };

    if (existingSubscription) {
      const [updated] = await db
        .update(subscriptions)
        .set(values)
        .where(eq(subscriptions.id, existingSubscription.id))
        .returning({ id: subscriptions.id });

      return updated.id;
    }

    const [created] = await db
      .insert(subscriptions)
      .values(values)
      .returning({ id: subscriptions.id });

    return created.id;
  }

  private async ensureCheckoutCustomer(authContext: AuthenticatedRequestContext) {
    if (authContext.organization?.id) {
      const existingOrganizationCustomer = await this.db.query.billingCustomers.findFirst({
        where: (table, { and, eq }) =>
          and(eq(table.organizationId, authContext.organization!.id), eq(table.provider, "stripe")),
      });

      if (existingOrganizationCustomer) {
        try {
          await this.stripe.customers.retrieve(existingOrganizationCustomer.externalCustomerId);
          return existingOrganizationCustomer.externalCustomerId;
        } catch (error: unknown) {
          if (
            !(error instanceof Stripe.errors.StripeInvalidRequestError) ||
            error.code !== "resource_missing"
          ) {
            throw error;
          }
        }
      }
    }

    const existingPendingCheckout = await this.db.query.pendingCheckouts.findFirst({
      where: (table, { and, eq }) =>
        and(eq(table.userId, authContext.user.id), isNotNull(table.stripeCustomerId)),
      orderBy: (table, { desc }) => [desc(table.updatedAt)],
    });

    if (existingPendingCheckout?.stripeCustomerId) {
      try {
        await this.stripe.customers.retrieve(existingPendingCheckout.stripeCustomerId);
        return existingPendingCheckout.stripeCustomerId;
      } catch (error: unknown) {
        if (
          !(error instanceof Stripe.errors.StripeInvalidRequestError) ||
          error.code !== "resource_missing"
        ) {
          throw error;
        }
      }
    }

    const customer = await this.stripe.customers.create({
      email: authContext.user.email,
      metadata: {
        organizationId: authContext.organization?.id ?? "",
        planCode: PLAN_CODE,
        userId: authContext.user.id,
      },
      name: authContext.organization?.name ?? authContext.user.name,
    });

    return customer.id;
  }

  private async upsertOrganizationBillingCustomer(input: {
    externalCustomerId: string;
    organizationId: string;
  }) {
    return this.upsertOrganizationBillingCustomerDb(this.db, input);
  }

  private async upsertOrganizationBillingCustomerDb(
    db: DatabaseClient,
    input: {
      externalCustomerId: string;
      organizationId: string;
    },
  ) {
    const byOrganization = await db.query.billingCustomers.findFirst({
      where: (table, { and, eq }) =>
        and(eq(table.organizationId, input.organizationId), eq(table.provider, "stripe")),
    });

    if (byOrganization) {
      if (byOrganization.externalCustomerId === input.externalCustomerId) {
        return byOrganization;
      }

      const [updated] = await db
        .update(billingCustomers)
        .set({
          externalCustomerId: input.externalCustomerId,
        })
        .where(eq(billingCustomers.id, byOrganization.id))
        .returning();

      return updated;
    }

    const [created] = await db
      .insert(billingCustomers)
      .values({
        externalCustomerId: input.externalCustomerId,
        organizationId: input.organizationId,
        provider: "stripe",
      })
      .returning();

    return created;
  }

  private async upsertPendingCheckoutRecord(input: {
    checkoutSessionId: string;
    interval: string;
    organizationId: string | null;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    userId: string;
    status: string;
  }) {
    const existingPendingCheckout = await this.db.query.pendingCheckouts.findFirst({
      where: (table, { eq }) => eq(table.checkoutSessionId, input.checkoutSessionId),
    });

    const values = {
      interval: input.interval,
      metadata: {},
      organizationId: input.organizationId,
      planCode: PLAN_CODE,
      status: input.status,
      stripeCustomerId: input.stripeCustomerId,
      stripeSubscriptionId: input.stripeSubscriptionId,
      userId: input.userId,
    };

    if (existingPendingCheckout) {
      const [updated] = await this.db
        .update(pendingCheckouts)
        .set({
          ...values,
          updatedAt: new Date(),
        })
        .where(eq(pendingCheckouts.id, existingPendingCheckout.id))
        .returning();

      return updated;
    }

    const [created] = await this.db
      .insert(pendingCheckouts)
      .values({
        ...values,
        checkoutSessionId: input.checkoutSessionId,
      })
      .returning();

    return created;
  }

  private async recordSubscriptionEvent(input: {
    event: Stripe.Event;
    organizationId: string;
    subscriptionId: string | null;
  }) {
    await this.db.insert(subscriptionEvents).values({
      eventType: input.event.type,
      occurredAt: this.toDate(input.event.created) ?? new Date(),
      organizationId: input.organizationId,
      payload: input.event as unknown as Record<string, unknown>,
      provider: "stripe",
      subscriptionId: input.subscriptionId,
    });
  }

  private async findOrganizationIdByCustomer(externalCustomerId: string) {
    const billingCustomer = await this.db.query.billingCustomers.findFirst({
      where: (table, { and, eq }) =>
        and(eq(table.externalCustomerId, externalCustomerId), eq(table.provider, "stripe")),
    });

    return billingCustomer?.organizationId ?? null;
  }

  private resolveInterval(subscription: Stripe.Subscription) {
    const firstItem = subscription.items.data[0];
    const priceId = firstItem?.price?.id;

    if (priceId === this.env.STRIPE_PRICE_ANNUAL) {
      return "annual";
    }

    if (priceId === this.env.STRIPE_PRICE_MONTHLY) {
      return "monthly";
    }

    if (firstItem?.price?.recurring?.interval === "year") {
      return "annual";
    }

    return "monthly";
  }

  private resolveIntervalFromCheckoutSession(session: Stripe.Checkout.Session) {
    const interval = session.metadata?.interval;

    return interval === "annual" ? "annual" : "monthly";
  }

  private getStripeCustomerId(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null) {
    if (!customer) {
      throw new BadRequestException("Stripe customer reference is missing.");
    }

    return typeof customer === "string" ? customer : customer.id;
  }

  private readStripeCustomerIdFromSession(
    customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
  ) {
    return this.getStripeCustomerId(customer);
  }

  private readStripeSubscriptionIdFromSession(
    subscription: string | Stripe.Subscription | null,
  ) {
    if (typeof subscription === "string") {
      return subscription;
    }

    if (subscription && typeof subscription === "object" && "id" in subscription) {
      return subscription.id;
    }

    throw new BadRequestException("Checkout session did not attach a subscription.");
  }

  private normalizeNullableString(value: string | null | undefined) {
    if (!value) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private toDate(value: number | null | undefined) {
    return typeof value === "number" ? new Date(value * 1000) : null;
  }

  async createCustomerPortalSession(authContext: AuthenticatedRequestContext) {
    // Buscar o customer ID da organização ou do pending checkout
    let customerId: string | null = null;

    if (authContext.organization?.id) {
      const billingCustomer = await this.db.query.billingCustomers.findFirst({
        where: (table, { and, eq }) =>
          and(
            eq(table.organizationId, authContext.organization!.id),
            eq(table.provider, "stripe"),
          ),
      });

      if (billingCustomer) {
        customerId = billingCustomer.externalCustomerId;
      }
    }

    // Se não encontrou na organização, busca no pending checkout
    if (!customerId) {
      const pendingCheckout = await this.db.query.pendingCheckouts.findFirst({
        where: (table, { and, eq, or }) =>
          and(
            eq(table.userId, authContext.user.id),
            or(eq(table.status, "confirmed"), eq(table.status, "completed")),
          ),
        orderBy: (table, { desc }) => [desc(table.updatedAt)],
      });

      if (pendingCheckout?.stripeCustomerId) {
        customerId = pendingCheckout.stripeCustomerId;
      }
    }

    if (!customerId) {
      throw new BadRequestException("No Stripe customer found for this user.");
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${this.env.WEB_APP_ORIGIN}/app/billing/manage`,
    });

    if (!session.url) {
      throw new BadRequestException("Stripe portal session did not return a redirect URL.");
    }

    return {
      portalUrl: session.url,
    };
  }
}
