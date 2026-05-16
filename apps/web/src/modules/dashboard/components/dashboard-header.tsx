"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { RefreshCw, TrendingUp, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@marginflow/ui";
import { StatusBadge } from "@/components/ui-premium/status-badge";
import { fadeInVariants } from "@/lib/animations";
import type { DashboardBusinessStatus } from "../types/dashboard";
import type { DashboardRecentSyncResponse } from "@marginflow/types";
import { formatRelativeTime, getGreeting } from "../utils/formatters";

interface DashboardHeaderProps {
  organizationName: string;
  businessStatus?: DashboardBusinessStatus;
  lastSyncDate?: string;
  recentSync?: DashboardRecentSyncResponse;
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

function getIntegrationStatus(recentSync?: DashboardRecentSyncResponse) {
  if (!recentSync) {
    return { color: "bg-muted", label: "Não verificado", status: "disconnected" as const };
  }

  const reason = recentSync.availability.reason;
  const lastRun = recentSync.lastCompletedRun;

  // Provedor desconectado ou indisponível
  if (reason === "provider_disconnected" || reason === "provider_needs_reconnect" || reason === "provider_unavailable") {
    return { color: "bg-error", label: "Desconectado", status: "disconnected" as const };
  }

  // Sync em progresso
  if (reason === "sync_in_progress" || recentSync.activeRun) {
    return { color: "bg-info", label: "Sincronizando", status: "syncing" as const };
  }

  // Verificar última sincronização bem-sucedida
  if (lastRun && lastRun.finishedAt) {
    const lastSync = new Date(lastRun.finishedAt);
    const now = new Date();
    const hoursSinceSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);

    // Mais de 24h sem sync = atenção
    if (hoursSinceSync > 24) {
      return { color: "bg-warning", label: "Sincronização atrasada", status: "stale" as const };
    }

    return { color: "bg-success", label: "Conectado", status: "connected" as const };
  }

  // Disponível mas nunca sincronizado
  if (reason === "available") {
    return { color: "bg-warning", label: "Nunca sincronizado", status: "never" as const };
  }

  return { color: "bg-muted", label: "Não verificado", status: "unknown" as const };
}

export function DashboardHeader({
  organizationName,
  businessStatus = "healthy",
  lastSyncDate,
  recentSync,
}: DashboardHeaderProps) {
  const greeting = useMemo(() => getGreeting(), []);
  const relativeTime = useMemo(() => formatRelativeTime(lastSyncDate), [lastSyncDate]);
  const currentStatus = statusConfig[businessStatus];
  const integrationStatus = useMemo(() => getIntegrationStatus(recentSync), [recentSync]);

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
        <Button
          asChild
          size="md"
          className="gap-2 bg-accent px-5 text-sm font-semibold text-white shadow-[var(--shadow-sm)] transition-all duration-[var(--transition-fast)] hover:-translate-y-0.5 hover:bg-accent-strong hover:text-white hover:shadow-[var(--shadow-md)]"
        >
          <Link href="/app/integrations">
            <RefreshCw className="h-4 w-4 transition-transform duration-300 group-hover:rotate-180" />
            <span className="text-white">Conectar marketplaces</span>
          </Link>
        </Button>
        <div className="ml-auto hidden items-center gap-3 text-sm text-muted-foreground sm:flex">
          <span className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${integrationStatus.color}`} />
            Mercado Livre
          </span>
        </div>
      </div>
    </motion.div>
  );
}
