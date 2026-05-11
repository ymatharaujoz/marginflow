"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Package,
  Archive,
  DollarSign,
  Clock,
} from "lucide-react";
import { StatusBadge } from "@/components/ui-premium/status-badge";
import { StatCard } from "@/components/ui-premium/stat-card";
import { fadeInVariants, containerVariants } from "@/lib/animations";
import type { CatalogStats } from "../types/products";
import { getGreeting, formatNumber } from "../utils/formatters";

interface ProductHeaderProps {
  organizationName: string;
  stats: CatalogStats | null;
}

export function ProductHeader({
  organizationName,
  stats,
}: ProductHeaderProps) {
  const greeting = useMemo(() => getGreeting(), []);

  const statusConfig = useMemo(() => {
    if (!stats) return { badge: { status: "pending" as const, label: "Carregando" }, color: "muted" };

    if (stats.totalProducts === 0) {
      return { badge: { status: "inactive" as const, label: "Catálogo vazio" }, color: "muted" };
    }

    if (stats.productsWithoutCost > 0) {
      return { badge: { status: "warning" as const, label: "Custos pendentes" }, color: "warning" };
    }

    if (stats.pendingSyncProducts > 0) {
      return { badge: { status: "pending" as const, label: "Revisão pendente" }, color: "info" };
    }

    return { badge: { status: "success" as const, label: "Catálogo saudável" }, color: "success" };
  }, [stats]);

  const statCards = useMemo(() => {
    if (!stats) return [];

    return [
      {
        key: "total",
        label: "Total de Produtos",
        value: formatNumber(stats.totalProducts),
        icon: <Package className="h-4 w-4" />,
        trend: { direction: "neutral" as const, value: `${formatNumber(stats.activeProducts)} ativos` },
        variant: "default" as const,
      },
      {
        key: "with-cost",
        label: "Com Custo Cadastrado",
        value: formatNumber(stats.productsWithCost),
        icon: <DollarSign className="h-4 w-4" />,
        trend: { 
          direction: stats.productsWithoutCost > 0 ? "down" as const : "up" as const, 
          value: stats.productsWithoutCost > 0 ? `${formatNumber(stats.productsWithoutCost)} sem` : "100% completo" 
        },
        variant: stats.productsWithoutCost > 0 ? "warning" as const : "success" as const,
      },
      {
        key: "pending",
        label: "Pendentes ML",
        value: formatNumber(stats.pendingSyncProducts),
        icon: <Clock className="h-4 w-4" />,
        trend: { 
          direction: stats.pendingSyncProducts > 0 ? "up" as const : "neutral" as const, 
          value: stats.pendingSyncProducts > 0 ? "Revisar" : "Sincronizado" 
        },
        variant: stats.pendingSyncProducts > 0 ? "accent" as const : "default" as const,
      },
      {
        key: "archived",
        label: "Arquivados",
        value: formatNumber(stats.archivedProducts),
        icon: <Archive className="h-4 w-4" />,
        trend: { direction: "neutral" as const, value: "Inativos" },
        variant: "default" as const,
      },
    ];
  }, [stats]);

  return (
    <motion.div variants={fadeInVariants} initial="hidden" animate="visible" className="space-y-6">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {greeting}, {organizationName}
          </h1>
          <StatusBadge status={statusConfig.badge.status} label={statusConfig.badge.label} />
        </div>
        <p className="text-sm text-muted-foreground">
          Gerencie seu catálogo de produtos, custos e revisões sincronizadas.
        </p>
      </div>

      {/* Cards de estatísticas elegantes */}
      {stats && (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          {statCards.map((card) => (
            <StatCard
              key={card.key}
              label={card.label}
              value={card.value}
              icon={card.icon}
              trend={card.trend}
              variant={card.variant}
            />
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
