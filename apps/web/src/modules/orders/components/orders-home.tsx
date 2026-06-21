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
  ShoppingCart,
  Store,
  X,
} from "lucide-react";
import { Badge, Card, EmptyState, cn } from "@lucreii/ui";
import { Modal } from "@lucreii/ui";
import { Pagination } from "@/components/ui-premium/pagination";
import { StatusBadge } from "@/components/ui-premium/status-badge";
import { slideInUpVariants } from "@/lib/animations";
import type { IntegrationProviderSlug, OrderLineItem, OrderListItem } from "@lucreii/types";
import { useOrderDetails, useOrdersList } from "../hooks/use-orders-data";

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: "paid", label: "Pagamento aprovado" },
  { value: "completed", label: "Entregue" },
  { value: "returned", label: "Devolução" },
];

const PROVIDER_FILTER_OPTIONS: { value: IntegrationProviderSlug; label: string }[] = [
  { value: "mercadolivre", label: "Mercado Livre" },
  { value: "shopee", label: "Shopee" },
];

const PROVIDER_LABELS: Record<IntegrationProviderSlug, string> = {
  mercadolivre: "Mercado Livre",
  shopee: "Shopee",
};

type SortKey =
  | "provider"
  | "orderId"
  | "statusLabel"
  | "orderedAt"
  | "itemsSold"
  | "shippingAmount"
  | "tariffAmount"
  | "fixedCostAmount"
  | "totalWithFees"
  | "totalWithoutFees";

type SortDirection = "asc" | "desc" | null;

type ItemSortKey =
  | "productName"
  | "sku"
  | "quantity"
  | "unitPrice"
  | "totalPrice";

function formatMoney(value: string) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(Number(value));
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function OrderItemThumbnail({
  alt,
  src,
}: {
  alt: string;
  src?: string | null;
}) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-surface-strong text-muted-foreground">
        <Package className="h-5 w-5" />
      </div>
    );
  }

  return (
    <div className="h-12 w-12 overflow-hidden rounded-2xl border border-border bg-surface-strong">
      <img
        alt={alt}
        className="h-full w-full object-cover"
        decoding="async"
        loading="lazy"
        src={src}
        onError={() => {
          setHasError(true);
        }}
      />
    </div>
  );
}

type StatusType = "active" | "inactive" | "pending" | "warning" | "error" | "success";

function getOrderStatusType(label: string): StatusType {
  if (label === "Entregue" || label === "Pagamento aprovado") return "success";
  if (label === "Devolução") return "warning";
  return "inactive";
}

function getProviderBadge(provider: string) {
  const normalized = provider.trim().toLowerCase();

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

  return <Badge>{provider || "—"}</Badge>;
}

function getSortValue(
  row: OrderListItem,
  key: SortKey,
): string | number | null {
  switch (key) {
    case "orderId":
      return row.orderId;
    case "provider":
      return PROVIDER_LABELS[row.provider] ?? row.provider;
    case "statusLabel":
      return row.statusLabel;
    case "orderedAt":
      return row.orderedAt;
    case "shippingAmount":
      return Number(row.shippingAmount);
    case "tariffAmount":
      return Number(row.tariffAmount);
    case "fixedCostAmount":
      return Number(row.fixedCostAmount);
    case "totalWithFees":
      return Number(row.totalWithFees);
    case "totalWithoutFees":
      return Number(row.totalWithoutFees);
    case "itemsSold":
      return row.itemsSold;
    default:
      return null;
  }
}

