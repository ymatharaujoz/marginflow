"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, DollarSign, Percent, Scale, Settings2, PiggyBank } from "lucide-react";
import type { Company, DashboardProfitabilityResponse, DashboardSummaryResponse } from "@lucreii/types";
import { ApiClientError, apiClient } from "@/lib/api/client";
import { containerVariants, itemVariants } from "@/lib/animations";
import { Card, Button, Input } from "@lucreii/ui";
import {
  buildCompanyDefaultsPatch,
  formatCurrencyInput,
} from "./company-finance-defaults";
import { formatMoney, formatPercent } from "../utils/formatters";

interface DashboardFinancialIndicatorsProps {
  activeCompany: Company | null;
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
        <div className="min-w-0 flex-1">
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
  return Number.parseFloat(value) || 0;
}

function normalizeNumber(value: string | number | undefined | null): number {
  if (value === undefined || value === null) return 0;
  const parsed = typeof value === "string" ? Number.parseFloat(value) : value;
  return Number.isFinite(parsed) ? parsed : 0;
}

export function DashboardFinancialIndicators({
  activeCompany,
  data,
  summary,
}: DashboardFinancialIndicatorsProps) {
  const [fixedCost, setFixedCost] = useState<number>(0);
  const [taxPercent, setTaxPercent] = useState<number>(0);
  const [fixedCostInput, setFixedCostInput] = useState("0,00");
  const [taxPercentInput, setTaxPercentInput] = useState("0,00");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    const nextFixedCost = activeCompany ? Number.parseFloat(activeCompany.fixedCostDefault) || 0 : 0;
    const nextTaxPercent = activeCompany ? (Number.parseFloat(activeCompany.taxRateDefault) || 0) * 100 : 0;

    setFixedCost(nextFixedCost);
    setTaxPercent(nextTaxPercent);
    setFixedCostInput(formatCurrencyInput(nextFixedCost));
    setTaxPercentInput(formatCurrencyInput(nextTaxPercent));
  }, [activeCompany]);

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
      averageMargin,
      breakEvenPoint,
      netProfit,
      totalAdSpend,
      totalProfit,
      totalRevenue,
    };
  }, [data.products, fixedCost]);

  const cancelEditing = useCallback(() => {
    setFixedCostInput(formatCurrencyInput(fixedCost));
    setTaxPercentInput(formatCurrencyInput(taxPercent));
    setFeedbackMessage(null);
    setIsEditing(false);
  }, [fixedCost, taxPercent]);

  const saveCompanyDefaults = useCallback(async () => {
    if (!activeCompany) {
      setFeedbackMessage("Nenhuma empresa ativa disponível para salvar");
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setFeedbackMessage(null);

    try {
      const patch = buildCompanyDefaultsPatch({
        fixedCostInput,
        taxPercentInput,
      });
      const response = await apiClient.patch<{ data: Company; error: null }>(`/companies/${activeCompany.id}`, {
        body: patch,
      });
      const nextFixedCost = Number.parseFloat(response.data.fixedCostDefault) || 0;
      const nextTaxPercent = (Number.parseFloat(response.data.taxRateDefault) || 0) * 100;

      setFixedCost(nextFixedCost);
      setTaxPercent(nextTaxPercent);
      setFixedCostInput(formatCurrencyInput(nextFixedCost));
      setTaxPercentInput(formatCurrencyInput(nextTaxPercent));
      setFeedbackMessage("Valores salvos.");
      setIsEditing(false);
    } catch (error) {
      setFeedbackMessage(
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Não foi possivel salvar os valores da empresa",
      );
    } finally {
      setIsSaving(false);
    }
  }, [activeCompany, fixedCostInput, taxPercentInput]);

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

      <motion.div variants={itemVariants}>
        <Card variant="default" padding="md">
          <div className="flex flex-col gap-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] bg-accent/10">
                    <Settings2 className="h-4 w-4 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Custo e Imposto</h3>
                    <p className="text-xs text-muted-foreground">
                      {activeCompany
                        ? `${activeCompany.name}`
                        : "Nenhuma empresa ativa disponivel"}
                    </p>
                  </div>
                </div>
              </div>

              {!isEditing && (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!activeCompany}
                  onClick={() => {
                    setFeedbackMessage(null);
                    setFixedCostInput("");
                    setTaxPercentInput("");
                    setIsEditing(true);
                  }}
                >
                  <Settings2 className="mr-1.5 h-3.5 w-3.5" />
                  Editar
                </Button>
              )}
            </div>

            {isEditing ? (
              <div className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <DollarSign className="h-3.5 w-3.5" />
                      Custo Fixo
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                        R$
                      </span>
                      <Input
                        autoFocus
                        className="pl-9 text-right text-base font-semibold tabular-nums"
                        inputMode="decimal"
                        onChange={(event) => setFixedCostInput(event.target.value)}
                        placeholder="0,00"
                        type="text"
                        value={fixedCostInput}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Valor de custos operacionais fixos
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <Percent className="h-3.5 w-3.5" />
                      Imposto
                    </label>
                    <div className="relative">
                      <Input
                        className="pr-9 text-right text-base font-semibold tabular-nums"
                        inputMode="decimal"
                        onChange={(event) => setTaxPercentInput(event.target.value)}
                        placeholder="0,00"
                        type="text"
                        value={taxPercentInput}
                      />
                      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                        %
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Alíquota de impostos sobre os produtos
                    </p>
                  </div>
                </div>

                {feedbackMessage && (
                  <p className="text-xs font-medium text-muted-foreground">{feedbackMessage}</p>
                )}

                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isSaving}
                    onClick={cancelEditing}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    loading={isSaving}
                    onClick={() => {
                      void saveCompanyDefaults();
                    }}
                  >
                    Salvar alterações
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-border/60 bg-surface-strong px-4 py-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] bg-foreground/5">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Custo Fixo
                    </p>
                    <p className="text-lg font-semibold tracking-tight text-foreground tabular-nums">
                      {formatMoney(fixedCost)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-border/60 bg-surface-strong px-4 py-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] bg-foreground/5">
                    <Percent className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Imposto
                    </p>
                    <p className="text-lg font-semibold tracking-tight text-foreground tabular-nums">
                      {formatCurrencyInput(taxPercent)}%
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
