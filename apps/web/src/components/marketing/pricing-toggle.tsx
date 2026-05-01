"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@marginflow/ui";
import { pricingPlans } from "@/lib/site";

type BillingCycle = "annual" | "monthly";

export function PricingToggle() {
  const [cycle, setCycle] = useState<BillingCycle>("annual");

  return (
    <div className="space-y-10">
      <div className="flex flex-col items-center gap-3">
        <div className="inline-flex rounded-[var(--radius-full)] border border-border bg-surface-strong p-1 shadow-[var(--shadow-sm)]">
          {(["annual", "monthly"] as BillingCycle[]).map((option) => {
            const active = cycle === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setCycle(option)}
                className={[
                  "rounded-[var(--radius-full)] px-5 py-2 text-sm font-semibold capitalize transition-all duration-[var(--transition-fast)]",
                  active
                    ? "bg-accent text-white shadow-[0_2px_8px_rgba(14,122,111,0.2)]"
                    : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {option === "annual" ? "Anual" : "Mensal"}
              </button>
            );
          })}
        </div>
        {cycle === "annual" && (
          <p className="text-sm font-medium text-accent">Economize com cobrança anual</p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {pricingPlans.map((plan, index) => {
          const price = cycle === "annual" ? plan.annualPrice : plan.monthlyPrice;
          const suffix = cycle === "annual" ? plan.annualSuffix : plan.monthlySuffix;

          return (
            <article
              key={plan.name}
              className={[
                "animate-rise-in rounded-[var(--radius-2xl)] border p-7 shadow-[var(--shadow-card)] transition-all hover:shadow-[var(--shadow-lg)] md:p-8",
                index === 0
                  ? "border-accent/30 bg-gradient-to-b from-surface-strong to-accent-soft/30"
                  : "border-border bg-gradient-to-b from-surface-strong to-warning-soft/20",
              ].join(" ")}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-accent">
                    {plan.name}
                  </p>
                  <p className="mt-4 text-sm leading-7 text-muted-foreground">{plan.description}</p>
                </div>
                <div className="rounded-[var(--radius-full)] border border-border bg-white/70 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  {cycle === "annual" ? "Anual" : "Mensal"}
                </div>
              </div>

              <div className="mt-8">
                <p className="text-4xl font-bold tracking-tight text-foreground">{price}</p>
                <p className="mt-2 text-sm text-muted-foreground">{suffix}</p>
              </div>

              <ul className="mt-8 space-y-3 text-sm text-muted-foreground">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-border bg-white/60 px-4 py-3"
                  >
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <Button asChild className="w-full" size="lg">
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
