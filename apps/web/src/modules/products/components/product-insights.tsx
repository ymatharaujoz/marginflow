"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, Lightbulb } from "lucide-react";
import { Card } from "@marginflow/ui";
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
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className={className}>
      <Card padding="md">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10">
              <Lightbulb className="h-3.5 w-3.5 text-accent" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-foreground">Insights do catálogo</h3>
              <p className="text-[10px] text-muted-foreground">Análise automática</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {insights.length > 0 ? (
            insights.map((insight) => (
              <InsightCard
                key={insight.id}
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
            <div className="rounded-lg border border-dashed border-border bg-surface-strong/50 p-4 text-center">
              <Sparkles className="mx-auto mb-1 h-6 w-6 text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground">
                Cadastre produtos para receber insights sobre seu catálogo.
              </p>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
