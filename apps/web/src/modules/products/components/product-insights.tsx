"use client";

import { motion } from "framer-motion";
import { Sparkles, Lightbulb } from "lucide-react";
import { Card, cn } from "@marginflow/ui";
import { InsightCard } from "@/components/ui-premium/insight-card";
import { containerVariants } from "@/lib/animations";
import type { ProductInsight } from "../types/products";

interface ProductInsightsProps {
  insights: ProductInsight[];
  className?: string;
  onInsightAction?: (insight: ProductInsight) => boolean | void;
}

export function ProductInsights({ insights, className = "", onInsightAction }: ProductInsightsProps) {
  return (
    <motion.section
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      aria-labelledby="catalog-insights-heading"
      className={cn("min-w-0", className)}
    >
      <Card
        padding="lg"
        className="overflow-hidden border-border-strong bg-gradient-to-br from-accent/[0.06] via-surface-strong to-background shadow-[var(--shadow-card)]"
      >
        <div className="mb-5 flex flex-col gap-4 border-b border-border/70 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-wider text-accent">Catálogo</p>
            <h2 id="catalog-insights-heading" className="text-lg font-semibold text-foreground">
              Insights do catálogo
            </h2>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Prioridades e alertas gerados a partir dos dados atuais de produtos, custos e sincronização com o
              marketplace.
            </p>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 ring-1 ring-accent/15">
            <Lightbulb className="h-5 w-5 text-accent" aria-hidden />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {insights.length > 0 ? (
            insights.map((insight) => (
              <InsightCard
                key={insight.id}
                className="h-full min-h-[110px] bg-background/80 backdrop-blur-[2px]"
                type={insight.type}
                title={insight.title}
                description={insight.description}
                priority={insight.priority}
                action={
                  insight.href && insight.actionLabel
                    ? {
                        label: insight.actionLabel,
                        onClick: () => {
                          const handled = onInsightAction?.(insight);

                          if (handled) {
                            return;
                          }

                          window.location.href = insight.href!;
                        },
                      }
                    : undefined
                }
              />
            ))
          ) : (
            <div className="col-span-full rounded-xl border border-dashed border-border bg-surface-strong/40 px-6 py-10 text-center">
              <Sparkles className="mx-auto mb-2 h-8 w-8 text-muted-foreground/45" aria-hidden />
              <p className="text-sm font-medium text-foreground">Nenhum insight por enquanto</p>
              <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
                Cadastre produtos e custos para que possamos destacar oportunidades e alertas do seu catálogo.
              </p>
            </div>
          )}
        </div>
      </Card>
    </motion.section>
  );
}