function compareSortValues(
  a: ReturnType<typeof getSortValue>,
  b: ReturnType<typeof getSortValue>,
  direction: "asc" | "desc",
): number {
  const aNull = a === null || a === undefined;
  const bNull = b === null || b === undefined;
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

function OrderSortIcon({
  column,
  sortConfig,
}: {
  column: SortKey;
  sortConfig: { key: SortKey; direction: SortDirection } | null;
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

function OrderSortableHeader({
  align = "left",
  children,
  column,
  minWidth,
  onSort,
  sortConfig,
}: {
  align?: "left" | "right";
  children: React.ReactNode;
  column: SortKey;
  minWidth?: string;
  onSort: (key: SortKey) => void;
  sortConfig: { key: SortKey; direction: SortDirection } | null;
}) {
  return (
    <th
      onClick={() => onSort(column)}
      className={cn(
        "sticky top-0 z-10 px-3 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground bg-surface-strong/95",
        align === "right" ? "text-right" : "text-left",
      )}
      style={minWidth ? { minWidth } : undefined}
    >
      <div
        className={cn(
          "flex items-center gap-1",
          align === "right" && "justify-end",
        )}
      >
        {children}
        <OrderSortIcon column={column} sortConfig={sortConfig} />
      </div>
    </th>
  );
}

function getItemSortValue(
  row: OrderLineItem,
  key: ItemSortKey,
): string | number | null {
  switch (key) {
    case "productName":
      return row.productName;
    case "sku":
      return row.sku ?? "";
    case "quantity":
      return row.quantity;
    case "unitPrice":
      return Number(row.unitPrice);
    case "totalPrice":
      return Number(row.totalPrice);
    default:
      return null;
  }
}

function ItemSortIcon({
  column,
  sortConfig,
}: {
  column: ItemSortKey;
  sortConfig: { key: ItemSortKey; direction: SortDirection } | null;
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

function ItemSortableHeader({
  align = "left",
  children,
  column,
  minWidth,
  onSort,
  sortConfig,
}: {
  align?: "left" | "right";
  children: React.ReactNode;
  column: ItemSortKey;
  minWidth?: string;
  onSort: (key: ItemSortKey) => void;
  sortConfig: { key: ItemSortKey; direction: SortDirection } | null;
}) {
  return (
    <th
      onClick={() => onSort(column)}
      className={cn(
        "sticky top-0 z-10 px-3 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground bg-surface-strong/95",
        align === "right" ? "text-right" : "text-left",
      )}
      style={minWidth ? { minWidth } : undefined}
    >
      <div
        className={cn(
          "flex items-center gap-1",
          align === "right" && "justify-end",
        )}
      >
        {children}
        <ItemSortIcon column={column} sortConfig={sortConfig} />
      </div>
    </th>
  );
}

export function OrdersHome() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [selectedMarketplaces, setSelectedMarketplaces] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: SortDirection;
  } | null>(null);
  const [itemSortConfig, setItemSortConfig] = useState<{
    key: ItemSortKey;
    direction: SortDirection;
  } | null>(null);

  const provider =
    selectedMarketplaces.length === 1 ? selectedMarketplaces[0] : "";
  const status = selectedStatus.length === 1 ? selectedStatus[0] : "";

  const listQuery = useOrdersList({
    page,
    pageSize: PAGE_SIZE,
    ...(search ? { search } : {}),
    ...(provider ? { provider: provider as IntegrationProviderSlug } : {}),
    ...(status ? { status } : {}),
  });

  const detailQuery = useOrderDetails(selectedOrderId, modalOpen);

  const rows = useMemo(() => listQuery.data?.items ?? [], [listQuery.data?.items]);
  const totalPages = listQuery.data?.totalPages ?? 1;

  const sortedRows = useMemo(() => {
    if (!sortConfig || !sortConfig.direction) {
      return rows;
    }
    const { key, direction } = sortConfig;
    return [...rows].sort((a, b) =>
      compareSortValues(getSortValue(a, key), getSortValue(b, key), direction),
    );
  }, [rows, sortConfig]);

  const hasActiveFilters =
    search.trim().length > 0 ||
    selectedMarketplaces.length > 0 ||
    selectedStatus.length > 0;

  const clearAllFilters = () => {
    setSearch("");
    setSearchDraft("");
    setSelectedMarketplaces([]);
    setSelectedStatus([]);
    setPage(1);
  };

  const toggleMarketplace = (value: string) => {
    setSelectedMarketplaces((previous) =>
      previous.includes(value)
        ? previous.filter((entry) => entry !== value)
        : [...previous, value],
    );
  };

  const toggleStatus = (value: string) => {
    setSelectedStatus((previous) =>
      previous.includes(value)
        ? previous.filter((entry) => entry !== value)
        : [...previous, value],
    );
  };

  const applyFilters = () => {
    setPage(1);
    setSearch(searchDraft.trim());
  };

  const handleSort = (key: SortKey) => {
    let direction: SortDirection = "asc";

    if (sortConfig?.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    } else if (sortConfig?.key === key && sortConfig.direction === "desc") {
      direction = null;
    }

    setSortConfig(direction ? { key, direction } : null);
    setPage(1);
  };

  const handleItemSort = (key: ItemSortKey) => {
    let direction: SortDirection = "asc";

    if (itemSortConfig?.key === key && itemSortConfig.direction === "asc") {
      direction = "desc";
    } else if (
      itemSortConfig?.key === key &&
      itemSortConfig.direction === "desc"
    ) {
      direction = null;
    }

    setItemSortConfig(direction ? { key, direction } : null);
  };

  return (
    <div className="space-y-6">
      <motion.div variants={slideInUpVariants} className="flex flex-1 min-h-0">
        <Card padding="lg" className="min-w-0 flex flex-1 flex-col overflow-hidden min-h-0">
          <div className="mb-4 flex items-center justify-between gap-3 shrink-0">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground">Pedidos</h3>
              <p className="text-xs text-muted-foreground/70">
                Pedidos sincronizados da empresa ativa
              </p>
            </div>

            <button
              onClick={() => setShowFilters((value) => !value)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-medium transition-all duration-[var(--transition-fast)] ${
                showFilters || hasActiveFilters
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "border border-border bg-surface-strong text-muted-foreground hover:border-border-strong hover:text-foreground"
              }`}
            >
              <Filter className="h-3.5 w-3.5" />
              Filtros
              {hasActiveFilters ? (
                <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-background/20 px-1 text-[10px] font-bold">
                  {(search.trim() ? 1 : 0) +
                    selectedMarketplaces.length +
                    selectedStatus.length}
                </span>
              ) : null}
            </button>
          </div>

          {showFilters ? (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 rounded-[var(--radius-lg)] border border-border bg-surface-strong/50 p-4 shrink-0"
            >
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] xl:items-start">
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Search className="h-3.5 w-3.5 text-accent" />
                    Buscar pedido
                  </label>
                  <form
                    className="relative"
                    onSubmit={(event) => {
                      event.preventDefault();
                      applyFilters();
                    }}
                  >
                    <input
                      type="text"
                      value={searchDraft}
                      onChange={(event) => setSearchDraft(event.target.value)}
                      placeholder="ID do pedido..."
                      className="h-9 w-full rounded-[var(--radius-md)] border border-border bg-background px-3 pr-9 text-sm text-foreground placeholder:text-muted-foreground/60 transition-all duration-[var(--transition-fast)] hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                    />
                    {searchDraft ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchDraft("");
                          setSearch("");
                          setPage(1);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <Search className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
                    )}
                  </form>
                </div>

                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Store className="h-3.5 w-3.5 text-accent" />
                    Marketplace
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {PROVIDER_FILTER_OPTIONS.map((option) => {
                      const isSelected = selectedMarketplaces.includes(option.value);
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            toggleMarketplace(option.value);
                            setPage(1);
                          }}
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

                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <ShoppingCart className="h-3.5 w-3.5 text-accent" />
                    Status
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {STATUS_OPTIONS.map((option) => {
                      const isSelected = selectedStatus.includes(option.value);
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            toggleStatus(option.value);
                            setPage(1);
                          }}
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
                    {sortedRows.length} pedido{sortedRows.length === 1 ? "" : "s"}{" "}
                    exibido{sortedRows.length === 1 ? "" : "s"} na página atual.
                  </p>
                  <button
                    type="button"
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
            <table className="w-full min-w-[1260px] border-separate border-spacing-0">
              <thead>
                <tr className="border-b border-border bg-surface-strong/95">
                  <OrderSortableHeader column="provider" onSort={handleSort} sortConfig={sortConfig}>
                    Canal
                  </OrderSortableHeader>
                  <OrderSortableHeader column="orderId" onSort={handleSort} sortConfig={sortConfig}>
                    ID do Pedido
                  </OrderSortableHeader>
                  <OrderSortableHeader column="statusLabel" onSort={handleSort} sortConfig={sortConfig}>
                    Status
                  </OrderSortableHeader>
                  <OrderSortableHeader column="orderedAt" onSort={handleSort} sortConfig={sortConfig}>
                    Data do Pedido
                  </OrderSortableHeader>
                  <OrderSortableHeader column="itemsSold" align="right" onSort={handleSort} sortConfig={sortConfig}>
                    Itens
                  </OrderSortableHeader>
                  <OrderSortableHeader column="shippingAmount" align="right" onSort={handleSort} sortConfig={sortConfig}>
                    Frete
                  </OrderSortableHeader>
                  <OrderSortableHeader column="tariffAmount" align="right" onSort={handleSort} sortConfig={sortConfig}>
                    Tarifa
                  </OrderSortableHeader>
                  <OrderSortableHeader column="fixedCostAmount" align="right" onSort={handleSort} sortConfig={sortConfig}>
                    Custo Fixo
                  </OrderSortableHeader>
                  <OrderSortableHeader column="totalWithFees" align="right" onSort={handleSort} sortConfig={sortConfig}>
                    Faturamento
                  </OrderSortableHeader>
                  <OrderSortableHeader column="totalWithoutFees" align="right" onSort={handleSort} sortConfig={sortConfig}>
                    Receita Líquida
                  </OrderSortableHeader>
                </tr>
              </thead>

              <tbody>
                {listQuery.isLoading ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-3 py-10 text-center text-sm text-muted-foreground"
                    >
                      Carregando pedidos...
                    </td>
                  </tr>
                ) : listQuery.error ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-3 py-10 text-center text-sm text-muted-foreground"
                    >
                      Não foi possível carregar os pedidos.
                    </td>
                  </tr>
                ) : sortedRows.length === 0 ? (
                  <tr>
                    <td colSpan={10}>
                      <EmptyState
                        title="Nenhum pedido encontrado"
                        description="Ajuste os filtros para visualizar outros pedidos."
                        icon={<Package className="h-6 w-6" />}
                      />
                    </td>
                  </tr>
                ) : (
                  sortedRows.map((row) => (
                    <tr
                      key={row.id}
                      className="cursor-pointer border-b border-border/50 outline-none transition-colors hover:bg-surface-strong/30 focus-visible:bg-accent/5 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/30"
                      onClick={() => {
                        setSelectedOrderId(row.id);
                        setItemSortConfig(null);
                        setModalOpen(true);
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedOrderId(row.id);
                          setItemSortConfig(null);
                          setModalOpen(true);
                        }
                      }}
                    >
                      <td className="px-3 py-3 text-left">
                        {getProviderBadge(row.provider)}
                      </td>
                      <td className="px-3 py-3 text-left">
                        <span className="font-mono text-sm font-medium text-foreground">
                          {row.orderId}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-left">
                        <StatusBadge
                          status={getOrderStatusType(row.statusLabel)}
                          label={row.statusLabel}
                        />
                      </td>
                      <td className="px-3 py-3 text-left text-sm text-muted-foreground tabular-nums">
                        {formatDateTime(row.orderedAt)}
                      </td>
                      <td className="px-3 py-3 text-right text-sm font-semibold text-foreground tabular-nums">
                        {row.itemsSold}
                      </td>
                      <td className="px-3 py-3 text-right text-sm text-foreground tabular-nums">
                        {formatMoney(row.shippingAmount)}
                      </td>
                      <td className="px-3 py-3 text-right text-sm text-foreground tabular-nums">
                        {formatMoney(row.tariffAmount)}
                      </td>
                      <td className="px-3 py-3 text-right text-sm text-foreground tabular-nums">
                        {formatMoney(row.fixedCostAmount)}
                      </td>
                      <td className="px-3 py-3 text-right text-sm font-semibold text-foreground tabular-nums">
                        {formatMoney(row.totalWithFees)}
                      </td>
                      <td className="px-3 py-3 text-right text-sm font-semibold text-foreground tabular-nums">
                        {formatMoney(row.totalWithoutFees)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 ? (
            <div className="shrink-0 pt-4">
              <Pagination
                currentPage={page}
                onPageChange={setPage}
                totalPages={totalPages}
              />
            </div>
          ) : null}
        </Card>
      </motion.div>

      <Modal
        className="!max-w-5xl"
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedOrderId(null);
        }}
        title={detailQuery.data ? `Pedido #${detailQuery.data.order.orderId}` : "Pedido"}
      >
        {detailQuery.isLoading ? (
          <div className="py-8 text-sm text-muted-foreground">Carregando detalhes...</div>
        ) : detailQuery.error || !detailQuery.data ? (
          <div className="py-8 text-sm text-muted-foreground">
            Não foi possível carregar detalhes do pedido.
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Produtos do pedido</h2>
              <p className="text-xs text-muted-foreground">
                Itens que compõem este pedido
              </p>
            </div>
            <div className="max-h-[60vh] overflow-auto rounded-[var(--radius-lg)] border border-border">
              <table className="w-full min-w-[860px] border-separate border-spacing-0">
                <thead>
                  <tr className="border-b border-border bg-surface-strong/95">
                    <th className="sticky top-0 z-10 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-surface-strong/95">
                      Imagem
                    </th>
                    <ItemSortableHeader
                      column="productName"
                      minWidth="220px"
                      onSort={handleItemSort}
                      sortConfig={itemSortConfig}
                    >
                      Produto
                    </ItemSortableHeader>
                    <ItemSortableHeader
                      column="sku"
                      minWidth="140px"
                      onSort={handleItemSort}
                      sortConfig={itemSortConfig}
                    >
                      SKU
                    </ItemSortableHeader>
                    <ItemSortableHeader
                      align="right"
                      column="quantity"
                      minWidth="120px"
                      onSort={handleItemSort}
                      sortConfig={itemSortConfig}
                    >
                      Quantidade
                    </ItemSortableHeader>
                    <ItemSortableHeader
                      align="right"
                      column="unitPrice"
                      minWidth="140px"
                      onSort={handleItemSort}
                      sortConfig={itemSortConfig}
                    >
                      Preço unitário
                    </ItemSortableHeader>
                    <ItemSortableHeader
                      align="right"
                      column="totalPrice"
                      minWidth="140px"
                      onSort={handleItemSort}
                      sortConfig={itemSortConfig}
                    >
                      Total
                    </ItemSortableHeader>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const items = detailQuery.data.items;
                    const itemSortDirection = itemSortConfig?.direction;
                    const sortedItems =
                      !itemSortConfig || !itemSortDirection
                        ? items
                        : [...items].sort((a, b) =>
                            compareSortValues(
                              getItemSortValue(a, itemSortConfig.key),
                              getItemSortValue(b, itemSortConfig.key),
                              itemSortDirection,
                            ),
                          );

                    if (sortedItems.length === 0) {
                      return (
                        <tr>
                          <td colSpan={6}>
                            <EmptyState
                              title="Nenhum produto encontrado"
                              description="Este pedido não possui itens sincronizados."
                              icon={<Package className="h-6 w-6" />}
                            />
                          </td>
                        </tr>
                      );
                    }

                    return sortedItems.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-border/50 outline-none transition-colors hover:bg-surface-strong/30 focus-visible:bg-accent/5"
                      >
                        <td className="px-3 py-3 text-left">
                          <OrderItemThumbnail
                            alt={item.productName}
                            src={item.imageUrl}
                          />
                        </td>
                        <td className="px-3 py-3 text-left text-sm font-medium text-foreground">
                          {item.productName}
                        </td>
                        <td className="px-3 py-3 text-left text-sm text-muted-foreground">
                          {item.sku ?? "—"}
                        </td>
                        <td className="px-3 py-3 text-right text-sm font-semibold text-foreground tabular-nums">
                          {item.quantity}
                        </td>
                        <td className="px-3 py-3 text-right text-sm text-foreground tabular-nums">
                          {formatMoney(item.unitPrice)}
                        </td>
                        <td className="px-3 py-3 text-right text-sm font-semibold text-foreground tabular-nums">
                          {formatMoney(item.totalPrice)}
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
