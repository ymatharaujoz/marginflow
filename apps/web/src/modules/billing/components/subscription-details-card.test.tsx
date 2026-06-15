import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SubscriptionDetailsCard } from "./subscription-details-card";

describe("SubscriptionDetailsCard", () => {
  it("labels trialing subscriptions and uses trial end as first charge date", () => {
    const markup = renderToStaticMarkup(
      createElement(SubscriptionDetailsCard, {
        cancelAtPeriodEnd: false,
        currentPeriodEnd: "2026-07-21T12:00:00.000Z",
        interval: "monthly",
        isActive: true,
        isLoadingPortal: false,
        onManageSubscription: vi.fn(),
        status: "trialing",
        trialEnd: "2026-06-21T12:00:00.000Z",
      }),
    );

    expect(markup).toContain("Em teste");
    expect(markup).toContain("Primeira cobrança");
    expect(markup).toContain("21 de junho de 2026");
    expect(markup).not.toContain("21 de julho de 2026");
  });
});
