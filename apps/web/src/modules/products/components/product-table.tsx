"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Filter,
  Package,
  Search,
  Store,
  X,
} from "lucide-react";
import { Badge, Card, EmptyState } from "@marginflow/ui";
import { Pagination } from "@/components/ui-premium/pagination";
import { slideInUpVariants } from "@/lib/animations";
import type { PaginationState, ProductTableRow } from "../types/products";
import { formatMoney, formatMultiplier, formatNumber, formatPercent } from "../utils/formatters";

const MotionTableRow = motion.tr;

interface ProductTableProps {
  rows: ProductTableRow[];
  pagination: PaginationState;
  onPageChange: (page: number) => void;
  className?: string;
}

type SortKey =
  | "channelLabel"
  | "name"
  | "sales"
  | "returns"
  | "unitCost"
  | "sellingPrice"
  | "commissionPct"
  | "shipping"
  | "taxPct"
  | "packagingCost"
  | "adSpend"
  | "revenue"
  | "totalProfit"
  | "unitProfit"
  | "contributionMarginRatio"
  | "roiRatio"
  | "minimumRoas"
  | "actualRoas";

function compareSortValues(
  a: ProductTableRow[SortKey],
  b: ProductTableRow[SortKey],
  direction: "asc" | "desc",
): number {
  const aNull = a === null || a === undefined || (typeof a === "number" && !Number.isFinite(a));
  const bNull = b === null || b === undefined || (typeof b === "number" && !Number.isFinite(b));
  if (aNull && bNull) {
    return 0;
  }
  if (aNull) {
    return 1;
  }
  if (bNull) {
    return -1;
  }
  if (typeof a === "string" && typeof b === "string") {
    return direction === "asc" ? a.localeCompare(b) : b.localeCompare(a);
  }

  const an = Number(a);
  const bn = Number(b);
  return direction === "asc" ? an - bn : bn - an;
}

type SortDirection = "asc" | "desc" | null;

const marketplaceOptions = [{ value: "mercadolivre", label: "Mercado Livre" }];

