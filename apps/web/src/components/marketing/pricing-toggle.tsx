"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { pricingPlans } from "@/lib/site";

type BillingCycle = "annual" | "monthly";

const easeOut = [0.16, 1, 0.3, 1] as const;

function CheckIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function PricingCard({
  plan,
  cycle,
  index,
}: {
  plan: (typeof pricingPlans)[0];
  cycle: BillingCycle;
  index: number;
}) {
  const price = cycle === "annual" ? plan.annualPrice : plan.monthlyPrice;
  const suffix = cycle === "annual" ? plan.annualSuffix : plan.monthlySuffix;
  const isGrowth = plan.name === "Crescimento";

  return (
    <motion.article
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: index * 0.1,
        ease: easeOut,
      }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className={`relative flex flex-col rounded-2xl border p-6 shadow-sm transition-all duration-300 hover:shadow-lg ${
        isGrowth
          ? "border-accent/30 bg-gradient-to-b from-white to-accent/[0.03] ring-1 ring-accent/10"
          : "border-border bg-gradient-to-b from-white to-muted/20"
      }`}
    >
      {/* Badge */}
      <div className="absolute -top-3 left-6">
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 + index * 0.1 }}
          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
            isGrowth ? "bg-accent text-white shadow-md" : "bg-muted text-muted-foreground"
          }`}
        >
          {isGrowth ? "Mais Popular" : plan.name}
        </motion.span>
      </div>

      {/* Plan Name & Description */}
      <div className="mb-6 pt-2">
        {!isGrowth && <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{plan.name}</h3>}
        {isGrowth && <h3 className="text-sm font-semibold uppercase tracking-wider text-accent">{plan.name}</h3>}
        <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
      </div>

      {/* Price */}
      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          <AnimatePresence mode="wait">
            <motion.span
              key={price}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="text-4xl font-bold tracking-tight text-foreground"
            >
              {price}
            </motion.span>
          </AnimatePresence>
        </div>
        <AnimatePresence mode="wait">
          <motion.p
            key={suffix}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-1 text-sm text-muted-foreground"
          >
            {suffix}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* CTA Button */}
      <Link
        href={plan.ctaHref}
        className={`mb-6 inline-flex h-12 items-center justify-center rounded-xl px-6 text-sm font-semibold transition-all active:scale-[0.98] ${
          isGrowth
            ? "bg-accent text-white shadow-md hover:bg-accent-strong hover:shadow-lg"
            : "border border-border bg-white text-foreground hover:border-accent/30 hover:bg-accent/[0.02]"
        }`}
      >
        {plan.ctaLabel}
      </Link>

      {/* Features */}
      <ul className="mt-auto space-y-3">
        {plan.features.map((feature, featureIndex) => (
          <motion.li
            key={feature}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + index * 0.1 + featureIndex * 0.05 }}
            className="flex items-start gap-3 text-sm text-muted-foreground"
          >
            <CheckIcon />
            <span>{feature}</span>
          </motion.li>
        ))}
      </ul>
    </motion.article>
  );
}

export function PricingToggle() {
  const [cycle, setCycle] = useState<BillingCycle>("annual");

  return (
    <div className="space-y-8">
      {/* Toggle */}
      <div className="flex flex-col items-center gap-4">
        <div className="inline-flex items-center rounded-full border border-border bg-white p-1 shadow-sm">
          {(["annual", "monthly"] as BillingCycle[]).map((option) => {
            const active = cycle === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setCycle(option)}
                className={`relative rounded-full px-6 py-2.5 text-sm font-semibold transition-colors ${
                  active ? "text-white" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="pricingToggle"
                    className="absolute inset-0 rounded-full bg-accent shadow-md"
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 35,
                    }}
                  />
                )}
                <span className="relative z-10">{option === "annual" ? "Anual" : "Mensal"}</span>
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {cycle === "annual" && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-sm font-medium text-accent"
            >
              Economize 20% no plano anual
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Pricing Cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        {pricingPlans.map((plan, index) => (
          <PricingCard key={plan.name} plan={plan} cycle={cycle} index={index} />
        ))}
      </div>
    </div>
  );
}
