"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { DollarSign } from "lucide-react";
import { containerVariants, itemVariants } from "@/lib/animations";
import { formatMoney } from "../utils/formatters";
import type { ProductTableRow } from "../types/products";

interface ProductFinancialIndicatorsProps {
  rows: ProductTableRow[];
}

interface IndicatorCardProps {
  label: string;
  value: string;
  subValue?: string;
  icon: React.ReactNode;
  variant?: "default" | "success" | "warning" | "error";
}

const variantStyles = {
  default: "border-border bg-surface-strong",
  success: "border-success/20 bg-success-soft/30",
  warning: "border-warning/20 bg-warning-soft/30",
  error: "border-error/20 bg-error-soft/30",
};

const iconBgStyles = {
  default: "bg-foreground/5 text-muted-foreground",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  error: "bg-error/10 text-error",
};

function IndicatorCard({ label, value, subValue, icon, variant = "default" }: IndicatorCardProps) {
  return (
    <motion.div
      variants={itemVariants}
      className={`
        relative overflow-hidden rounded-[var(--radius-lg)] border p-5
        shadow-[var(--shadow-xs)] transition-all duration-[var(--transition-fast)]
        hover:shadow-[var(--shadow-sm)] hover:-translate-y-0.5
        ${variantStyles[variant]}
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`
              inline-flex h-5 w-5 items-center justify-center rounded-md
              ${iconBgStyles[variant]}
            `}>
              {icon}
            </span>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
          </div>

          <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]">
            {value}
          </p>

          {subValue && (
            <p className="mt-1 text-xs text-muted-foreground">
              {subValue}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function ProductFinancialIndicators({ rows }: ProductFinancialIndicatorsProps) {
  const totalRevenue = useMemo(() => {
    return rows.reduce((sum, row) => sum + row.revenue, 0);
  }, [rows]);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <IndicatorCard
          label="Faturamento"
          value={formatMoney(totalRevenue)}
          subValue={`${rows.length} produto${rows.length !== 1 ? "s" : ""}`}
          icon={<DollarSign className="h-4 w-4" />}
          variant="default"
        />
      </div>
    </motion.div>
  );
}