function getChannelBadge(channel: string) {
  const normalized = channel.trim().toLowerCase();

  if (normalized === "mercadolivre") {
    return <Badge>MELI</Badge>;
  }

  return <Badge>{channel}</Badge>;
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
  const [searchFilter, setSearchFilter] = useState("");
  const [selectedMarketplaces, setSelectedMarketplaces] = useState<string[]>([]);
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

  const filteredRows = useMemo(() => {
    let result = [...rows];

    if (searchFilter.trim()) {
      const search = searchFilter.toLowerCase().trim();
      result = result.filter(
        (row) =>
          row.name.toLowerCase().includes(search) || row.sku.toLowerCase().includes(search),
      );
    }

    if (selectedMarketplaces.length > 0) {
      result = result.filter((row) => selectedMarketplaces.includes(row.channelLabel));
    }

    if (sortConfig) {
      const { direction, key } = sortConfig;
      result.sort((a, b) => compareSortValues(a[key], b[key], direction ?? "asc"));
    }

    return result;
  }, [rows, searchFilter, selectedMarketplaces, sortConfig]);

  const filteredTotalPages = Math.max(1, Math.ceil(filteredRows.length / pagination.pageSize));
  const safeCurrentPage = Math.min(pagination.currentPage, filteredTotalPages);

  const visibleRows = useMemo(() => {
    const start = (safeCurrentPage - 1) * pagination.pageSize;
    const end = start + pagination.pageSize;
    return filteredRows.slice(start, end);
  }, [filteredRows, pagination.pageSize, safeCurrentPage]);

  const hasActiveFilters = searchFilter.trim() || selectedMarketplaces.length > 0;

  const clearAllFilters = () => {
    setSearchFilter("");
    setSelectedMarketplaces([]);
  };

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
          <p className="text-xs text-muted-foreground">Grade mensal por SKU e canal</p>
        </div>
        <EmptyState
          title="Nenhum dado mensal neste mês"
          description="Selecione outra competência ou carregue registros em product_monthly_performance para exibir a grade operacional."
          icon={<Package className="h-6 w-6" />}
        />
      </Card>
    );
  }

  return (
    <motion.div variants={slideInUpVariants} className={className}>
      <Card padding="lg" className="min-w-0 overflow-hidden">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Produtos</h3>
            <p className="text-xs text-muted-foreground/70">Grade mensal por SKU e canal</p>
          </div>

          <button
            onClick={() => setShowFilters((value) => !value)}
            className={`inline-flex items-center gap-1.5 rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-medium transition-all duration-[var(--transition-fast)] ${
              showFilters || hasActiveFilters
                ? "bg-accent text-white shadow-sm"
                : "border border-border bg-surface-strong text-muted-foreground hover:border-border-strong hover:text-foreground"
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            Filtros
          </button>
        </div>

        {showFilters ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 rounded-[var(--radius-lg)] border border-border bg-surface-strong/50 p-4"
          >
            <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Search className="h-3.5 w-3.5 text-accent" />
                  Buscar produto
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(event) => setSearchFilter(event.target.value)}
                    placeholder="Nome ou SKU do produto..."
                    className="h-9 w-full rounded-[var(--radius-md)] border border-border bg-background px-3 pr-8 text-sm text-foreground placeholder:text-muted-foreground/60 transition-all duration-[var(--transition-fast)] hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                  {searchFilter ? (
                    <button
                      onClick={() => setSearchFilter("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <Search className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
                  )}
                </div>
              </div>

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
                        onClick={() =>
                          setSelectedMarketplaces((previous) =>
                            isSelected
                              ? previous.filter((value) => value !== option.value)
                              : [...previous, option.value],
                          )
                        }
                        className={`inline-flex items-center gap-1.5 rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-medium transition-all duration-[var(--transition-fast)] ${
                          isSelected
                            ? "bg-accent text-white shadow-sm"
                            : "border border-border bg-background text-muted-foreground hover:border-border-strong hover:text-foreground"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {hasActiveFilters ? (
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/60 pt-4">
                <p className="text-xs text-muted-foreground">
                  {filteredRows.length} resultado{filteredRows.length === 1 ? "" : "s"} encontrado
                  {filteredRows.length === 1 ? "" : "s"}.
                </p>
                <button
                  onClick={clearAllFilters}
                  className="text-xs font-medium text-accent transition-colors hover:text-accent/80"
                >
                  Limpar filtros
                </button>
              </div>
            ) : null}
          </motion.div>
        ) : null}

        <div className="relative -mx-6 min-w-0">
          <div className="overflow-x-auto px-6">
            <table className="w-full min-w-[1580px] border-separate border-spacing-0">
              <thead>
                <tr className="border-b border-border bg-surface-strong/95">
                  <th
                    onClick={() => handleSort("channelLabel")}
                    className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground bg-surface-strong/95"
                  >
                    <div className="flex items-center gap-1">
                      Canal
                      <SortIcon column="channelLabel" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("name")}
                    className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground bg-surface-strong/95 min-w-[200px]"
                  >
                    <div className="flex items-center gap-1">
                      Produto
                      <SortIcon column="name" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("sales")}
                    className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground bg-surface-strong/95"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Vendas
                      <SortIcon column="sales" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("returns")}
                    className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground bg-surface-strong/95"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Devoluções
                      <SortIcon column="returns" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("unitCost")}
                    className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground bg-surface-strong/95"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Custo
                      <SortIcon column="unitCost" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("sellingPrice")}
                    className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground bg-surface-strong/95"
                  >
                    <div className="flex items-center justify-end gap-1">
                      PDV
                      <SortIcon column="sellingPrice" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("commissionPct")}
                    className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground bg-surface-strong/95"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Comissão
                      <SortIcon column="commissionPct" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("shipping")}
                    className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground bg-surface-strong/95"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Taxa/Frete
                      <SortIcon column="shipping" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("taxPct")}
                    className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground bg-surface-strong/95"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Alíquota
                      <SortIcon column="taxPct" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("packagingCost")}
                    className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground bg-surface-strong/95"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Embalagem
                      <SortIcon column="packagingCost" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("adSpend")}
                    className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground bg-surface-strong/95"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Publicidade
                      <SortIcon column="adSpend" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("revenue")}
                    className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground cursor-pointer select-none hover:text-foreground bg-surface-strong/95 border-l border-l-border-strong min-w-[100px]"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Receita
                      <SortIcon column="revenue" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("totalProfit")}
                    className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground cursor-pointer select-none hover:text-foreground bg-surface-strong/95 min-w-[110px]"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Lucro Total
                      <SortIcon column="totalProfit" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("unitProfit")}
                    className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground cursor-pointer select-none hover:text-foreground bg-surface-strong/95 min-w-[120px]"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Lucro Unitário
                      <SortIcon column="unitProfit" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("contributionMarginRatio")}
                    className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground cursor-pointer select-none hover:text-foreground bg-surface-strong/95 min-w-[160px]"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Margem Contribuição
                      <SortIcon column="contributionMarginRatio" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("roiRatio")}
                    className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground cursor-pointer select-none hover:text-foreground bg-surface-strong/95 min-w-[90px]"
                  >
                    <div className="flex items-center justify-end gap-1">
                      ROI
                      <SortIcon column="roiRatio" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("minimumRoas")}
                    className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground cursor-pointer select-none hover:text-foreground bg-surface-strong/95 min-w-[110px]"
                  >
                    <div className="flex items-center justify-end gap-1">
                      ROAS Mínimo
                      <SortIcon column="minimumRoas" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("actualRoas")}
                    className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground cursor-pointer select-none hover:text-foreground bg-surface-strong/95 min-w-[100px]"
                  >
                    <div className="flex items-center justify-end gap-1">
                      ROAS Real
                      <SortIcon column="actualRoas" />
                    </div>
                  </th>
                </tr>
              </thead>

              <tbody>
                {visibleRows.map((row, index) => (
                  <MotionTableRow
                    key={row.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="border-b border-border/50 hover:bg-surface-strong/30"
                  >
                    <td className="px-3 py-3 text-left">{getChannelBadge(row.channelLabel)}</td>
                    <td className="px-3 py-3 text-left">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium text-foreground">{row.name}</span>
                        <span className="text-xs text-muted-foreground">{row.sku}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-sm text-foreground">{formatNumber(row.sales)}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-sm text-foreground">{formatNumber(row.returns)}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-sm text-foreground">{formatMoney(row.unitCost)}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-sm text-foreground">{formatMoney(row.sellingPrice)}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-sm text-foreground">{formatPercent(row.commissionPct)}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-sm text-foreground">{formatMoney(row.shipping)}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-sm text-foreground">{formatPercent(row.taxPct)}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-sm text-foreground">{formatMoney(row.packagingCost)}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-sm text-foreground">{formatMoney(row.adSpend)}</span>
                    </td>
                    <td className="px-3 py-3 text-right border-l border-l-border-strong">
                      <span className="text-sm font-semibold text-foreground">{formatMoney(row.revenue)}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-sm font-semibold text-foreground">{formatMoney(row.totalProfit)}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-sm font-semibold text-foreground">{formatMoney(row.unitProfit)}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-sm font-semibold text-foreground">
                        {formatPercent(
                          row.contributionMarginRatio !== null && row.contributionMarginRatio !== undefined
                            ? row.contributionMarginRatio * 100
                            : null,
                          { digits: 2 },
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-sm font-semibold text-foreground">
                        {formatPercent(
                          row.roiRatio !== null && row.roiRatio !== undefined ? row.roiRatio * 100 : null,
                          { digits: 2 },
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-sm font-semibold text-foreground">{formatMultiplier(row.minimumRoas)}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-sm font-semibold text-foreground">{formatMultiplier(row.actualRoas)}</span>
                    </td>
                  </MotionTableRow>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {filteredRows.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-border/70 bg-background-soft/60 px-6 py-10 text-center">
            <p className="text-sm font-medium text-foreground">Nenhum produto encontrado</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Ajuste os filtros para visualizar outros SKUs ou canais.
            </p>
          </div>
        ) : null}

        {filteredRows.length > 0 ? (
          <div className="mt-6">
            <Pagination
              currentPage={safeCurrentPage}
              onPageChange={onPageChange}
              totalPages={filteredTotalPages}
            />
          </div>
        ) : null}
      </Card>
    </motion.div>
  );
}
