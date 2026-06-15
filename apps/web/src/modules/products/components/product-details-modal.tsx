"use client";

import { motion, AnimatePresence } from "framer-motion";

import {
  AlertTriangle,
  BarChart3,
  DollarSign,
  Package,
  Percent,
  ShoppingCart,
  Target,
  TrendingUp,
  Truck,
  Wallet,
  Zap,
} from "lucide-react";
import { Badge, Modal } from "@marginflow/ui";
import { cn } from "@marginflow/ui";
import { formatReferenceMonthPtBr } from "../hooks/use-product-data";
import type { ProductTableRow } from "../types/products";
import {
  formatMoney,
  formatMultiplier,
  formatNumber,
  formatPercent,
} from "../utils/formatters";

type ProductDetailsModalProps = {
  onClose: () => void;
  open: boolean;
  row: ProductTableRow | null;
};

function isNegative(value: number | null): boolean {
  return value !== null && value < 0;
}

function buildValue(
  val: number | null,
  formatter: (v: number) => string,
): string {
  if (val == null) return "—";
  return formatter(val);
}

type SectionCardProps = {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

function SectionCard({ title, icon, children, className }: SectionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={cn(
        "rounded-[var(--radius-xl)] border border-border/40 bg-gradient-to-br from-accent/[0.02] via-surface-strong/40 to-background/20 shadow-[var(--shadow-xs)] p-4 sm:p-5",
        className,
      )}
    >
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 ring-1 ring-accent/20">
          {icon}
        </div>
        <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
          {title}
        </h3>
      </div>
      {children}
    </motion.div>
  );
}

type MetricVariant = "default" | "negative" | "highlight";

type MetricCardProps = {
  label: string;
  value: string;
  icon?: React.ReactNode;
  variant?: MetricVariant;
  className?: string;
};

