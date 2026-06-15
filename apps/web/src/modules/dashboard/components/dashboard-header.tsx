"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, AlertCircle, Sparkles } from "lucide-react";
import { StatusBadge } from "@/components/ui-premium/status-badge";
import { fadeInVariants } from "@/lib/animations";
import type { DashboardBusinessStatus } from "../types/dashboard";
import { getGreeting } from "../utils/formatters";

interface DashboardHeaderProps {
  organizationName: string;
  businessStatus?: DashboardBusinessStatus;
}

const statusConfig = {
  healthy: {
    badge: { status: "success" as const, label: "Negócio saudável" },
    icon: <TrendingUp className="h-4 w-4 text-success" />,
  },
  attention: {
    badge: { status: "warning" as const, label: "Atenção necessária" },
    icon: <AlertCircle className="h-4 w-4 text-warning" />,
  },
  review: {
    badge: { status: "pending" as const, label: "Revisar dados" },
    icon: <Sparkles className="h-4 w-4 text-info" />,
  },
};

export function DashboardHeader({
  organizationName,
  businessStatus = "healthy",
}: DashboardHeaderProps) {
  const greeting = useMemo(() => getGreeting(), []);
  const currentStatus = statusConfig[businessStatus];

  return (
    <motion.div variants={fadeInVariants} initial="hidden" animate="visible" className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold leading-none tracking-tight text-foreground sm:text-3xl">
              {greeting}, {organizationName}
            </h1>
            <StatusBadge status={currentStatus.badge.status} label={currentStatus.badge.label} />
          </div>
          <p className="text-sm text-muted-foreground">
            Visão consolidada do seu negócio
          </p>
        </div>
      </div>
    </motion.div>
  );
}
