"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  DollarSign,
  Package,
  Percent,
  ShoppingCart,
  TrendingUp,
  Truck,
  Wallet,
} from "lucide-react";
import { Badge, Button, Modal, cn } from "@lucreii/ui";
import { ApiClientError, apiClient } from "@/lib/api/client";
import { productCatalogQueryKey, formatReferenceMonthPtBr } from "../hooks/use-product-data";
import { computeRowNetRevenue } from "../calculations/product-insights";
import { CurrencyInput, parseCurrencyValue } from "./currency-input";
import type { ProductTableRow } from "../types/products";
import { formatMoney, formatNumber } from "../utils/formatters";

type ProductDetailsModalProps = {
  onClose: () => void;
  open: boolean;
  row: ProductTableRow | null;
};

type TabKey = "overview" | "composition";

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
        "rounded-[var(--radius-xl)] border border-border/40 bg-gradient-to-br from-accent/[0.02] via-surface-strong/40 to-background/20 p-4 shadow-[var(--shadow-xs)] sm:p-5",
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
              "text-xl font-bold tracking-tight tabular-nums",
              variant === "negative"
                ? "text-error"
                : variant === "highlight"
                  ? "text-accent"
                  : "text-foreground",
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

function ChannelBadge({ label }: { label: string }) {
  const normalized = label.trim().toLowerCase();

  if (normalized === "mercadolivre") {
    return (
      <Badge
        className="border-transparent"
        style={{ backgroundColor: "#ffe600", color: "#000000" }}
      >
        MELI
      </Badge>
    );
  }

  if (normalized === "shopee") {
    return (
      <Badge
        className="border-transparent"
        style={{ backgroundColor: "#fa5230", color: "#ffffff" }}
      >
        SHPE
      </Badge>
    );
  }

  if (normalized === "shein") {
    return (
      <Badge
        className="border-transparent"
        style={{ backgroundColor: "#111111", color: "#ffffff" }}
      >
        Shein
      </Badge>
    );
  }

  return <Badge>{label}</Badge>;
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={cn(
        "relative z-10 whitespace-nowrap px-3 py-1.5 text-[9px] font-medium uppercase tracking-[0.12em] leading-none transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
        active ? "text-accent" : "text-muted-foreground/50 hover:text-muted-foreground/80",
      )}
    >
      {label}
      {active && (
        <motion.div
          layoutId="active-tab-underline"
          className="absolute bottom-0 left-3 right-3 h-[1.5px] rounded-full bg-accent"
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
        />
      )}
    </button>
  );
}

function TabGroup({
  activeTab,
  onChange,
  tabs,
}: {
  activeTab: TabKey;
  onChange: (key: TabKey) => void;
  tabs: { key: TabKey; label: string }[];
}) {
  return (
    <div className="relative inline-flex items-center rounded-xl border border-border/30 bg-surface/70 p-1 shadow-sm">
      {tabs.map((tab, index) => (
        <div key={tab.key} className="relative inline-flex items-center">
          <TabButton
            active={activeTab === tab.key}
            onClick={() => onChange(tab.key)}
            label={tab.label}
          />
          {index !== tabs.length - 1 && (
            <span className="mx-0.5 text-[10px] text-muted-foreground/30 select-none">|</span>
          )}
        </div>
      ))}
    </div>
  );
}

function ProductHero({ row }: { row: ProductTableRow }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [row.coverImageUrl]);

  if (!row.coverImageUrl || failed) {
    return (
      <div className="flex aspect-[4/3] w-full max-w-[320px] flex-col items-center justify-center rounded-[var(--radius-xl)] border border-border/60 bg-gradient-to-br from-surface-strong via-surface to-background text-muted-foreground shadow-[var(--shadow-md)]">
        <Package className="h-10 w-10" />
        <span className="mt-2 text-xs">Sem foto</span>
      </div>
    );
  }

  return (
    <div className="relative aspect-[4/3] w-full max-w-[320px] overflow-hidden rounded-[var(--radius-xl)] border border-border/60 bg-gradient-to-br from-surface-strong via-surface to-background shadow-[var(--shadow-md)]">
      <Image
        alt={row.name}
        className="object-cover"
        fill
        onError={() => setFailed(true)}
        sizes="320px"
        src={row.coverImageUrl}
      />
    </div>
  );
}