function MetricCard({
  label,
  value,
  icon,
  variant = "default",
  className,
}: MetricCardProps) {
  const variantStyles: Record<MetricVariant, string> = {
    default:
      "border-border/30 bg-gradient-to-br from-surface/90 to-surface-strong/30 hover:border-border/50 hover:shadow-[var(--shadow-sm)]",
    negative:
      "border-error/20 bg-error/5 hover:border-error/30 hover:shadow-[var(--shadow-sm)]",
    highlight:
      "border-accent/15 bg-accent/5 hover:border-accent/25 hover:shadow-[var(--shadow-sm)]",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      whileHover={{ y: -1, transition: { duration: 0.15 } }}
      className={cn(
        "rounded-[var(--radius-lg)] border p-4 transition-all duration-200",
        variantStyles[variant],
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            {icon && (
              <span
                className={cn(
                  "text-muted-foreground",
                  variant === "negative" && "text-error/70",
                  variant === "highlight" && "text-accent/70",
                )}
              >
                {icon}
              </span>
            )}
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground/50">
              {label}
            </p>
          </div>
          <p
            className={cn(
              "text-xl font-bold tabular-nums tracking-tight",
              variant === "negative" ? "text-error" : variant === "highlight" ? "text-accent" : "text-foreground",
            )}
          >
            {value}
          </p>
        </div>
        {variant === "negative" && (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-error/70" />
        )}
      </div>
    </motion.div>
  );
}

export function ProductDetailsModal({
  onClose,
  open,
  row,
}: ProductDetailsModalProps) {
  if (!row) {
    return null;
  }

  const shippingTotal = row.shipping * row.netLiquidSales;
  const taxValue = row.sellingPrice * (row.taxPct / 100);

  const unitProfit = row.unitProfit ?? 0;
  const margin =
    row.contributionMarginRatio !== null
      ? row.contributionMarginRatio * 100
      : null;
  const roi =
    row.roiRatio !== null ? row.roiRatio * 100 : null;
  const minimumRoas = row.minimumRoas ?? null;
  const actualRoas = row.actualRoas ?? null;

  return (
    <Modal
      className="w-[94vw] max-w-4xl"
      onClose={onClose}
      open={open}
      title={row.name}
    >
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {/* ── Info Bar ── */}
            <div className="flex items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-border/30 bg-surface/50 px-4 py-2.5">
              <div className="flex items-center gap-2.5 text-sm">
                <span className="font-mono text-xs text-muted-foreground">{row.sku}</span>
                <span aria-hidden="true" className="text-border-strong">•</span>
                <span className="text-xs text-muted-foreground">
                  {formatReferenceMonthPtBr(row.referenceMonth)}
                </span>
              </div>
              <Badge className="border-accent/20 bg-accent/10 text-accent">
                {row.channelLabel}
              </Badge>
            </div>

            {/* ── Section: Sales Overview ── */}
            <SectionCard
              title="Visão Geral de Vendas"
              icon={<ShoppingCart className="h-4 w-4 text-accent" />}
            >
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
                <MetricCard
                  label="Vendas"
                  value={formatNumber(row.sales)}
                  icon={<ShoppingCart className="h-3 w-3" />}
                  variant="default"
                />
                <MetricCard
                  label="Devoluções"
                  value={formatNumber(row.returns)}
                  icon={<Package className="h-3 w-3" />}
                  variant={row.returns > 0 ? "negative" : "default"}
                />
                <MetricCard
                  label="Venda Líquida"
                  value={formatNumber(row.netLiquidSales)}
                  icon={<TrendingUp className="h-3 w-3" />}
                  variant={
                    row.netLiquidSales < 0 ? "negative" : "highlight"
                  }
                />
              </div>
            </SectionCard>

            {/* ── Section: Price Composition ── */}
            <SectionCard
              title="Composição de Preço"
              icon={<DollarSign className="h-4 w-4 text-accent" />}
            >
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                <MetricCard
                  label="Preço de Venda"
                  value={formatMoney(row.sellingPrice)}
                  icon={<DollarSign className="h-3 w-3" />}
                  variant="highlight"
                />
                <MetricCard
                  label="Custo Unitário"
                  value={formatMoney(row.unitCost)}
                  icon={<Package className="h-3 w-3" />}
                  variant="default"
                />
                <MetricCard
                  label="Comissão"
                  value={formatPercent(row.commissionPct)}
                  icon={<Percent className="h-3 w-3" />}
                  variant="default"
                />
                <MetricCard
                  label="Frete"
                  value={formatMoney(shippingTotal)}
                  icon={<Truck className="h-3 w-3" />}
                  variant="default"
                />
                <MetricCard
                  label="Embalagem"
                  value={formatMoney(row.totalPackagingCost)}
                  icon={<Package className="h-3 w-3" />}
                  variant="default"
                />
                <MetricCard
                  label="Taxa"
                  value={formatMoney(taxValue)}
                  icon={<Percent className="h-3 w-3" />}
                  variant="default"
                />
              </div>
            </SectionCard>

            {/* ── Section: Revenue & Ads ── */}
            <SectionCard
              title="Receita & Investimento"
              icon={<Wallet className="h-4 w-4 text-accent" />}
            >
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                <MetricCard
                  label="Receita"
                  value={formatMoney(row.revenue)}
                  icon={<Wallet className="h-3 w-3" />}
                  variant="highlight"
                />
                <MetricCard
                  label="Investimento em Ads"
                  value={formatMoney(row.adSpend)}
                  icon={<BarChart3 className="h-3 w-3" />}
                  variant="default"
                />
              </div>
            </SectionCard>

            {/* ── Section: Profitability ── */}
            <SectionCard
              title="Lucratividade"
              icon={<Zap className="h-4 w-4 text-accent" />}
            >
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
                <MetricCard
                  label="Lucro Unitário"
                  value={buildValue(row.unitProfit, formatMoney)}
                  icon={<Zap className="h-3 w-3" />}
                  variant={
                    isNegative(unitProfit) ? "negative" : "highlight"
                  }
                />
                <MetricCard
                  label="Margem de Contribuição"
                  value={buildValue(
                    row.contributionMarginRatio !== null
                      ? row.contributionMarginRatio * 100
                      : null,
                    (v) => formatPercent(v, { digits: 2 }),
                  )}
                  icon={<Percent className="h-3 w-3" />}
                  variant={
                    isNegative(margin) ? "negative" : "default"
                  }
                />
                <MetricCard
                  label="ROI"
                  value={buildValue(
                    row.roiRatio !== null
                      ? row.roiRatio * 100
                      : null,
                    (v) => formatPercent(v, { digits: 2 }),
                  )}
                  icon={<TrendingUp className="h-3 w-3" />}
                  variant={isNegative(roi) ? "negative" : "default"}
                />
              </div>
            </SectionCard>

            {/* ── Section: ROAS ── */}
            <SectionCard
              title="ROAS"
              icon={<Target className="h-4 w-4 text-accent" />}
            >
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                <MetricCard
                  label="ROAS Mínimo"
                  value={formatMultiplier(row.minimumRoas)}
                  icon={<Target className="h-3 w-3" />}
                  variant="default"
                />
                <MetricCard
                  label="ROAS Real"
                  value={formatMultiplier(row.actualRoas)}
                  icon={<TrendingUp className="h-3 w-3" />}
                  variant={
                    actualRoas == null || minimumRoas == null
                      ? "default"
                      : actualRoas < minimumRoas
                        ? "negative"
                        : "highlight"
                  }
                />
              </div>
            </SectionCard>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}