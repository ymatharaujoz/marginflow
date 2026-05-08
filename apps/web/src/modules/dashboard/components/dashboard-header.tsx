"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { RefreshCw, Plus, TrendingUp, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@marginflow/ui";
import { StatusBadge } from "@/components/ui-premium/status-badge";
import { fadeInVariants } from "@/lib/animations";
import type { DashboardBusinessStatus } from "../types/dashboard";
import { formatRelativeTime, getGreeting } from "../utils/formatters";

interface DashboardHeaderProps {
  organizationName: string;
  businessStatus?: DashboardBusinessStatus;
  lastSyncDate?: string;
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
  lastSyncDate,
}: DashboardHeaderProps) {
  const greeting = useMemo(() => getGreeting(), []);
  const relativeTime = useMemo(() => formatRelativeTime(lastSyncDate), [lastSyncDate]);
  const currentStatus = statusConfig[businessStatus];

  return (
    <motion.div variants={fadeInVariants} initial="hidden" animate="visible" className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {greeting}, {organizationName}
            </h1>
            <StatusBadge status={currentStatus.badge.status} label={currentStatus.badge.label} />
          </div>
          <p className="text-sm text-muted-foreground">
            Visão consolidada do seu negócio. Última sincronização:{" "}
            <span className="font-medium text-foreground">{relativeTime}</span>
          </p>
        </div>

      </div>

      <div className="flex flex-wrap items-center gap-3 border-y border-border py-4">
        <Button asChild size="sm" className="gap-2">
          <Link href="/app/integrations">
            <RefreshCw className="h-4 w-4" />
            <span>Sincronizar dados</span>
          </Link>
        </Button>
        <Button asChild size="sm" variant="secondary" className="gap-2">
          <Link href="/app/products">
            <Plus className="h-4 w-4" />
            <span>Adicionar custo</span>
          </Link>
        </Button>

        <div className="ml-auto hidden items-center gap-3 text-sm text-muted-foreground sm:flex">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-success" />
            Mercado Livre
          </span>
        </div>
      </div>
    </motion.div>
  );
}
