"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@marginflow/ui";
import { pricingPlans } from "@/lib/site";

type BillingCycle = "annual" | "monthly";

export function PricingToggle() {
  const [cycle, setCycle] = useState<BillingCycle>("annual");

  return (
    <div className="space-y-8">
      <div className="inline-flex rounded-full border border-border bg-[color:rgba(255,252,247,0.88)] p-1 shadow-[var(--shadow-card)]">
        {(["annual", "monthly"] as BillingCycle[]).map((option) => {
          const active = cycle === option;

          return (
            <button
              key={option}
              type="button"
              onClick={() => setCycle(option)}
              className={[
                "rounded-full px-4 py-2 text-sm font-semibold capitalize transition-all duration-200",
                active
                  ? "bg-foreground text-[color:var(--accent-foreground)]"
                  : "text-foreground-soft hover:text-foreground",
              ].join(" ")}
            >
              {option}
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {pricingPlans.map((plan, index) => {
          const price = cycle === "annual" ? plan.annualPrice : plan.monthlyPrice;
          const suffix = cycle === "annual" ? plan.annualSuffix : plan.monthlySuffix;

          return (
            <article
              key={plan.name}
              className={[
                "rounded-[2rem] border border-border p-7 shadow-[var(--shadow-card)] backdrop-blur md:p-8",
                index === 0
                  ? "bg-[linear-gradient(180deg,rgba(255,252,247,0.94),rgba(233,246,243,0.88))]"
                  : "bg-[linear-gradient(180deg,rgba(255,252,247,0.94),rgba(250,240,233,0.9))]",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
                    {plan.name}
                  </p>
                  <p className="mt-4 text-sm leading-7 text-foreground-soft">{plan.description}</p>
                </div>
                <div className="rounded-full border border-border bg-[color:rgba(255,255,255,0.72)] px-4 py-2 text-xs uppercase tracking-[0.16em] text-foreground-soft">
                  {cycle}
                </div>
              </div>

              <div className="mt-10">
                <p className="text-5xl font-semibold tracking-[-0.04em] text-foreground">{price}</p>
                <p className="mt-2 text-sm uppercase tracking-[0.18em] text-foreground-soft">{suffix}</p>
              </div>

              <ul className="mt-8 space-y-3 text-sm leading-7 text-foreground-soft">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="rounded-[1.25rem] border border-border bg-[color:rgba(255,255,255,0.65)] px-4 py-3"
                  >
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <Button asChild className="w-full">
                  <Link href={plan.ctaHref}>{plan.ctaLabel}</Link>
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
