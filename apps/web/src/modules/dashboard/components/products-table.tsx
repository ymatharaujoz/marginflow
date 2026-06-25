"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowUpDown,
  ArrowUpRight,
  Banknote,
  ChevronDown,
  ChevronUp,
  Package,
  TrendingUp,
} from "lucide-react";
import { Badge, Card, EmptyState, cn } from "@lucreii/ui";
import { StatusBadge } from "@/components/ui-premium/status-badge";
import { slideInUpVariants } from "@/lib/animations";
import type { DashboardProfitabilityResponse } from "@lucreii/types";
import { buildDashboardProductRows } from "../calculations/product-rows";
import { formatMoney, formatNumber, formatPercent } from "../utils/formatters";

interface ProductsTableProps {
  data: DashboardProfitabilityResponse;
  className?: string;
}

type ProductsRankingMode = "sales" | "profit";
type SortDirection = "asc" | "desc" | null;
type ProductSortKey =
  | "channel"
  | "name"
  | "health"
  | "sales"
  | "returns"
  | "revenue"
  | "profit";

const healthBadgeConfig = {
  critical: { status: "error" as const, label: "Crítico" },
  attention: { status: "warning" as const, label: "Atenção" },
  neutral: { status: "inactive" as const, label: "Neutro" },
  healthy: { status: "success" as const, label: "Saudável" },
  scalable: { status: "active" as const, label: "Escalável" },
};

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
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10">
        <Package className="h-4 w-4 text-accent" />
      </div>
    );
  }

  return (
    <div className="h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-surface-strong">
      <img
        alt={alt}
        className="h-full w-full object-cover"
        decoding="async"
        loading="lazy"
        src={url}
        onError={() => setFailed(true)}
      />
    </div>
  );
}

function getProductSortValue(
  row: ReturnType<typeof buildDashboardProductRows>[number],
  key: ProductSortKey,
) {
  switch (key) {
    case "channel":
      return row.channelLabel;
    case "name":
      return row.name;
    case "health":
      return row.health;
    case "sales":
      return row.sales;
    case "returns":
      return row.returns;
    case "revenue":
      return row.revenue;
    case "profit":
      return row.profit;
    default:
      return null;
  }
}

function compareValues(
  a: string | number | null,
  b: string | number | null,
  direction: "asc" | "desc",
) {
  if (a === b) {
    return 0;
  }
  if (a === null) {
    return 1;
  }
  if (b === null) {
    return -1;
  }
  if (typeof a === "string" && typeof b === "string") {
    return direction === "asc" ? a.localeCompare(b) : b.localeCompare(a);
  }
  return direction === "asc" ? Number(a) - Number(b) : Number(b) - Number(a);
}

function ProductsSortIcon({
  column,
  sortConfig,
}: {
  column: ProductSortKey;
  sortConfig: { key: ProductSortKey; direction: SortDirection } | null;
}) {
  if (sortConfig?.key !== column) {
    return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />;
  }

  return sortConfig.direction === "asc" ? (
    <ChevronUp className="h-3.5 w-3.5 text-accent" />
  ) : (
    <ChevronDown className="h-3.5 w-3.5 text-accent" />
  );
}

function ProductsSortableHeader({
  align = "left",
  children,
  className,
  column,
  onSort,
  sortConfig,
  width,
}: {
  align?: "left" | "right" | "center";
  children: React.ReactNode;
  className?: string;
  column: ProductSortKey;
  onSort: (key: ProductSortKey) => void;
  sortConfig: { key: ProductSortKey; direction: SortDirection } | null;
  width?: number | string;
}) {
  return (
    <th
      onClick={() => onSort(column)}
      style={width !== undefined ? { width } : undefined}
      className={cn(
        "cursor-pointer select-none px-3 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground",
        align === "left" && "text-left",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center gap-1",
          align === "right" && "justify-end",
          align === "center" && "justify-center",
        )}
      >
        {children}
        <ProductsSortIcon column={column} sortConfig={sortConfig} />
      </div>
    </th>
  );
}

