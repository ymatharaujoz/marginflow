"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowUpRight, ExternalLink } from "lucide-react";
import { Card } from "@lucreii/ui";
import type { DashboardRecentSyncResponse } from "@lucreii/types";
import { StatusBadge } from "@/components/ui-premium/status-badge";
import { slideInUpVariants } from "@/lib/animations";
import type { DashboardChartsResponse } from "@lucreii/types";
import type { DashboardConnectionStatuses } from "../hooks/use-dashboard-connection-statuses";
import { formatMoney } from "../utils/formatters";

interface MarketplacesSectionProps {
  data?: DashboardChartsResponse;
  syncStatusByProvider: DashboardConnectionStatuses;
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
  shopee: (
    <img
      src="/icons/shopee-icon.svg"
      alt="Shopee"
      className="h-8 w-auto"
    />
  ),
  shein: (
    <img
      src="/icons/shein-icon.svg"
      alt="Shein"
      className="h-8 w-auto"
    />
  ),
};

function getMarketplaceStatus(recentSync?: DashboardRecentSyncResponse) {
  if (!recentSync) {
    return { status: "inactive" as const, label: "Desconectado" };
  }

  const reason = recentSync.availability.reason;

  if (
    reason === "provider_disconnected" ||
    reason === "provider_needs_reconnect" ||
    reason === "provider_unavailable"
  ) {
    return { status: "error" as const, label: "Desconectado" };
  }

  if (reason === "sync_in_progress" || recentSync.activeRun) {
    return { status: "pending" as const, label: "Sincronizando" };
  }

  return { status: "active" as const, label: "Conectado" };
}

export function MarketplacesSection({
  data,
  syncStatusByProvider,
  className = "",
}: MarketplacesSectionProps) {
  const mlChannel = data?.channels.find((channel) => channel.channel.toLowerCase().includes("mercado"));
  const shopeeChannel = data?.channels.find((channel) => channel.channel.toLowerCase() === "shopee");
  const sheinChannel = data?.channels.find((channel) => channel.channel.toLowerCase() === "shein");
  const statusByProvider = useMemo(
    () => ({
      mercadolivre: getMarketplaceStatus(syncStatusByProvider.mercadolivre),
      shopee: getMarketplaceStatus(syncStatusByProvider.shopee),
      shein: getMarketplaceStatus(syncStatusByProvider.shein),
    }),
    [syncStatusByProvider],
  );

  const marketplaces = [
    {
      id: "mercadolivre",
      name: "Mercado Livre",
      slug: "mercadolivre" as const,
      status: statusByProvider.mercadolivre,
      revenue: mlChannel ? formatMoney(mlChannel.grossRevenue) : undefined,
      orders: mlChannel?.unitsSold,
    },
    {
      id: "shopee",
      name: "Shopee",
      slug: "shopee" as const,
      status: statusByProvider.shopee,
      revenue: shopeeChannel ? formatMoney(shopeeChannel.grossRevenue) : undefined,
      orders: shopeeChannel?.unitsSold,
    },
    {
      id: "shein",
      name: "Shein",
      slug: "shein" as const,
      status: statusByProvider.shein,
      revenue: sheinChannel ? formatMoney(sheinChannel.grossRevenue) : undefined,
      orders: sheinChannel?.unitsSold,
    },
  ];

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

        <div className="space-y-2">
          {marketplaces.map((marketplace) => (
            <motion.div
              key={marketplace.id}
              whileHover={{ y: -1 }}
              className="group flex items-center gap-3 rounded-lg border border-border bg-surface-strong p-3 transition-all hover:border-border-strong hover:shadow-[var(--shadow-sm)]"
            >
              <div className="flex h-8 w-12 shrink-0 items-center justify-center">
                {marketplaceIcons[marketplace.slug]}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="truncate text-xs font-semibold text-foreground">{marketplace.name}</h4>
                <StatusBadge
                  status={marketplace.status.status}
                  label={marketplace.status.label}
                  className="mt-0.5"
                />
              </div>

              <Link
                href="/app/integrations"
                className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-accent" />
              </Link>
            </motion.div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}
