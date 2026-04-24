"use client";

import { useState } from "react";
import { Button, Card } from "@marginflow/ui";
import { apiClient, ApiClientError } from "@/lib/api/client";
import type { ServerBillingState } from "@/lib/server-billing";

const plans = [
  {
    description: "Pay month to month while M6 is still the first gated release.",
    interval: "monthly" as const,
    title: "Monthly plan",
  },
  {
    description: "Commit annually for the leaner long-term billing path.",
    interval: "annual" as const,
    title: "Annual plan",
  },
];

type BillingPanelProps = {
  checkoutState: string | null;
  organizationName: string;
  snapshot: ServerBillingState | null;
};

export function BillingPanel({
  checkoutState,
  organizationName,
  snapshot,
}: BillingPanelProps) {
  const [isSubmitting, setIsSubmitting] = useState<"monthly" | "annual" | null>(null);
  const [message, setMessage] = useState<string | null>(() => {
    if (checkoutState === "success") {
      return "Stripe checkout completed. Refreshing entitlement state can take a moment while the webhook lands.";
    }

    if (checkoutState === "cancelled") {
      return "Checkout was cancelled. You can retry either plan below.";
    }

    return null;
  });

  async function handleCheckout(interval: "monthly" | "annual") {
    setIsSubmitting(interval);
    setMessage(null);

    try {
      const response = await apiClient.post<{
        data: {
          checkoutUrl: string;
          sessionId: string;
        };
        error: null;
      }>("/billing/checkout", {
        body: {
          interval,
        },
      });

      window.location.assign(response.data.checkoutUrl);
    } catch (error) {
      const nextMessage =
        error instanceof ApiClientError
          ? error.message
          : "Checkout failed. Please try again.";

      setMessage(nextMessage);
      setIsSubmitting(null);
    }
  }

  return (
    <main className="space-y-6 py-6 md:py-8">
      <Card className="max-w-4xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
          Billing required
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground">
          {organizationName} needs an active subscription before `/app` unlocks.
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-foreground-soft">
          M6 now gates the protected product on local Stripe entitlement state. Choose a billing
          interval to continue into the subscribed workspace shell.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {plans.map((plan) => (
            <Card key={plan.interval} className="border-border bg-background-soft">
              <p className="text-lg font-semibold text-foreground">{plan.title}</p>
              <p className="mt-2 text-sm leading-7 text-foreground-soft">{plan.description}</p>
              <Button
                className="mt-6 w-full"
                disabled={isSubmitting !== null}
                onClick={() => void handleCheckout(plan.interval)}
              >
                {isSubmitting === plan.interval ? "Opening Stripe..." : `Choose ${plan.title}`}
              </Button>
            </Card>
          ))}
        </div>

        <div className="mt-6 rounded-[var(--radius-md)] border border-border bg-surface-strong px-4 py-3 text-sm text-foreground-soft">
          Current local status: {snapshot?.subscription?.status ?? "inactive"}.
          {" "}
          Entitled: {snapshot?.entitled ? "yes" : "no"}.
        </div>

        {message ? (
          <p className="mt-4 rounded-[var(--radius-md)] border border-border bg-background-soft px-4 py-3 text-sm text-foreground">
            {message}
          </p>
        ) : null}
      </Card>
    </main>
  );
}
