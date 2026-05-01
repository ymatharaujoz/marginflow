import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { eq, isNotNull } from "drizzle-orm";
import type { DatabaseClient } from "@marginflow/database";
import {
  billingCustomers,
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
    const customer = await this.ensureOrganizationBillingCustomer(authContext);
    const successUrl = `${this.env.WEB_APP_ORIGIN}/app/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${this.env.WEB_APP_ORIGIN}/app/billing?checkout=cancelled`;
    const priceId =
      interval === "annual" ? this.env.STRIPE_PRICE_ANNUAL : this.env.STRIPE_PRICE_MONTHLY;

    const session = await this.stripe.checkout.sessions.create({
      cancel_url: cancelUrl,
      customer: customer.externalCustomerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        interval,
        organizationId: authContext.organization.id,
        planCode: PLAN_CODE,
      },
      mode: "subscription",
      subscription_data: {
        metadata: {
          interval,
          organizationId: authContext.organization.id,
          planCode: PLAN_CODE,
        },
      },
      success_url: successUrl,
    });

    if (!session.url) {
      throw new BadRequestException("Stripe checkout session did not return a redirect URL.");
    }

    return {
      checkoutUrl: session.url,
      sessionId: session.id,
    };
  }

  /**
   * After Checkout redirect, synchronizes the Stripe subscription into Postgres when webhooks
   * are not yet delivered (common in local dev without Stripe CLI forwarding).
   */
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

    const sessionOrganizationId = session.metadata?.organizationId;
    if (
      !sessionOrganizationId ||
      sessionOrganizationId !== authContext.organization.id
    ) {
      throw new BadRequestException("Checkout session does not belong to this organization.");
    }

    if (session.status !== "complete") {
      throw new BadRequestException("Checkout session is not complete yet.");
    }

    const customerId =
      typeof session.customer === "string"
        ? session.customer
        : session.customer && "id" in session.customer
          ? session.customer.id
          : null;

    const sub = session.subscription;

    let externalSubscriptionId: string | null = null;

    if (typeof sub === "string") {
      externalSubscriptionId = sub;
    } else if (sub && typeof sub === "object" && "id" in sub) {
      externalSubscriptionId = sub.id;
    }

    if (!externalSubscriptionId) {
      throw new BadRequestException("Checkout session did not attach a subscription.");
    }

    await this.syncSubscriptionByExternalId(
      externalSubscriptionId,
      authContext.organization.id,
      customerId,
    );
  }

  /**
   * When webhooks lag, Postgres may still record active/trialing while Stripe already canceled.
   * Reconcile the latest Stripe-linked row before entitlement checks so UI and API converge.
   */
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
    const organizationId =
      session.metadata?.organizationId ??
      (typeof session.customer === "string"
        ? await this.findOrganizationIdByCustomer(session.customer)
        : null);

    if (!organizationId) {
      throw new BadRequestException("Unable to resolve organization for checkout webhook.");
    }

    let localSubscriptionId: string | null = null;

    if (typeof session.subscription === "string") {
      localSubscriptionId = await this.syncSubscriptionByExternalId(
        session.subscription,
        organizationId,
        typeof session.customer === "string" ? session.customer : null,
      );
    }

    await this.recordSubscriptionEvent({
      event,
      organizationId,
      subscriptionId: localSubscriptionId,
    });
  }

  private async handleSubscriptionEvent(event: Stripe.Event) {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = this.getStripeCustomerId(subscription.customer);
    const organizationId = await this.findOrganizationIdByCustomer(customerId);

    if (!organizationId) {
      throw new BadRequestException("Unable to resolve organization for subscription webhook.");
    }

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
  }

  private async syncSubscriptionByExternalId(
    externalSubscriptionId: string,
    organizationId: string,
    externalCustomerId: string | null,
  ) {
    const subscription = await this.stripe.subscriptions.retrieve(externalSubscriptionId);

    return this.syncSubscriptionObject(subscription, organizationId, externalCustomerId);
  }

  private async syncSubscriptionObject(
    subscription: Stripe.Subscription,
    organizationId: string,
    externalCustomerId: string | null,
  ) {
    const subscriptionPeriod = subscription as Stripe.Subscription & {
      current_period_end?: number;
      current_period_start?: number;
    };
    const customerId = externalCustomerId ?? this.getStripeCustomerId(subscription.customer);
    const billingCustomer = await this.upsertOrganizationBillingCustomer({
      externalCustomerId: customerId,
      organizationId,
    });
    const interval = this.resolveInterval(subscription);
    const currentPeriodStart = this.toDate(subscriptionPeriod.current_period_start);
    const currentPeriodEnd = this.toDate(subscriptionPeriod.current_period_end);
    const existingSubscription = await this.db.query.subscriptions.findFirst({
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
      const [updated] = await this.db
        .update(subscriptions)
        .set(values)
        .where(eq(subscriptions.id, existingSubscription.id))
        .returning({ id: subscriptions.id });

      return updated.id;
    }

    const [created] = await this.db
      .insert(subscriptions)
      .values(values)
      .returning({ id: subscriptions.id });

    return created.id;
  }

  private async ensureOrganizationBillingCustomer(authContext: AuthenticatedRequestContext) {
    const existingCustomer = await this.db.query.billingCustomers.findFirst({
      where: (table, { and, eq }) =>
        and(eq(table.organizationId, authContext.organization.id), eq(table.provider, "stripe")),
    });

    if (existingCustomer) {
      /**
       * DB rows seeded with placeholders (ex. {@code cus_demo_org}) or stale IDs fail Stripe checkout.
       * Verify the customer exists; if Stripe returns resource_missing, create a fresh customer.
       */
      try {
        await this.stripe.customers.retrieve(existingCustomer.externalCustomerId);
        return existingCustomer;
      } catch (error: unknown) {
        if (
          error instanceof Stripe.errors.StripeInvalidRequestError &&
          error.code === "resource_missing"
        ) {
          const customer = await this.stripe.customers.create({
            email: authContext.user.email,
            metadata: {
              organizationId: authContext.organization.id,
              planCode: PLAN_CODE,
              replacedStaleCustomerId: existingCustomer.externalCustomerId,
            },
            name: authContext.organization.name,
          });

          const [updated] = await this.db
            .update(billingCustomers)
            .set({ externalCustomerId: customer.id })
            .where(eq(billingCustomers.id, existingCustomer.id))
            .returning({
              externalCustomerId: billingCustomers.externalCustomerId,
              id: billingCustomers.id,
              organizationId: billingCustomers.organizationId,
              provider: billingCustomers.provider,
            });

          if (!updated) {
            throw new BadRequestException("Unable to reconcile Stripe billing customer.");
          }

          return updated;
        }

        throw error;
      }
    }

    const customer = await this.stripe.customers.create({
      email: authContext.user.email,
      metadata: {
        organizationId: authContext.organization.id,
        planCode: PLAN_CODE,
      },
      name: authContext.organization.name,
    });

    const [createdCustomer] = await this.db
      .insert(billingCustomers)
      .values({
        externalCustomerId: customer.id,
        organizationId: authContext.organization.id,
        provider: "stripe",
      })
      .returning();

    return createdCustomer;
  }

  private async upsertOrganizationBillingCustomer(input: {
    externalCustomerId: string;
    organizationId: string;
  }) {
    const byOrganization = await this.db.query.billingCustomers.findFirst({
      where: (table, { and, eq }) =>
        and(eq(table.organizationId, input.organizationId), eq(table.provider, "stripe")),
    });

    if (byOrganization) {
      if (byOrganization.externalCustomerId === input.externalCustomerId) {
        return byOrganization;
      }

      const [updated] = await this.db
        .update(billingCustomers)
        .set({
          externalCustomerId: input.externalCustomerId,
        })
        .where(eq(billingCustomers.id, byOrganization.id))
        .returning();

      return updated;
    }

    const [created] = await this.db
      .insert(billingCustomers)
      .values({
        externalCustomerId: input.externalCustomerId,
        organizationId: input.organizationId,
        provider: "stripe",
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

  private getStripeCustomerId(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null) {
    if (!customer) {
      throw new BadRequestException("Stripe customer reference is missing.");
    }

    return typeof customer === "string" ? customer : customer.id;
  }

  private toDate(value: number | null | undefined) {
    return typeof value === "number" ? new Date(value * 1000) : null;
  }
}
