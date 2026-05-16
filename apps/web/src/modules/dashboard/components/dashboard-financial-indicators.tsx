"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, DollarSign, Percent, Scale, Settings2, PiggyBank } from "lucide-react";
import { containerVariants, itemVariants } from "@/lib/animations";
import { formatMoney, formatPercent } from "../utils/formatters";
import type { DashboardProfitabilityResponse, DashboardSummaryResponse } from "@marginflow/types";

interface DashboardFinancialIndicatorsProps {
  data: DashboardProfitabilityResponse;
  summary?: DashboardSummaryResponse;
}

interface IndicatorCardProps {
  label: string;
  value: string;
  subValue?: string;
  icon: React.ReactNode;
  variant?: "default" | "success" | "warning" | "error";
  trend?: {
    direction: "up" | "down" | "neutral";
    value: string;
  };
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

function IndicatorCard({ label, value, subValue, icon, variant = "default", trend }: IndicatorCardProps) {
  const TrendIcon =
    trend?.direction === "up" ? TrendingUp : trend?.direction === "down" ? TrendingDown : Minus;

  const trendColorClass =
    trend?.direction === "up"
      ? "text-success"
      : trend?.direction === "down"
        ? "text-error"
        : "text-muted-foreground";

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
            <span
              className={`
              inline-flex h-5 w-5 items-center justify-center rounded-md
              ${iconBgStyles[variant]}
            `}
            >
              {icon}
            </span>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
          </div>

          <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]">
            {value}
          </p>

          {subValue && <p className="mt-1 text-xs text-muted-foreground">{subValue}</p>}

          {trend && (
            <div className="mt-2 flex items-center gap-1.5">
              <TrendIcon className={`h-3.5 w-3.5 ${trendColorClass}`} />
              <span className={`text-xs font-medium ${trendColorClass}`}>{trend.value}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function parseDecimal(value: string): number {
  return parseFloat(value) || 0;
}

function normalizeNumber(value: string | number | undefined | null): number {
  if (value === undefined || value === null) return 0;
  const parsed = typeof value === "string" ? parseFloat(value) : value;
  return Number.isFinite(parsed) ? parsed : 0;
}

export function DashboardFinancialIndicators({ data, summary }: DashboardFinancialIndicatorsProps) {
  const [fixedCost, setFixedCost] = useState<number>(0);
  const [isEditing, setIsEditing] = useState(false);

  const financials = useMemo(() => {
    let totalRevenue = 0;
    let totalProfit = 0;
    let totalAdSpend = 0;

    for (const product of data.products) {
      totalRevenue += parseDecimal(product.revenue);
      totalProfit += parseDecimal(product.grossProfit);
      totalAdSpend += parseDecimal(product.adSpend);
    }

    const averageMargin = totalRevenue > 0 ? totalProfit / totalRevenue : 0;
    const breakEvenPoint = averageMargin > 0 ? fixedCost / averageMargin : 0;
    const netProfit = totalProfit - fixedCost - totalAdSpend;

    return {
      totalRevenue,
      totalProfit,
      totalAdSpend,
      averageMargin,
      breakEvenPoint,
      netProfit,
    };
  }, [data.products, fixedCost]);

  const handleFixedCostChange = useCallback((value: string) => {
    const digits = value.replace(/\D/g, "");
    const numeric = parseFloat(digits) / 100;
    setFixedCost(Number.isFinite(numeric) ? numeric : 0);
  }, []);

  const getNetProfitVariant = (): IndicatorCardProps["variant"] => {
    if (financials.netProfit > 0) return "success";
    if (financials.netProfit < 0) return "error";
    return "warning";
  };

  const getNetProfitTrend = () => {
    const percentOfRevenue =
      financials.totalRevenue > 0 ? (financials.netProfit / financials.totalRevenue) * 100 : 0;

    if (financials.netProfit > 0) {
      return {
        direction: "up" as const,
        value: `${percentOfRevenue.toFixed(1)}% do faturamento`,
      };
    }
    if (financials.netProfit < 0) {
      return {
        direction: "down" as const,
        value: `${percentOfRevenue.toFixed(1)}% do faturamento`,
      };
    }
    return { direction: "neutral" as const, value: "Break-even" };
  };

  const formatCurrencyInput = (value: number): string => {
    return value.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const revenue = summary ? normalizeNumber(summary.summary.grossRevenue) : financials.totalRevenue;
  const revenueSub = summary
    ? `${summary.summary.ordersCount} pedidos · ${summary.summary.unitsSold} unidades`
    : `${data.products.length} produtos`;

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
          value={formatMoney(revenue)}
          subValue={revenueSub}
          icon={<DollarSign className="h-4 w-4" />}
          variant="default"
        />

        <IndicatorCard
          label="Margem Média"
          value={formatPercent(financials.averageMargin)}
          subValue={financials.totalProfit >= 0 ? "Lucrativo" : "Prejuízo"}
          icon={<Percent className="h-4 w-4" />}
          variant={
            financials.averageMargin > 0.2
              ? "success"
              : financials.averageMargin > 0
                ? "warning"
                : "error"
          }
          trend={{
            direction:
              financials.averageMargin > 0.3
                ? "up"
                : financials.averageMargin > 0
                  ? "neutral"
                  : "down",
            value: `Lucro: ${formatMoney(financials.totalProfit)}`,
          }}
        />

        <IndicatorCard
          label="Ponto de Equilíbrio"
          value={formatMoney(financials.breakEvenPoint)}
          subValue="Meta para cobrir custo fixo"
          icon={<Scale className="h-4 w-4" />}
          variant={financials.totalRevenue >= financials.breakEvenPoint ? "success" : "warning"}
          trend={{
            direction: financials.totalRevenue >= financials.breakEvenPoint ? "up" : "down",
            value:
              financials.totalRevenue >= financials.breakEvenPoint
                ? "Meta atingida"
                : "Abaixo da meta",
          }}
        />

        <IndicatorCard
          label="Lucro Líquido"
          value={formatMoney(financials.netProfit)}
          subValue="Após custos fixos e publicidade"
          icon={<PiggyBank className="h-4 w-4" />}
          variant={getNetProfitVariant()}
          trend={getNetProfitTrend()}
        />
      </div>

      <motion.div
        variants={itemVariants}
        className="flex items-center justify-between rounded-lg border border-border/50 bg-surface px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Custo Fixo</span>
        </div>

        {isEditing ? (
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                R$
              </span>
              <input
                type="text"
                inputMode="decimal"
                defaultValue={formatCurrencyInput(fixedCost)}
                onBlur={(e) => {
                  handleFixedCostChange(e.target.value);
                  setIsEditing(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleFixedCostChange(e.currentTarget.value);
                    setIsEditing(false);
                  }
                  if (e.key === "Escape") {
                    setIsEditing(false);
                  }
                }}
                autoFocus
                className="h-9 w-36 rounded-md border border-border bg-background pl-7 pr-3 text-right text-sm font-medium tabular-nums text-foreground shadow-sm transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                placeholder="0,00"
              />
            </div>
            <button
              onClick={() => setIsEditing(false)}
              className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="group flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-semibold tabular-nums text-foreground transition-colors hover:bg-muted hover:text-accent"
          >
            {formatMoney(fixedCost)}
            <Settings2 className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}