export function ProductDetailsModal({
  onClose,
  open,
  row,
}: ProductDetailsModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [advertisingCost, setAdvertisingCost] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!row) return;
    setActiveTab("overview");
    setAdvertisingCost(String(row.advertisingCost));
    setErrorMessage(null);
  }, [row]);

  const updateMutation = useMutation({
    mutationFn: async (nextAdvertisingCost: string) => {
      if (!row) {
        throw new Error("Produto não encontrado.");
      }

      return apiClient.patch<{ data: { id: string }; error: null }>(
        `/performance/${row.performanceId}`,
        {
          body: {
            advertisingCost: nextAdvertisingCost,
          },
        },
      );
    },
    onError: (error) => {
      setErrorMessage(
        error instanceof ApiClientError
          ? error.message
          : "Não foi possível salvar o investimento em publicidade.",
      );
    },
    onSuccess: async () => {
      setErrorMessage(null);
      await queryClient.invalidateQueries({ queryKey: productCatalogQueryKey });
      onClose();
    },
  });

  if (!row) {
    return null;
  }

  const netRevenue = computeRowNetRevenue(row);

  return (
    <Modal
      className="!max-w-6xl"
      onClose={onClose}
      open={open}
      title={
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-foreground">{row.name}</h2>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">SKU: {row.sku}</span>
            <Badge
              className={
                row.isActive
                  ? "border-success/20 bg-success/10 text-success"
                  : "border-muted/20 bg-muted/10 text-muted-foreground"
              }
            >
              {row.isActive ? "ATIVO" : "ARQUIVADO"}
            </Badge>
          </div>
        </div>
      }
    >
      <AnimatePresence>
        {open && (
          <motion.form
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              const rawAdvertisingCost = String(formData.get("advertisingCost") ?? "");
              const nextAdvertisingCost = parseCurrencyValue(rawAdvertisingCost);
              setAdvertisingCost(nextAdvertisingCost);
              updateMutation.mutate(nextAdvertisingCost);
            }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <div className="flex justify-center">
              <TabGroup
                activeTab={activeTab}
                onChange={setActiveTab}
                tabs={[
                  { key: "overview", label: "Visão Geral" },
                  { key: "composition", label: "Composição" },
                ]}
              />
            </div>

            {activeTab === "overview" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                <div className="mx-auto flex justify-center">
                  <ProductHero row={row} />
                </div>

                <div className="flex items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-border/30 bg-surface/50 px-4 py-2.5">
                  <span className="text-xs text-muted-foreground">
                    {formatReferenceMonthPtBr(row.referenceMonth)}
                  </span>
                  <ChannelBadge label={row.channelLabel} />
                </div>

                <SectionCard
                  title="Visão Geral de Vendas"
                  icon={<ShoppingCart className="h-4 w-4 text-accent" />}
                >
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <MetricCard
                      label="Faturamento"
                      value={formatMoney(row.revenue)}
                      icon={<Wallet className="h-3 w-3" />}
                      variant="highlight"
                    />
                    <MetricCard
                      label="Receita Líquida"
                      value={formatMoney(netRevenue)}
                      icon={<TrendingUp className="h-3 w-3" />}
                      variant={netRevenue < 0 ? "negative" : "default"}
                    />
                    <MetricCard
                      label="Vendas"
                      value={formatNumber(row.sales)}
                      icon={<ShoppingCart className="h-3 w-3" />}
                    />
                    <MetricCard
                      label="Devoluções"
                      value={formatNumber(row.returns)}
                      icon={<Package className="h-3 w-3" />}
                      variant={row.returns > 0 ? "negative" : "default"}
                    />
                  </div>
                </SectionCard>

              </motion.div>
            )}

            {activeTab === "composition" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                <SectionCard
                  title="Composição de Preço"
                  icon={<DollarSign className="h-4 w-4 text-accent" />}
                >
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                    />
                    <MetricCard
                      label="Comissão"
                      value={formatMoney(row.marketplaceCommissionUnit ?? 0)}
                      icon={<Percent className="h-3 w-3" />}
                    />
                    <MetricCard
                      label="Frete/Custo Fixo"
                      value={formatMoney(row.shippingOrFixedFeeUnit ?? 0)}
                      icon={<Truck className="h-3 w-3" />}
                    />
                    <MetricCard
                      label="Embalagem"
                      value={formatMoney(row.packagingCost)}
                      icon={<Package className="h-3 w-3" />}
                    />
                    <MetricCard
                      label="Imposto"
                      value={`${row.taxPct}%`}
                      icon={<Percent className="h-3 w-3" />}
                    />
                  </div>

                  <div className="mt-4 rounded-[var(--radius-lg)] border border-border/30 bg-surface/80 p-4">
                    <label
                      className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground/60"
                      htmlFor="performance-advertising-cost"
                    >
                      Investimento em Publicidade
                    </label>
                    <div className="mt-2">
                      <CurrencyInput
                        id="performance-advertising-cost"
                        name="advertisingCost"
                        onChange={setAdvertisingCost}
                        placeholder="0,00"
                        required
                        value={advertisingCost}
                      />
                    </div>
                  </div>
                </SectionCard>

                {errorMessage ? (
                  <div className="rounded-[var(--radius-md)] border border-error/30 bg-error/10 px-3 py-2.5 text-sm text-error">
                    {errorMessage}
                  </div>
                ) : null}

                <div className="flex justify-end border-t border-border/30 pt-4">
                  <Button disabled={updateMutation.isPending} type="submit">
                    Salvar
                  </Button>
                </div>
              </motion.div>
            )}
          </motion.form>
        )}
      </AnimatePresence>
    </Modal>
  );
}