export function ProductsTable({ data, className = "" }: ProductsTableProps) {
  const allRows = buildDashboardProductRows(data);
  const [rankingMode, setRankingMode] = useState<ProductsRankingMode>("profit");
  const [sortConfig, setSortConfig] = useState<{
    key: ProductSortKey;
    direction: SortDirection;
  } | null>(null);

  const rankedRows = useMemo(() => {
    const rankingKey = rankingMode === "sales" ? "sales" : "profit";

    return allRows
      .filter((row) => row.netSales > 0)
      .sort((left, right) =>
        compareValues(
          getProductSortValue(left, rankingKey),
          getProductSortValue(right, rankingKey),
          "desc",
        ),
      )
      .slice(0, 10);
  }, [allRows, rankingMode]);

  const rows = useMemo(() => {
    if (!sortConfig?.direction) {
      return rankedRows;
    }

    const { key, direction } = sortConfig;

    return [...rankedRows].sort((left, right) =>
      compareValues(
        getProductSortValue(left, key),
        getProductSortValue(right, key),
        direction,
      ),
    );
  }, [rankedRows, sortConfig]);

  const handleSort = (key: ProductSortKey) => {
    let direction: SortDirection = "asc";

    if (sortConfig?.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    } else if (sortConfig?.key === key && sortConfig.direction === "desc") {
      direction = null;
    }

    setSortConfig(direction ? { key, direction } : null);
  };

  if (rows.length === 0) {
    return (
      <Card padding="lg" className={className}>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-foreground">Produtos</h3>
          <p className="text-xs text-muted-foreground">Performance por SKU</p>
        </div>
        <EmptyState
          title="Nenhum produto com dados suficientes"
          description="Cadastre produtos e custos para visualizar a lucratividade por item."
          icon={<Package className="h-6 w-6" />}
          action={
            <Link
              href="/app/products"
              className="inline-flex items-center gap-1 text-sm font-medium text-accent transition-colors hover:text-accent-strong"
            >
              Cadastrar produtos
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          }
        />
      </Card>
    );
  }

  return (
    <motion.div variants={slideInUpVariants}>
      <Card padding="lg" className={className}>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">TOP 10 Produtos</h3>
            <p className="text-xs text-muted-foreground">
              {rankingMode === "profit" ? "Maiores lucros por SKU" : "Melhores vendas por SKU"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div
              role="tablist"
              aria-label="Modo de ranking"
              className="relative inline-flex items-center rounded-full border border-border/60 bg-gradient-to-b from-surface/70 to-surface/30 p-[3px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.05),inset_0_-1px_0_rgba(255,255,255,0.04)]"
            >
              <button
                type="button"
                role="tab"
                aria-selected={rankingMode === "profit"}
                onClick={() => {
                  setRankingMode("profit");
                  setSortConfig(null);
                }}
                className={cn(
                  "relative inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
                  rankingMode === "profit"
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground/70",
                )}
              >
                {rankingMode === "profit" ? (
                  <motion.span
                    layoutId="products-ranking-pill"
                    className="absolute inset-0 rounded-full bg-gradient-to-b from-background to-surface shadow-[0_1px_2px_rgba(0,0,0,0.08),0_4px_14px_-4px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.06)] ring-1 ring-border/50"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                ) : null}
                <Banknote
                  className={cn(
                    "relative z-10 h-3.5 w-3.5 transition-colors",
                    rankingMode === "profit" ? "text-accent" : "",
                  )}
                />
                <span className="relative z-10">Lucros</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={rankingMode === "sales"}
                onClick={() => {
                  setRankingMode("sales");
                  setSortConfig(null);
                }}
                className={cn(
                  "relative inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
                  rankingMode === "sales"
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground/70",
                )}
              >
                {rankingMode === "sales" ? (
                  <motion.span
                    layoutId="products-ranking-pill"
                    className="absolute inset-0 rounded-full bg-gradient-to-b from-background to-surface shadow-[0_1px_2px_rgba(0,0,0,0.08),0_4px_14px_-4px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.06)] ring-1 ring-border/50"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                ) : null}
                <TrendingUp
                  className={cn(
                    "relative z-10 h-3.5 w-3.5 transition-colors",
                    rankingMode === "sales" ? "text-accent" : "",
                  )}
                />
                <span className="relative z-10">Vendas</span>
              </button>
            </div>
            <div className="hidden h-5 w-px bg-border/60 sm:block" />
            <Link
              href="/app/products"
              className="flex items-center gap-1 text-xs font-medium text-accent transition-colors hover:text-accent-strong"
            >
              Ver todos
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <div className="-mx-2 overflow-x-auto px-2">
          <div className="min-w-[960px]">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-strong/95">
                  <ProductsSortableHeader
                    align="center"
                    column="channel"
                    onSort={handleSort}
                    sortConfig={sortConfig}
                  >
                    Canal
                  </ProductsSortableHeader>
                  <ProductsSortableHeader
                    column="name"
                    onSort={handleSort}
                    sortConfig={sortConfig}
                    width={420}
                  >
                    Produto
                  </ProductsSortableHeader>
                  <ProductsSortableHeader
                    align="center"
                    column="health"
                    onSort={handleSort}
                    sortConfig={sortConfig}
                  >
                    Saúde
                  </ProductsSortableHeader>
                  <ProductsSortableHeader align="right" column="sales" onSort={handleSort} sortConfig={sortConfig}>
                    Vendas
                  </ProductsSortableHeader>
                  <ProductsSortableHeader align="right" column="returns" onSort={handleSort} sortConfig={sortConfig}>
                    Devoluções
                  </ProductsSortableHeader>
                  <ProductsSortableHeader align="right" column="revenue" onSort={handleSort} sortConfig={sortConfig}>
                    Receita
                  </ProductsSortableHeader>
                  <ProductsSortableHeader align="right" column="profit" onSort={handleSort} sortConfig={sortConfig}>
                    Lucro
                  </ProductsSortableHeader>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row, index) => {
                  const returnRate = row.sales > 0 ? row.returns / row.sales : 0;
                  const healthBadge = healthBadgeConfig[row.health];

                  return (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03, duration: 0.3 }}
                      className="transition-colors duration-150 hover:bg-foreground/[0.015]"
                    >
                      <td className="px-3 py-3 text-center">{getChannelBadge(row.channelLabel)}</td>

                      <td className="px-3 py-3 align-top" style={{ width: 420, maxWidth: 420 }}>
                        <div className="flex items-start gap-2 min-w-0">
                          <ProductImagePreview alt={row.name} url={row.coverImageUrl} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium leading-snug text-foreground whitespace-normal break-words line-clamp-2">
                              {row.name}
                            </p>
                            <p className="mt-0.5 font-mono text-xs text-muted-foreground whitespace-normal break-all">
                              {row.sku || "—"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-3 text-center">
                        <StatusBadge status={healthBadge.status} label={healthBadge.label} />
                      </td>

                      <td className="px-3 py-3 text-right">
                        <span className="text-sm text-foreground">{formatNumber(row.sales)}</span>
                      </td>

                      <td className="px-3 py-3 text-right">
                        <div className="flex flex-col items-end">
                          <span className={`text-sm ${returnRate > 0.15 ? "text-error" : "text-foreground"}`}>
                            {formatNumber(row.returns)}
                          </span>
                          {returnRate > 0.05 && (
                            <span className="text-[10px] text-muted-foreground">
                              ({formatPercent(returnRate * 100, { digits: 0 })})
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-3 py-3 text-right">
                        <span className="text-sm font-medium text-foreground">{formatMoney(row.revenue)}</span>
                      </td>

                      <td className="px-3 py-3 text-right">
                        <span className={`text-sm font-semibold ${row.profit >= 0 ? "text-success" : "text-error"}`}>
                          {formatMoney(row.profit)}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
