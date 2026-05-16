"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { StatusBadge } from "@/components/ui-premium/status-badge";
import { fadeInVariants } from "@/lib/animations";
import type { CatalogStats } from "../types/products";
import { getGreeting } from "../utils/formatters";

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

    if (stats.pendingSyncProducts > 0) {
      return { badge: { status: "pending" as const, label: "Revisão pendente" }, color: "info" };
    }

    return { badge: { status: "success" as const, label: "Catálogo saudável" }, color: "success" };
  }, [stats]);

  return (
    <motion.div variants={fadeInVariants} initial="hidden" animate="visible" className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {greeting}, {organizationName}
        </h1>
        <StatusBadge status={statusConfig.badge.status} label={statusConfig.badge.label} />
      </div>
      <p className="text-sm text-muted-foreground">
        Gerencie seu catálogo de produtos, custos e revisões sincronizadas
      </p>
    </motion.div>
  );
}
