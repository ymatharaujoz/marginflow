"use client";

import { motion } from "framer-motion";
import { DollarSign, TrendingUp, Percent, Megaphone, Target, BarChart3 } from "lucide-react";
import { StatCard } from "@/components/ui-premium/stat-card";
import { containerVariants } from "@/lib/animations";
import type { DashboardSummaryResponse } from "@marginflow/types";
import { buildDashboardKpis } from "../calculations/kpi-data";

interface KpiCardsProps {
  data: DashboardSummaryResponse;
  className?: string;
}

function getKpiIcon(icon: ReturnType<typeof buildDashboardKpis>[number]["icon"]) {
  switch (icon) {
    case "revenue":
      return <DollarSign className="h-4 w-4" />;
    case "profit":
      return <TrendingUp className="h-4 w-4" />;
    case "margin":
      return <Percent className="h-4 w-4" />;
    case "ads":
      return <Megaphone className="h-4 w-4" />;
    case "roi":
      return <Target className="h-4 w-4" />;
    case "roas":
      return <BarChart3 className="h-4 w-4" />;
    default:
      return <TrendingUp className="h-4 w-4" />;
  }
}

export function KpiCards({ data, className = "" }: KpiCardsProps) {
  const kpis = buildDashboardKpis(data);

  // 6 KPIs: Faturamento, Lucro bruto, Lucro líquido, Margem média, ROI médio, ROAS médio
  // Grid responsivo: 2 cols em mobile, 3 cols em tablet, 6 cols em desktop
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 ${className}`}
    >
      {kpis.map((kpi) => (
        <StatCard
          key={kpi.key}
          label={kpi.label}
          value={kpi.value}
          icon={getKpiIcon(kpi.icon)}
          trend={kpi.helperText ? { direction: "neutral", value: kpi.helperText } : undefined}
          variant={kpi.variant}
        />
      ))}
    </motion.div>
  );
}
