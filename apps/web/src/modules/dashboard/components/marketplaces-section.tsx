"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowUpRight, ExternalLink } from "lucide-react";
import { Card } from "@marginflow/ui";
import { StatusBadge } from "@/components/ui-premium/status-badge";
import { slideInUpVariants } from "@/lib/animations";
import type { DashboardChartsResponse } from "@marginflow/types";
import { formatMoney } from "../utils/formatters";

interface MarketplacesSectionProps {
  data?: DashboardChartsResponse;
  className?: string;
}

const marketplaceIcons = {
  mercadolivre: (
    <svg viewBox="0 0 40 40" className="h-8 w-8" fill="none">
      <rect width="40" height="40" rx="8" fill="#FFE600" />
      <path d="M20 10c-6 0-11 3-14 8 3 5 8 8 14 8s11-3 14-8c-3-5-8-8-14-8z" fill="#2D3277" />
      <circle cx="14" cy="18" r="2.5" fill="white" />
      <circle cx="26" cy="18" r="2.5" fill="white" />
    </svg>
  ),
};

const statusConfig = {
  connected: { status: "active" as const, label: "Conectado" },
  disconnected: { status: "inactive" as const, label: "Desconectado" },
};

export function MarketplacesSection({ data, className = "" }: MarketplacesSectionProps) {
  const mlChannel = data?.channels.find((channel) => channel.channel.toLowerCase().includes("mercado"));
  const marketplace = {
    id: "mercadolivre",
    name: "Mercado Livre",
    slug: "mercadolivre" as const,
    status: (mlChannel ? "connected" : "disconnected") as keyof typeof statusConfig,
    revenue: mlChannel ? formatMoney(mlChannel.grossRevenue) : undefined,
    orders: mlChannel?.unitsSold ?? undefined,
    href: "/app/integrations",
  };
  const statusBadge = statusConfig[marketplace.status];

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

          {marketplace.status === "connected" && (marketplace.revenue || marketplace.orders) && (
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
