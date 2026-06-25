"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Filter,
  Package,
  Search,
  Store,
  X,
} from "lucide-react";
import { Badge, Button, Card, EmptyState, cn } from "@lucreii/ui";
import { Pagination } from "@/components/ui-premium/pagination";
import { slideInUpVariants } from "@/lib/animations";
import { ProductDetailsModal } from "./product-details-modal";
import type { PaginationState, ProductTableRow } from "../types/products";
import { formatMoney, formatNumber, formatPercent } from "../utils/formatters";

const MotionTableRow = motion.tr;

interface ProductTableProps {
  rows: ProductTableRow[];
  pagination: PaginationState;
  onPageChange: (page: number) => void;
  className?: string;
}

type SortKey =
  | "channelLabel"
  | "parentName"
  | "variationName"
  | "sales"
  | "sellingPrice"
  | "contributionMarginRatio"
  | "totalProfit";

type SortDirection = "asc" | "desc" | null;

type DisplayRow = {
  row: ProductTableRow;
  channelLabel: string;
  sales: number;
  sellingPrice: number;
  contributionMarginRatio: number | null;
  parentName: string;
  variationName: string | null;
  totalProfit: number | null;
  hasCostsConfigured: boolean;
};

function compareSortValues(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
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

const marketplaceOptions = [
  { value: "mercadolivre", label: "MELI" },
  { value: "shopee", label: "Shopee" },
  { value: "shein", label: "Shein" },
];

function getChannelBadge(channel: string) {
  const normalized = channel.trim().toLowerCase();

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

  return <Badge>{channel}</Badge>;
}

function ProductImagePreview({
  alt,
  url,
}: {
  alt: string;
  url: string | null;
}) {
  const [failed, setFailed] = useState(false);

  if (!url || failed) {
    return (
      <div
        aria-label={`Sem foto para ${alt}`}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-surface-strong text-muted-foreground"
      >
        <Package className="h-4 w-4" />
      </div>
    );
  }

  return (
    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-surface-strong">
      <Image
        alt={alt}
        className="object-cover"
        fill
        onError={() => setFailed(true)}
        sizes="40px"
        src={url}
      />
    </div>
  );
}

function normalizeText(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function looksLikeVariation(value: string) {
  return value.includes(":") || value.toLowerCase().startsWith("varia");
}

function resolveProductLabels(
  row: ProductTableRow,
  parentRow?: ProductTableRow | null,
): Pick<DisplayRow, "parentName" | "variationName"> {
  const rowName = normalizeText(row.name);
  const rowDisplayName = normalizeText(row.displayName);
  const rowVariation = normalizeText(row.variationLabel);

  if (parentRow) {
    const parentName =
      normalizeText(parentRow.displayName) ||
      normalizeText(parentRow.name) ||
      rowDisplayName ||
      rowName ||
      "Produto";
    const variationName =
      rowVariation ||
      [rowDisplayName, rowName].find((value) => value && value !== parentName) ||
      null;

    return { parentName, variationName };
  }

  if (rowVariation) {
    const suffix = ` - ${rowVariation}`;
    const sourceWithSuffix = [rowDisplayName, rowName].find(
      (value) => value && value.endsWith(suffix),
    );

    if (sourceWithSuffix) {
      return {
        parentName: sourceWithSuffix.slice(0, -suffix.length),
        variationName: rowVariation,
      };
    }

    const explicitParent = [rowDisplayName, rowName].find(
      (value) => value && value !== rowVariation && !looksLikeVariation(value),
    );

    if (explicitParent) {
      return { parentName: explicitParent, variationName: rowVariation };
    }

    const fallbackVariation = rowDisplayName || rowName;
    return {
      parentName: rowVariation,
      variationName: fallbackVariation !== rowVariation ? fallbackVariation : null,
    };
  }

  if (rowDisplayName && rowName && rowDisplayName !== rowName) {
    const parentName = looksLikeVariation(rowDisplayName) ? rowName : rowDisplayName;
    const variationName = parentName === rowName ? rowDisplayName : rowName;

    return { parentName, variationName };
  }

  return { parentName: rowDisplayName || rowName || "Produto", variationName: null };
}

function buildDisplayRows(rows: ProductTableRow[]): DisplayRow[] {
  return rows.flatMap((row) => {
    const sourceRows =
      row.catalogRole === "parent" && row.children.length > 0
        ? row.children.map((child) => ({ parentRow: row, row: child }))
        : [{ parentRow: null, row }];

    return sourceRows.map(({ parentRow, row: sourceRow }) => {
      const { parentName, variationName } = resolveProductLabels(sourceRow, parentRow);

      return {
        channelLabel: sourceRow.channelLabel,
        contributionMarginRatio: sourceRow.contributionMarginRatio,
        hasCostsConfigured: sourceRow.unitCost > 0 && sourceRow.packagingCost > 0,
        parentName,
        row: sourceRow,
        sales: sourceRow.sales,
        sellingPrice: sourceRow.sellingPrice,
        totalProfit:
          sourceRow.unitProfit === null ? null : sourceRow.unitProfit * sourceRow.netLiquidSales,
        variationName,
      };
    });
  });
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
  const [selectedRow, setSelectedRow] = useState<ProductTableRow | null>(null);

  const displayRows = useMemo(() => buildDisplayRows(rows), [rows]);

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
    let result = [...displayRows];

    if (searchFilter.trim()) {
      const search = searchFilter.toLowerCase().trim();
      result = result.filter(({ parentName, row, variationName }) => {
        return (
          parentName.toLowerCase().includes(search) ||
          row.name.toLowerCase().includes(search) ||
          row.displayName.toLowerCase().includes(search) ||
          row.sku.toLowerCase().includes(search) ||
          variationName?.toLowerCase().includes(search) ||
          row.variationLabel?.toLowerCase().includes(search)
        );
      });
    }

    if (selectedMarketplaces.length > 0) {
      result = result.filter(({ row }) => selectedMarketplaces.includes(row.channelLabel));
    }

    if (sortConfig) {
      const { direction, key } = sortConfig;
      result.sort((a, b) => compareSortValues(a[key], b[key], direction ?? "asc"));
    }

    return result;
  }, [displayRows, searchFilter, selectedMarketplaces, sortConfig]);

  const filteredTotalPages = Math.max(1, Math.ceil(filteredRows.length / pagination.pageSize));
  const safeCurrentPage = Math.min(pagination.currentPage, filteredTotalPages);

  const visibleRows = useMemo(() => {
    const start = (safeCurrentPage - 1) * pagination.pageSize;
    const end = start + pagination.pageSize;
    return filteredRows.slice(start, end);
  }, [filteredRows, pagination.pageSize, safeCurrentPage]);

  const hasActiveFilters = searchFilter.trim() || selectedMarketplaces.length > 0;

  const productsMissingCostCount = useMemo(
    () => displayRows.filter((item) => !item.hasCostsConfigured).length,
    [displayRows],
  );

  const clearAllFilters = () => {
    setSearchFilter("");
    setSelectedMarketplaces([]);
  };

  const openDetails = (row: ProductTableRow) => {
    setSelectedRow(row);
  };

  const closeDetails = () => {
    setSelectedRow(null);
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

  if (displayRows.length === 0) {
    return (
      <Card padding="lg" className={className}>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-foreground">Produtos</h3>
          <p className="text-xs text-muted-foreground">Grade mensal de produtos</p>
        </div>
        <EmptyState
          title="Nenhum dado mensal neste mês"
          description="Selecione outra competência"
          icon={<Package className="h-6 w-6" />}
        />
      </Card>
    );
  }

  return (
    <motion.div variants={slideInUpVariants} className={cn("flex flex-1 min-h-0", className)}>
      <Card padding="lg" className="min-w-0 flex flex-1 flex-col overflow-hidden min-h-0">
        <div className="mb-4 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Produtos</h3>
            <p className="text-xs text-muted-foreground/70">Grade mensal de produtos</p>
          </div>

          <button
            onClick={() => setShowFilters((value) => !value)}
            className={`inline-flex items-center gap-1.5 rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-medium transition-all duration-[var(--transition-fast)] ${
              showFilters || hasActiveFilters
                ? "bg-accent text-accent-foreground shadow-sm"
                : "border border-border bg-surface-strong text-muted-foreground hover:border-border-strong hover:text-foreground"
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            Filtros
          </button>
        </div>

        {productsMissingCostCount > 0 ? (
          <div className="mb-5 rounded-[var(--radius-lg)] border border-warning/30 bg-warning-soft/30 p-4 shrink-0">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Você tem {productsMissingCostCount} produto{productsMissingCostCount === 1 ? "" : "s"} para atualizar custos
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Configure custo unitário e embalagem no catálogo para liberar análises mais confiáveis.
                </p>
              </div>
              <Button asChild size="sm" variant="secondary">
                <Link href="/app/products/catalog">Ir para catálogo</Link>
              </Button>
            </div>
          </div>
        ) : null}

        {showFilters ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 rounded-[var(--radius-lg)] border border-border bg-surface-strong/50 p-4 shrink-0"
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
                            ? "bg-accent text-accent-foreground shadow-sm"
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

        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full min-w-[1120px] border-separate border-spacing-0">
            <thead>
              <tr className="border-b border-border bg-surface-strong/95">
                <th
                  onClick={() => handleSort("channelLabel")}
                  className="sticky top-0 z-10 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground bg-surface-strong/95"
                >
                  <div className="flex items-center gap-1">
                    Canal
                    <SortIcon column="channelLabel" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("parentName")}
                  className="sticky top-0 z-10 w-[360px] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground bg-surface-strong/95"
                >
                  <div className="flex items-center gap-1">
                    Produto
                    <SortIcon column="parentName" />
                  </div>
                </th>
                <th className="sticky top-0 z-10 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-surface-strong/95 min-w-[100px]">
                  SKU
                </th>
                <th
                  onClick={() => handleSort("sales")}
                  className="sticky top-0 z-10 px-2 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground bg-surface-strong/95"
                >
                  <div className="flex items-center justify-end gap-1">
                    Vendas
                    <SortIcon column="sales" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("sellingPrice")}
                  className="sticky top-0 z-10 px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground bg-surface-strong/95 min-w-[160px]"
                >
                  <div className="flex items-center justify-end gap-1">
                    PDV
                    <SortIcon column="sellingPrice" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("contributionMarginRatio")}
                  className="sticky top-0 z-10 px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground bg-surface-strong/95 min-w-[160px]"
                >
                  <div className="flex items-center justify-end gap-1">
                    Margem Contribuição
                    <SortIcon column="contributionMarginRatio" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("totalProfit")}
                  className="sticky top-0 z-10 px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground bg-surface-strong/95 min-w-[140px]"
                >
                  <div className="flex items-center justify-end gap-1">
                    Lucro Total
                    <SortIcon column="totalProfit" />
                  </div>
                </th>
              </tr>
            </thead>

            <tbody>
              {visibleRows.map(({ hasCostsConfigured, parentName, row, totalProfit, variationName }, index) => (
                <MotionTableRow
                  key={row.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="cursor-pointer border-b border-border/50 outline-none transition-colors hover:bg-surface-strong/30 focus-visible:bg-accent/5 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/30"
                  onClick={() => openDetails(row)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openDetails(row);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <td className="px-3 py-3 text-left">{getChannelBadge(row.channelLabel)}</td>
                  <td className="px-3 py-3 text-left">
                    <div className="flex items-center gap-3">
                      <ProductImagePreview alt={parentName} url={row.coverImageUrl} />
                      <span
                        aria-label={hasCostsConfigured ? "Precificado" : "Não precificado"}
                        className={cn(
                          "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                          hasCostsConfigured
                            ? "border-success/30 bg-success/10"
                            : "border-warning/30 bg-warning/10",
                        )}
                        data-testid={`cost-status-${row.id}`}
                        title={hasCostsConfigured ? "Precificado" : "Não precificado"}
                      >
                        <DollarSign
                          aria-hidden="true"
                          className="h-3.5 w-3.5"
                          style={{ color: hasCostsConfigured ? "#0e7a6f" : "#f59e0b" }}
                        />
                      </span>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium text-foreground">{parentName}</span>
                        {variationName ? (
                          <span className="text-xs text-muted-foreground">{variationName}</span>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-left">
                    <span className="text-xs font-mono text-muted-foreground">{row.sku || "â€”"}</span>
                  </td>
                  <td className="px-2 py-3 text-right">
                    <span className="text-sm text-foreground">{formatNumber(row.sales)}</span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className="text-sm text-foreground">{formatMoney(row.sellingPrice)}</span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className="text-sm text-foreground">{formatPercent(row.contributionMarginRatio)}</span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className="text-sm text-foreground">{formatMoney(totalProfit)}</span>
                  </td>
                </MotionTableRow>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRows.length === 0 ? (
          <div className="shrink-0 rounded-[var(--radius-lg)] border border-dashed border-border/70 bg-background-soft/60 px-6 py-10 text-center">
            <p className="text-sm font-medium text-foreground">Nenhum produto encontrado</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Ajuste os filtros para visualizar outros SKUs ou canais.
            </p>
          </div>
        ) : null}

        {filteredRows.length > 0 ? (
          <div className="shrink-0 pt-4">
            <Pagination
              currentPage={safeCurrentPage}
              onPageChange={onPageChange}
              totalPages={filteredTotalPages}
            />
          </div>
        ) : null}
      </Card>
      <ProductDetailsModal onClose={closeDetails} open={selectedRow !== null} row={selectedRow} />
    </motion.div>
  );
}
