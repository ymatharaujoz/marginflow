"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowUpRight, ExternalLink } from "lucide-react";
import { Card } from "@marginflow/ui";
import { StatusBadge } from "@/components/ui-premium/status-badge";
import { slideInUpVariants } from "@/lib/animations";
import type { DashboardChartsResponse, DashboardRecentSyncResponse } from "@marginflow/types";
import { formatMoney } from "../utils/formatters";

interface MarketplacesSectionProps {
  data?: DashboardChartsResponse;
  recentSync?: DashboardRecentSyncResponse;
  className?: string;
}

const marketplaceIcons = {
  mercadolivre: (
    <img
      src="/icons/mercado-libre-icon.svg"
      alt="Mercado Livre"
      className="h-8 w-auto"
    />
  ),
};

function getMarketplaceStatus(recentSync?: DashboardRecentSyncResponse) {
  if (!recentSync) {
    return { status: "inactive" as const, label: "Não verificado" };
  }

  const reason = recentSync.availability.reason;
  const lastRun = recentSync.lastCompletedRun;

  // Provedor desconectado ou indisponível
  if (reason === "provider_disconnected" || reason === "provider_needs_reconnect" || reason === "provider_unavailable") {
    return { status: "error" as const, label: "Desconectado" };
  }

  // Sync em progresso
  if (reason === "sync_in_progress" || recentSync.activeRun) {
    return { status: "pending" as const, label: "Sincronizando" };
  }

  // Verificar última sincronização bem-sucedida
  if (lastRun && lastRun.finishedAt) {
    const lastSync = new Date(lastRun.finishedAt);
    const now = new Date();
    const hoursSinceSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);

    // Mais de 24h sem sync = atenção
    if (hoursSinceSync > 24) {
      return { status: "warning" as const, label: "Atrasado" };
    }

    return { status: "active" as const, label: "Conectado" };
  }

  // Disponível mas nunca sincronizado
  if (reason === "available") {
    return { status: "warning" as const, label: "Nunca sync" };
  }

  return { status: "inactive" as const, label: "Não verificado" };
}

export function MarketplacesSection({ data, recentSync, className = "" }: MarketplacesSectionProps) {
  const mlChannel = data?.channels.find((channel) => channel.channel.toLowerCase().includes("mercado"));
  const statusBadge = useMemo(() => getMarketplaceStatus(recentSync), [recentSync]);

  const marketplace = {
    id: "mercadolivre",
    name: "Mercado Livre",
    slug: "mercadolivre" as const,
    isConnected: statusBadge.status === "active" || statusBadge.status === "warning",
    revenue: mlChannel ? formatMoney(mlChannel.grossRevenue) : undefined,
    orders: mlChannel?.unitsSold ?? undefined,
    href: "/app/integrations",
  };

  return (
    <motion.div variants={slideInUpVariants}>
      <Card padding="md" className={className}>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-foreground">Marketplaces</h3>
            <p className="text-[10px] text-muted-foreground">Integrações ativas</p>
          </div>
          <Link
            href="/app/integrations"
            className="flex items-center gap-1 text-[10px] font-medium text-accent transition-colors hover:text-accent-strong"
          >
            Gerenciar
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>

        <motion.div
          whileHover={{ y: -1 }}
          className="group flex items-center gap-3 rounded-lg border border-border bg-surface-strong p-3 transition-all hover:border-border-strong hover:shadow-[var(--shadow-sm)]"
        >
          <div className="shrink-0">{marketplaceIcons[marketplace.slug]}</div>

          <div className="min-w-0 flex-1">
            <h4 className="truncate text-xs font-semibold text-foreground">{marketplace.name}</h4>
            <StatusBadge status={statusBadge.status} label={statusBadge.label} className="mt-0.5" />
          </div>

          {marketplace.isConnected && (marketplace.revenue || marketplace.orders) && (
            <div className="shrink-0 text-right">
              {marketplace.revenue && <p className="text-xs font-semibold text-foreground">{marketplace.revenue}</p>}
              {marketplace.orders !== undefined && (
                <p className="text-[10px] text-muted-foreground">{marketplace.orders} unid.</p>
              )}
            </div>
          )}

          <Link href={marketplace.href} className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-accent" />
          </Link>
        </motion.div>
      </Card>
    </motion.div>
  );
}
