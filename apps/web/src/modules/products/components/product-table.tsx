"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Package,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Search,
  Filter,
  X,
  Store,
  HeartPulse,
} from "lucide-react";
import { Card, EmptyState, Badge, Button, cn } from "@marginflow/ui";
import { StatusBadge } from "@/components/ui-premium/status-badge";
import { Pagination } from "@/components/ui-premium/pagination";
import { slideInUpVariants } from "@/lib/animations";
import type { ProductTableRow, PaginationState } from "../types/products";
import { formatMoney, formatPercent, formatNumber } from "../utils/formatters";

/** SWC/Turbopack parses `<motion.tr` poorly in some setups; use a capitalized alias. */
const MotionTableRow = motion.tr;

interface ProductTableProps {
  rows: ProductTableRow[];
  pagination: PaginationState;
  onPageChange: (page: number) => void;
  className?: string;
}

type SortKey =
  | "name"
  | "sales"
  | "returns"
  | "netSales"
  | "revenue"
  | "averageTicket"
  | "commission"
  | "shipping"
  | "tax"
  | "totalCost"
  | "adSpend"
  | "roas"
  | "profit"
  | "margin"
  | "roi"
  | "health";
type SortDirection = "asc" | "desc" | null;

const healthBadgeConfig = {
  critical: { status: "error" as const, label: "Crítico" },
  attention: { status: "warning" as const, label: "Atenção" },
  neutral: { status: "inactive" as const, label: "Neutro" },
  healthy: { status: "success" as const, label: "Saudável" },
  scalable: { status: "active" as const, label: "Escalável" },
};

const channelLabels: Record<string, string> = {
  mercadolivre: "MELI",
};

const marketplaceOptions = [{ value: "mercadolivre", label: "Mercado Livre" }];

const healthOptions = [
  { value: "critical", label: "Crítico", color: "bg-error" },
  { value: "attention", label: "Atenção", color: "bg-warning" },
  { value: "neutral", label: "Neutro", color: "bg-muted" },
  { value: "healthy", label: "Saudável", color: "bg-success" },
  { value: "scalable", label: "Escalável", color: "bg-accent" },
];

function getChannelBadge(channel: string) {
  const label = channelLabels[channel] ?? "MELI";
  return <Badge>{label}</Badge>;
}

