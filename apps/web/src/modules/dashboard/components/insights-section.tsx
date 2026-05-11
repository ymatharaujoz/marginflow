"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Card } from "@marginflow/ui";
import { InsightCard } from "@/components/ui-premium/insight-card";
import { containerVariants } from "@/lib/animations";
import type { DashboardSummaryResponse } from "@marginflow/types";
import { buildDashboardInsights } from "../calculations/insights";

interface InsightsSectionProps {
  data?: DashboardSummaryResponse;
  className?: string;
}

export function InsightsSection({ data, className = "" }: InsightsSectionProps) {
  const insights = buildDashboardInsights(data);

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className={`h-full ${className}`}>
      <Card padding="md" className="h-full flex flex-col">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-foreground">Insights inteligentes</h3>
              <p className="text-[10px] text-muted-foreground">Análise automática</p>
            </div>
          </div>
        </div>

        <div className="space-y-2 flex-1 flex flex-col justify-center">
          {insights.length > 0 ? (
            insights.slice(0, 3).map((insight) => (
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
                Sincronize seus dados para receber insights.{" "}
                <Link href="/app/integrations" className="font-medium text-accent">
                  Abrir integrações
                </Link>
              </p>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