export function ProductTable({
  rows,
  pagination,
  onPageChange,
  className = "",
}: ProductTableProps) {
  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: SortDirection;
  } | null>(null);

  // Filter states
  const [skuFilter, setSkuFilter] = useState("");
  const [selectedMarketplaces, setSelectedMarketplaces] = useState<string[]>([]);
  const [selectedHealth, setSelectedHealth] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const handleSort = (key: SortKey) => {
    let direction: SortDirection = "asc";

    if (sortConfig?.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    } else if (sortConfig?.key === key && sortConfig.direction === "desc") {
      direction = null;
    }

    setSortConfig(direction ? { key, direction } : null);
  };

  // Apply filters and sorting
  const filteredRows = useMemo(() => {
    let result = [...rows];

    // SKU filter (case-insensitive, matches name or SKU)
    if (skuFilter.trim()) {
      const search = skuFilter.toLowerCase().trim();
      result = result.filter(
        (row) =>
          row.name.toLowerCase().includes(search) ||
          (row.sku && row.sku.toLowerCase().includes(search))
      );
    }

    // Marketplace filter
    if (selectedMarketplaces.length > 0) {
      result = result.filter((row) =>
        selectedMarketplaces.includes(row.channelLabel)
      );
    }

    // Health filter
    if (selectedHealth.length > 0) {
      result = result.filter((row) => selectedHealth.includes(row.health));
    }

    // Sorting
    if (sortConfig) {
      const { key, direction } = sortConfig;
      result.sort((a, b) => {
        const aValue = a[key];
        const bValue = b[key];

        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        if (typeof aValue === "string" && typeof bValue === "string") {
          return direction === "asc"
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        if (typeof aValue === "number" && typeof bValue === "number") {
          return direction === "asc" ? aValue - bValue : bValue - aValue;
        }

        return 0;
      });
    }

    return result;
  }, [rows, skuFilter, selectedMarketplaces, selectedHealth, sortConfig]);

  // Clear all filters
  const clearAllFilters = () => {
    setSkuFilter("");
    setSelectedMarketplaces([]);
    setSelectedHealth([]);
  };

  const hasActiveFilters =
    skuFilter.trim() ||
    selectedMarketplaces.length > 0 ||
    selectedHealth.length > 0;

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortConfig?.key !== column) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />;
    }
    return sortConfig.direction === "asc" ? (
      <ChevronUp className="h-3.5 w-3.5 text-accent" />
    ) : (
      <ChevronDown className="h-3.5 w-3.5 text-accent" />
    );
  };

  if (rows.length === 0) {
    return (
      <Card padding="lg" className={className}>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-foreground">Produtos</h3>
          <p className="text-xs text-muted-foreground">Performance por SKU</p>
        </div>
        <EmptyState
          title="Nenhum produto cadastrado"
          description="Comece criando seu primeiro produto para gerenciar custos e margens."
          icon={<Package className="h-6 w-6" />}
        />
      </Card>
    );
  }

  return (
    <motion.div variants={slideInUpVariants} className={className}>
      <Card padding="lg" className="min-w-0 overflow-hidden">
        {/* Header minimalista */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Produtos</h3>
            <p className="text-xs text-muted-foreground/70">Performance por SKU</p>
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-1.5 rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-medium transition-all duration-[var(--transition-fast)] ${
              showFilters || hasActiveFilters
                ? "bg-accent text-white shadow-sm"
                : "bg-surface-strong text-muted-foreground hover:text-foreground border border-border hover:border-border-strong"
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            Filtros
            {hasActiveFilters && (
              <span className="ml-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-white/25 px-1 text-[10px] font-semibold">
                {selectedMarketplaces.length + selectedHealth.length + (skuFilter ? 1 : 0)}
              </span>
            )}
          </button>
        </div>

        {/* Filter Bar - Experiência otimizada */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="mb-5 rounded-[var(--radius-lg)] border border-border bg-surface-strong/50 p-4"
          >
            {/* Grid de filtros */}
            <div className="grid gap-4 md:grid-cols-[1fr_auto_auto] md:items-start">
              {/* Busca */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Search className="h-3.5 w-3.5 text-accent" />
                  Buscar produto
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={skuFilter}
                    onChange={(e) => setSkuFilter(e.target.value)}
                    placeholder="Nome ou SKU do produto..."
                    className="h-9 w-full rounded-[var(--radius-md)] border border-border bg-background px-3 pr-8 text-sm text-foreground placeholder:text-muted-foreground/60 transition-all duration-[var(--transition-fast)] hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                  {skuFilter ? (
                    <button
                      onClick={() => setSkuFilter("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <Search className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
                  )}
                </div>
              </div>

              {/* Marketplace */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Store className="h-3.5 w-3.5 text-accent" />
                  Marketplace
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {marketplaceOptions.map((option) => {
                    const isSelected = selectedMarketplaces.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSelectedMarketplaces((prev) =>
                            isSelected
                              ? prev.filter((v) => v !== option.value)
                              : [...prev, option.value]
                          );
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-medium transition-all duration-[var(--transition-fast)] ${
                          isSelected
                            ? "bg-accent text-white shadow-sm"
                            : "border border-border bg-background text-muted-foreground hover:border-border-strong hover:text-foreground"
                        }`}
                      >
                        {isSelected && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white/20"
                          >
                            <X className="h-2.5 w-2.5" />
                          </motion.span>
                        )}
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status de Saúde */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <HeartPulse className="h-3.5 w-3.5 text-accent" />
                  Status de saúde
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {healthOptions.map((option) => {
                    const isSelected = selectedHealth.includes(option.value);
                    const isActive = isSelected;
                    return (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSelectedHealth((prev) =>
                            isSelected
                              ? prev.filter((v) => v !== option.value)
                              : [...prev, option.value]
                          );
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-[var(--radius-md)] px-2.5 py-1.5 text-xs font-medium transition-all duration-[var(--transition-fast)] ${
                          isActive
                            ? option.value === "critical"
                              ? "bg-error/15 text-error ring-1 ring-error/30"
                              : option.value === "attention"
                                ? "bg-warning/15 text-warning ring-1 ring-warning/30"
                                : option.value === "healthy"
                                  ? "bg-success/15 text-success ring-1 ring-success/30"
                                  : option.value === "scalable"
                                    ? "bg-accent/15 text-accent ring-1 ring-accent/30"
                                    : "bg-muted/30 text-muted-foreground ring-1 ring-border"
                            : "border border-border bg-background text-muted-foreground hover:border-border-strong hover:text-foreground"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            option.value === "critical"
                              ? "bg-error"
                              : option.value === "attention"
                                ? "bg-warning"
                                : option.value === "healthy"
                                  ? "bg-success"
                                  : option.value === "scalable"
                                    ? "bg-accent"
                                    : "bg-muted-foreground"
                          }`}
                        />
                        {option.label}
                        {isActive && (
                          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}>
                            <X className="h-3 w-3" />
                          </motion.span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Filtros ativos e limpar */}
            {hasActiveFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-4 flex items-center gap-2 border-t border-border/50 pt-3"
              >
                <span className="text-xs font-medium text-muted-foreground">Filtros ativos:</span>
                <div className="flex flex-1 flex-wrap items-center gap-1.5">
                  {skuFilter && (
                    <span className="inline-flex items-center gap-1 rounded-[var(--radius-md)] bg-accent/10 px-2 py-1 text-xs font-medium text-accent">
                      <Search className="h-3 w-3" />
                      "{skuFilter}"
                      <button
                        onClick={() => setSkuFilter("")}
                        className="ml-0.5 rounded p-0.5 hover:bg-accent/20"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {selectedMarketplaces.map((m) => (
                    <span
                      key={m}
                      className="inline-flex items-center gap-1 rounded-[var(--radius-md)] bg-accent/10 px-2 py-1 text-xs font-medium text-accent"
                    >
                      <Store className="h-3 w-3" />
                      {marketplaceOptions.find((o) => o.value === m)?.label}
                      <button
                        onClick={() =>
                          setSelectedMarketplaces((prev) => prev.filter((v) => v !== m))
                        }
                        className="ml-0.5 rounded p-0.5 hover:bg-accent/20"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  {selectedHealth.map((h) => {
                    const opt = healthOptions.find((o) => o.value === h);
                    return (
                      <span
                        key={h}
                        className={`inline-flex items-center gap-1 rounded-[var(--radius-md)] px-2 py-1 text-xs font-medium ${
                          h === "critical"
                            ? "bg-error/10 text-error"
                            : h === "attention"
                              ? "bg-warning/10 text-warning"
                              : h === "healthy"
                                ? "bg-success/10 text-success"
                                : h === "scalable"
                                  ? "bg-accent/10 text-accent"
                                  : "bg-muted/30 text-muted-foreground"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            h === "critical"
                              ? "bg-error"
                              : h === "attention"
                                ? "bg-warning"
                                : h === "healthy"
                                  ? "bg-success"
                                  : h === "scalable"
                                    ? "bg-accent"
                                    : "bg-muted-foreground"
                          }`}
                        />
                        {opt?.label}
                        <button
                          onClick={() => setSelectedHealth((prev) => prev.filter((v) => v !== h))}
                          className="ml-0.5 rounded p-0.5 hover:bg-foreground/10"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
                <button
                  onClick={clearAllFilters}
                  className="inline-flex items-center gap-1 rounded-[var(--radius-md)] px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                  Limpar tudo
                </button>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Scroll horizontal com colunas fixas */}
        <div className="relative -mx-6 min-w-0">
          <div
            className="max-w-full min-w-0 overflow-x-auto overscroll-x-contain"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'var(--border-strong) transparent',
            }}
          >
            <div className="min-w-[1200px] px-6">
              <table className="w-full border-collapse text-sm">
                <thead>
                <tr className="border-b border-border bg-surface-strong/95">
                  {/* 1. Produto (com SKU) - STICKY LEFT */}
                  <th
                    onClick={() => handleSort("name")}
                    className="sticky left-0 z-20 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground bg-surface-strong/95 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"
                  >
                    <div className="flex items-center gap-1">
                      Produto
                      <SortIcon column="name" />
                    </div>
                  </th>

                  {/* 2. Marketplace - STICKY LEFT */}
                  <th className="sticky left-[240px] z-20 px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-surface-strong/95 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    Marketplace
                  </th>

                  {/* 3. Saúde - STICKY LEFT */}
                  <th
                    onClick={() => handleSort("health")}
                    className="sticky left-[320px] z-20 px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground bg-surface-strong/95 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"
                  >
                    <div className="flex items-center justify-center gap-1">
                      Saúde
                      <SortIcon column="health" />
                    </div>
                  </th>

                  {/* COLUNAS SCROLLABLE */}
                  <th className="w-4 bg-surface-strong/95"></th>

                  {/* 4. Vendas */}
                  <th
                    onClick={() => handleSort("sales")}
                    className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground bg-surface-strong/95"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Vendas
                      <SortIcon column="sales" />
                    </div>
                  </th>
                  {/* 5. Devoluções */}
                  <th
                    onClick={() => handleSort("returns")}
                    className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground bg-surface-strong/95"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Devol.
                      <SortIcon column="returns" />
                    </div>
                  </th>
                  {/* 6. Vendas Líquidas */}
                  <th
                    onClick={() => handleSort("netSales")}
                    className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground bg-surface-strong/95"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Líquida
                      <SortIcon column="netSales" />
                    </div>
                  </th>
                  {/* 7. Receita */}
                  <th
                    onClick={() => handleSort("revenue")}
                    className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground bg-surface-strong/95"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Receita
                      <SortIcon column="revenue" />
                    </div>
                  </th>
                  {/* 8. Ticket Médio */}
                  <th
                    onClick={() => handleSort("averageTicket")}
                    className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground bg-surface-strong/95"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Ticket
                      <SortIcon column="averageTicket" />
                    </div>
                  </th>
                  {/* 9. Comissão */}
                  <th
                    onClick={() => handleSort("commission")}
                    className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground bg-surface-strong/95"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Comissão
                      <SortIcon column="commission" />
                    </div>
                  </th>
                  {/* 10. Frete */}
                  <th
                    onClick={() => handleSort("shipping")}
                    className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground bg-surface-strong/95"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Frete
                      <SortIcon column="shipping" />
                    </div>
                  </th>
                  {/* 11. Imposto */}
                  <th
                    onClick={() => handleSort("tax")}
                    className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground bg-surface-strong/95"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Imposto
                      <SortIcon column="tax" />
                    </div>
                  </th>
                  {/* 12. Custo */}
                  <th
                    onClick={() => handleSort("totalCost")}
                    className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground bg-surface-strong/95"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Custo
                      <SortIcon column="totalCost" />
                    </div>
                  </th>
                  {/* 13. ADS (Investimento) */}
                  <th
                    onClick={() => handleSort("adSpend")}
                    className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground bg-surface-strong/95"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Ads $
                      <SortIcon column="adSpend" />
                    </div>
                  </th>
                  {/* 14. ADS (ROAS) */}
                  <th
                    onClick={() => handleSort("roas")}
                    className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground bg-surface-strong/95"
                  >
                    <div className="flex items-center justify-end gap-1">
                      ROAS
                      <SortIcon column="roas" />
                    </div>
                  </th>
                  {/* 15. Lucro */}
                  <th
                    onClick={() => handleSort("profit")}
                    className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground bg-surface-strong/95"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Lucro
                      <SortIcon column="profit" />
                    </div>
                  </th>
                  {/* 16. Margem */}
                  <th
                    onClick={() => handleSort("margin")}
                    className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground bg-surface-strong/95"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Margem
                      <SortIcon column="margin" />
                    </div>
                  </th>
                  {/* 17. ROI */}
                  <th
                    onClick={() => handleSort("roi")}
                    className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground bg-surface-strong/95"
                  >
                    <div className="flex items-center justify-end gap-1">
                      ROI
                      <SortIcon column="roi" />
                    </div>
                  </th>
                </tr>
                </thead>
                <tbody className="divide-y divide-border">
                {filteredRows.map((row, index) => {
                  const returnRate = row.sales > 0 ? row.returns / row.sales : 0;
                  const healthBadge = healthBadgeConfig[row.health];

                  return (
                    <MotionTableRow
                      key={row.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03, duration: 0.3 }}
                      className={cn(
                        "transition-colors duration-150 hover:bg-foreground/5",
                        !row.isActive && "opacity-60",
                      )}
                    >
                      {/* 1. Produto (com SKU abaixo) - STICKY LEFT */}
                      <td className="sticky left-0 z-10 px-3 py-3 bg-surface-strong shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                            <Package className="h-4 w-4 text-accent" />
                          </div>
                          <div className="min-w-0 max-w-[180px]">
                            <p className="truncate text-sm font-medium text-foreground">
                              {row.name}
                            </p>
                            <p className="truncate text-xs font-mono text-muted-foreground">
                              {row.sku || "—"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* 2. Marketplace - STICKY LEFT */}
                      <td className="sticky left-[240px] z-10 px-3 py-3 text-center bg-surface-strong shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                        {getChannelBadge(row.channelLabel)}
                      </td>

                      {/* 3. Saúde - STICKY LEFT */}
                      <td className="sticky left-[320px] z-10 px-3 py-3 text-center bg-surface-strong shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                        <StatusBadge status={healthBadge.status} label={healthBadge.label} />
                      </td>

                      {/* ESPAÇADOR */}
                      <td className="w-4 bg-surface-strong"></td>

                      {/* 4. Vendas */}
                      <td className="px-3 py-3 text-right">
                        <span className="text-sm text-foreground">{formatNumber(row.sales)}</span>
                      </td>

                      {/* 5. Devoluções */}
                      <td className="px-3 py-3 text-right">
                        <div className="flex flex-col items-end">
                          <span
                            className={cn(
                              "text-sm",
                              returnRate > 0.15 ? "text-error" : "text-foreground",
                            )}
                          >
                            {formatNumber(row.returns)}
                          </span>
                          {returnRate > 0.05 && (
                            <span className="text-[10px] text-muted-foreground">
                              ({formatPercent(returnRate * 100, { digits: 0 })})</span>
                          )}
                        </div>
                      </td>

                      {/* 6. Vendas Líquidas */}
                      <td className="px-3 py-3 text-right">
                        <span className="text-sm font-medium text-foreground">
                          {formatNumber(row.netSales)}
                        </span>
                      </td>

                      {/* 7. Receita */}
                      <td className="px-3 py-3 text-right">
                        <span className="text-sm font-medium text-foreground">
                          {formatMoney(row.revenue)}
                        </span>
                      </td>

                      {/* 8. Ticket Médio */}
                      <td className="px-3 py-3 text-right">
                        <span className="text-sm text-muted-foreground">
                          {formatMoney(row.averageTicket)}
                        </span>
                      </td>

                      {/* 9. Comissão */}
                      <td className="px-3 py-3 text-right">
                        <span className="text-sm text-muted-foreground">
                          {formatMoney(row.commission)}
                        </span>
                      </td>

                      {/* 10. Frete */}
                      <td className="px-3 py-3 text-right">
                        <span className="text-sm text-muted-foreground">
                          {formatMoney(row.shipping)}
                        </span>
                      </td>

                      {/* 11. Imposto */}
                      <td className="px-3 py-3 text-right">
                        <span className="text-sm text-muted-foreground">{formatMoney(row.tax)}</span>
                      </td>

                      {/* 12. Custo */}
                      <td className="px-3 py-3 text-right">
                        <span className="text-sm text-muted-foreground">
                          {formatMoney(row.totalCost)}
                        </span>
                      </td>

                      {/* 13. ADS (Investimento) */}
                      <td className="px-3 py-3 text-right">
                        <span className="text-sm text-muted-foreground">
                          {row.adSpend > 0 ? formatMoney(row.adSpend) : "—"}
                        </span>
                      </td>

                      {/* 14. ADS (ROAS) */}
                      <td className="px-3 py-3 text-right">
                        {row.roas !== null && row.roas > 0 ? (
                          <div className="flex items-center justify-end gap-1">
                            {row.roas >= 3 ? (
                              <TrendingUp className="h-3 w-3 text-success" />
                            ) : row.roas < 1 ? (
                              <TrendingDown className="h-3 w-3 text-error" />
                            ) : null}
                            <span
                              className={cn(
                                "text-sm font-medium",
                                row.roas >= 3
                                  ? "text-success"
                                  : row.roas >= 1
                                    ? "text-accent"
                                    : "text-error",
                              )}
                            >
                              {row.roas.toFixed(1)}x
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* 15. Lucro */}
                      <td className="px-3 py-3 text-right">
                        <span
                          className={cn(
                            "text-sm font-semibold",
                            row.profit >= 0 ? "text-success" : "text-error",
                          )}
                        >
                          {formatMoney(row.profit)}
                        </span>
                      </td>

                      {/* 16. Margem */}
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {row.margin >= 20 ? (
                            <ArrowUpRight className="h-3.5 w-3.5 text-success" />
                          ) : row.margin < 10 ? (
                            <ArrowDownRight className="h-3.5 w-3.5 text-error" />
                          ) : null}
                          <span
                            className={cn(
                              "text-sm font-medium",
                              row.margin >= 20
                                ? "text-success"
                                : row.margin < 10
                                  ? "text-error"
                                  : "text-foreground",
                            )}
                          >
                            {formatPercent(row.margin)}
                          </span>
                        </div>
                      </td>

                      {/* 17. ROI */}
                      <td className="px-3 py-3 text-right">
                        {row.roi !== null ? (
                          <span
                            className={cn(
                              "text-sm font-medium",
                              row.roi >= 50
                                ? "text-success"
                                : row.roi > 0
                                  ? "text-accent"
                                  : "text-error",
                            )}
                          >
                            {formatPercent(row.roi, { digits: 0 })}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </td>
                    </MotionTableRow>
                  );
                })}
                </tbody>
              </table>

              {/* Empty state for filtered results */}
              {filteredRows.length === 0 && rows.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-12 text-center"
                >
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-strong">
                    <Search className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    Nenhum produto encontrado
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Tente ajustar os filtros para ver mais resultados.
                  </p>
                  <button
                    onClick={clearAllFilters}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent-soft transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                    Limpar filtros
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Paginação */}
        {pagination.totalPages > 1 && (
          <div className="mt-4 pt-4 border-t border-border">
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              onPageChange={onPageChange}
            />
          </div>
        )}
      </Card>
    </motion.div>
  );
}
