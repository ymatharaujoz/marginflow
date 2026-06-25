"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Filter,
  Package,
  Percent,
  Search,
  SlidersHorizontal,
  Truck,
  Wallet,
  X,
} from "lucide-react";
import { Badge, Card, Dropdown, EmptyState, Modal, cn } from "@lucreii/ui";
import { Pagination } from "@/components/ui-premium/pagination";
import { StatusBadge } from "@/components/ui-premium/status-badge";
import { slideInUpVariants } from "@/lib/animations";
import type {
  IntegrationProviderSlug,
  OrderCanonicalStatus,
  OrderComposition,
  OrderLineItem,
  OrderListItem,
  OrderStatusOption,
} from "@lucreii/types";
import { useOrderDetails, useOrdersList } from "../hooks/use-orders-data";

const PAGE_SIZE = 20;

const PROVIDER_FILTER_OPTIONS: { value: IntegrationProviderSlug; label: string }[] = [
  { value: "mercadolivre", label: "Mercado Livre" },
  { value: "shopee", label: "Shopee" },
  { value: "shein", label: "Shein" },
];

const PROVIDER_LABELS: Record<IntegrationProviderSlug, string> = {
  mercadolivre: "Mercado Livre",
  shopee: "Shopee",
  shein: "Shein",
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
  | "channel"
  | "displayName"
  | "orderedAt"
  | "totalPrice"
  | "contributionMarginPercent"
  | "totalProfitAmount";

type DetailTabKey = "items" | "composition";

type StatusType = "active" | "inactive" | "pending" | "warning" | "error" | "success";

function formatMoney(value: string) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(Number(value));
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatPercent(value: string | null) {
  if (!value) {
    return "—";
  }

  return `${new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(Number(value))}%`;
}

function getOrderStatusType(status: OrderCanonicalStatus): StatusType {
  switch (status) {
    case "paid":
      return "success";
    case "partially_refunded":
    case "pending_cancel":
      return "warning";
    case "payment_in_process":
    case "partially_paid":
      return "pending";
    case "cancelled":
      return "error";
    default:
      return "inactive";
  }
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

  return <Badge>{provider || "-"}</Badge>;
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
  children: ReactNode;
  column: SortKey;
  minWidth?: string;
  onSort: (key: SortKey) => void;
  sortConfig: { key: SortKey; direction: SortDirection } | null;
}) {
  return (
    <th
      onClick={() => onSort(column)}
      className={cn(
        "sticky top-0 z-10 cursor-pointer select-none bg-surface-strong/95 px-3 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground",
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
    case "channel":
      return PROVIDER_LABELS[row.channel] ?? row.channel;
    case "displayName":
      return row.displayName;
    case "orderedAt":
      return row.orderedAt;
    case "totalPrice":
      return Number(row.totalPrice);
    case "contributionMarginPercent":
      return row.contributionMarginPercent === null
        ? null
        : Number(row.contributionMarginPercent);
    case "totalProfitAmount":
      return row.totalProfitAmount === null ? null : Number(row.totalProfitAmount);
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
  children: ReactNode;
  column: ItemSortKey;
  minWidth?: string;
  onSort: (key: ItemSortKey) => void;
  sortConfig: { key: ItemSortKey; direction: SortDirection } | null;
}) {
  return (
    <th
      onClick={() => onSort(column)}
      className={cn(
        "sticky top-0 z-10 cursor-pointer select-none bg-surface-strong/95 px-3 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground",
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
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-surface-strong text-muted-foreground">
        <Package className="h-4.5 w-4.5" />
      </div>
    );
  }

  return (
    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-2xl border border-border bg-surface-strong">
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

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors",
        active
          ? "bg-accent/10 text-accent"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

function DetailTabs({
  activeTab,
  onChange,
}: {
  activeTab: DetailTabKey;
  onChange: (tab: DetailTabKey) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-border/30 bg-surface/70 p-1">
      <TabButton
        active={activeTab === "items"}
        label="Itens"
        onClick={() => onChange("items")}
      />
      <TabButton
        active={activeTab === "composition"}
        label="Composição"
        onClick={() => onChange("composition")}
      />
    </div>
  );
}

function CompositionMetric({
  icon,
  label,
  value,
  variant = "default",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  variant?: "default" | "highlight" | "warning";
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border p-4",
        variant === "highlight" && "border-accent/20 bg-accent/5",
        variant === "warning" && "border-warning/30 bg-warning/5",
        variant === "default" && "border-border/30 bg-surface/80",
      )}
    >
      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-[11px] font-bold uppercase tracking-[0.14em]">
          {label}
        </span>
      </div>
      <div className="text-xl font-semibold tabular-nums text-foreground">{value}</div>
    </div>
  );
}

function CompositionTab({ composition }: { composition: OrderComposition }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Composição do pedido</h2>
        <p className="text-xs text-muted-foreground">
          Totais agregados do pedido, sem rateio por item unitário
        </p>
      </div>

      {composition.hasIncompleteCostData ? (
        <div className="rounded-[var(--radius-lg)] border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Dados parciais</p>
              <p className="text-xs text-warning/90">
                {composition.missingLinkedItemsCount} item(ns) sem produto vinculado e{" "}
                {composition.missingCostItemsCount} item(ns) sem custo completo.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <CompositionMetric
          icon={<Wallet className="h-4 w-4" />}
          label="Faturamento"
          value={formatMoney(composition.revenueAmount)}
          variant="highlight"
        />
        <CompositionMetric
          icon={<Wallet className="h-4 w-4" />}
          label="Receita Líquida"
          value={formatMoney(composition.netRevenueAmount)}
          variant="highlight"
        />
        <CompositionMetric
          icon={<Package className="h-4 w-4" />}
          label="Custo Produto"
          value={formatMoney(composition.productCostAmount)}
        />
        <CompositionMetric
          icon={<Percent className="h-4 w-4" />}
          label="Comissão"
          value={formatMoney(composition.marketplaceCommissionAmount)}
        />
        <CompositionMetric
          icon={<Truck className="h-4 w-4" />}
          label="Frete / Taxa Fixa"
          value={formatMoney(composition.shippingOrFixedFeeAmount)}
        />
        <CompositionMetric
          icon={<Package className="h-4 w-4" />}
          label="Embalagem"
          value={formatMoney(composition.packagingCostAmount)}
        />
      </div>
    </div>
  );
}

function buildStatusDropdownItems(
  availableStatuses: OrderStatusOption[],
  selectedStatus: OrderCanonicalStatus | null,
) {
  return [
    {
      id: "all",
      label: selectedStatus ? "Todos os status" : "Todos os status",
    },
    ...availableStatuses.map((option) => ({
      id: option.value,
      label: option.label,
    })),
  ];
}

export function OrdersHome() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [selectedMarketplaces, setSelectedMarketplaces] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<OrderCanonicalStatus | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<DetailTabKey>("items");
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

  const listQuery = useOrdersList({
    page,
    pageSize: PAGE_SIZE,
    ...(search ? { search } : {}),
    ...(provider ? { provider: provider as IntegrationProviderSlug } : {}),
    ...(selectedStatus ? { status: selectedStatus } : {}),
  });

  const detailQuery = useOrderDetails(selectedOrderId, modalOpen);

  useEffect(() => {
    if (!modalOpen) {
      setDetailTab("items");
    }
  }, [modalOpen]);

  const rows = useMemo(() => listQuery.data?.items ?? [], [listQuery.data?.items]);
  const availableStatuses = listQuery.data?.availableStatuses ?? [];
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
    selectedStatus !== null;

  const activeFilterCount =
    (search.trim() ? 1 : 0) +
    selectedMarketplaces.length +
    (selectedStatus ? 1 : 0);

  const clearAllFilters = () => {
    setSearch("");
    setSearchDraft("");
    setSelectedMarketplaces([]);
    setSelectedStatus(null);
    setPage(1);
  };

  const toggleMarketplace = (value: string) => {
    setSelectedMarketplaces((previous) =>
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

  const selectedStatusLabel =
    availableStatuses.find((option) => option.value === selectedStatus)?.label ??
    "Todos os status";

  return (
    <div className="space-y-6">
      <motion.div variants={slideInUpVariants} className="flex min-h-0 flex-1">
        <Card padding="lg" className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="mb-4 flex shrink-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">Pedidos</h3>
                {hasActiveFilters ? (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent ring-1 ring-inset ring-accent/20"
                  >
                    <span className="h-1 w-1 rounded-full bg-accent" />
                    {activeFilterCount} {activeFilterCount === 1 ? "ativo" : "ativos"}
                  </motion.span>
                ) : null}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground/70">
                Pedidos sincronizados da empresa ativa
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowFilters((value) => !value)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-medium transition-all duration-[var(--transition-fast)] ${
                showFilters || hasActiveFilters
                  ? "bg-accent text-accent-foreground shadow-[var(--shadow-xs)]"
                  : "border border-border bg-surface-strong text-muted-foreground hover:border-border-strong hover:text-foreground"
              }`}
            >
              <Filter className="h-3.5 w-3.5" />
              Filtros
              {hasActiveFilters ? (
                <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-background/20 px-1 text-[10px] font-bold tabular-nums">
                  {activeFilterCount}
                </span>
              ) : null}
              <ChevronDown
                className={`h-3 w-3 transition-transform duration-[var(--transition-fast)] ${
                  showFilters ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>

          <AnimatePresence initial={false}>
            {showFilters ? (
              <motion.div
                key="filters-toolbar"
                initial={{ opacity: 0, y: -6, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -6, height: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="mb-3 shrink-0 overflow-hidden"
              >
              <div className="flex flex-wrap items-center gap-1.5 rounded-[var(--radius-lg)] border border-border/60 bg-gradient-to-r from-surface/60 via-surface-strong/50 to-surface/60 p-1.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
                <form
                  className="relative flex min-w-[200px] flex-1 items-center"
                  onSubmit={(event) => {
                    event.preventDefault();
                    applyFilters();
                  }}
                >
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
                  <input
                    type="text"
                    value={searchDraft}
                    onChange={(event) => setSearchDraft(event.target.value)}
                    placeholder="Buscar pedido por ID..."
                    className="h-8 w-full rounded-[var(--radius-md)] border border-transparent bg-background pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground/60 transition-all duration-[var(--transition-fast)] hover:border-border/60 focus:border-accent/60 focus:bg-background focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                  {searchDraft ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchDraft("");
                        setSearch("");
                        setPage(1);
                      }}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </form>

                <div className="hidden h-5 w-px shrink-0 bg-border/60 sm:block" />

                <div className="flex items-center gap-1">
                  {PROVIDER_FILTER_OPTIONS.map((option) => {
                    const isSelected = selectedMarketplaces.includes(option.value);
                    const dotColor =
                      option.value === "mercadolivre"
                        ? "#ffe600"
                        : option.value === "shopee"
                          ? "#fa5230"
                          : option.value === "shein"
                            ? "#111111"
                            : "#9ca3af";
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          toggleMarketplace(option.value);
                          setPage(1);
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-[var(--radius-md)] px-2.5 py-1.5 text-xs font-medium transition-all duration-[var(--transition-fast)] ${
                          isSelected
                            ? "bg-accent text-accent-foreground shadow-[var(--shadow-xs)]"
                            : "border border-border bg-background text-muted-foreground hover:border-border-strong hover:text-foreground"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full transition-transform duration-[var(--transition-fast)] ${
                            isSelected ? "scale-125" : ""
                          }`}
                          style={{ backgroundColor: dotColor }}
                        />
                        {option.label}
                      </button>
                    );
                  })}
                </div>

                <div className="hidden h-5 w-px shrink-0 bg-border/60 sm:block" />

                <Dropdown
                  align="left"
                  items={buildStatusDropdownItems(availableStatuses, selectedStatus)}
                  onSelect={(id) => {
                    setSelectedStatus(id === "all" ? null : (id as OrderCanonicalStatus));
                    setPage(1);
                  }}
                  trigger={
                    <div className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-md)] border border-border bg-background px-3 text-sm text-foreground transition-all duration-[var(--transition-fast)] hover:border-border-strong">
                      <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground/70" />
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                        Status
                      </span>
                      <span className="font-medium text-foreground">
                        {selectedStatusLabel === "Todos os status"
                          ? "Todos"
                          : selectedStatusLabel}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  }
                />

                <div className="flex-1" />

                {hasActiveFilters ? (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                    Limpar
                  </button>
                ) : null}
              </div>
            </motion.div>
            ) : null}
          </AnimatePresence>

          <div className="mb-3 flex shrink-0 items-center justify-between text-xs text-muted-foreground">
            <span>
              <span className="font-semibold tabular-nums text-foreground">
                {sortedRows.length}
              </span>{" "}
              {sortedRows.length === 1 ? "pedido exibido" : "pedidos exibidos"} na
              página atual
            </span>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
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
                    Comissão
                  </OrderSortableHeader>
                  <OrderSortableHeader column="fixedCostAmount" align="right" onSort={handleSort} sortConfig={sortConfig}>
                    Taxa
                  </OrderSortableHeader>
                  <OrderSortableHeader column="totalWithFees" align="right" onSort={handleSort} sortConfig={sortConfig}>
                    Faturamento
                  </OrderSortableHeader>
                  <OrderSortableHeader column="totalWithoutFees" align="right" onSort={handleSort} sortConfig={sortConfig}>
                    Receita Liquida
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
                      Nao foi possivel carregar os pedidos.
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
                        setDetailTab("items");
                        setModalOpen(true);
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedOrderId(row.id);
                          setItemSortConfig(null);
                          setDetailTab("items");
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
                          status={getOrderStatusType(row.status)}
                          label={row.statusLabel}
                        />
                      </td>
                      <td className="px-3 py-3 text-left text-sm tabular-nums text-muted-foreground">
                        {formatDateTime(row.orderedAt)}
                      </td>
                      <td className="px-3 py-3 text-right text-sm font-semibold tabular-nums text-foreground">
                        {row.itemsSold}
                      </td>
                      <td className="px-3 py-3 text-right text-sm tabular-nums text-foreground">
                        {formatMoney(row.shippingAmount)}
                      </td>
                      <td className="px-3 py-3 text-right text-sm tabular-nums text-foreground">
                        {formatMoney(row.tariffAmount)}
                      </td>
                      <td className="px-3 py-3 text-right text-sm tabular-nums text-foreground">
                        {formatMoney(row.fixedCostAmount)}
                      </td>
                      <td className="px-3 py-3 text-right text-sm font-semibold tabular-nums text-foreground">
                        {formatMoney(row.totalWithFees)}
                      </td>
                      <td className="px-3 py-3 text-right text-sm font-semibold tabular-nums text-foreground">
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
        className="!max-w-6xl"
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedOrderId(null);
          setDetailTab("items");
        }}
        title={
          detailQuery.data ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-foreground">
                  Pedido #{detailQuery.data.order.orderId}
                </h2>
                <StatusBadge
                  status={getOrderStatusType(detailQuery.data.order.status)}
                  label={detailQuery.data.order.statusLabel}
                />
              </div>
              <div className="text-xs text-muted-foreground">
                {PROVIDER_LABELS[detailQuery.data.order.provider]}
              </div>
            </div>
          ) : (
            "Pedido"
          )
        }
      >
        {detailQuery.isLoading ? (
          <div className="py-8 text-sm text-muted-foreground">Carregando detalhes...</div>
        ) : detailQuery.error || !detailQuery.data ? (
          <div className="py-8 text-sm text-muted-foreground">
            Não foi possível carregar detalhes do pedido.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center">
              <DetailTabs activeTab={detailTab} onChange={setDetailTab} />
            </div>

            {detailTab === "composition" ? (
              <CompositionTab composition={detailQuery.data.composition} />
            ) : (
              <div className="space-y-3">
                <div className="max-h-[60vh] overflow-y-auto overflow-x-auto rounded-[var(--radius-lg)] border border-border">
                  <table className="w-full border-separate border-spacing-0">
                    <thead>
                      <tr className="border-b border-border bg-surface-strong/95">
                        <ItemSortableHeader
                          column="channel"
                          minWidth="48px"
                          onSort={handleItemSort}
                          sortConfig={itemSortConfig}
                        >
                          Canal
                        </ItemSortableHeader>
                        <ItemSortableHeader
                          column="displayName"
                          minWidth="180px"
                          onSort={handleItemSort}
                          sortConfig={itemSortConfig}
                        >
                          PRODUTO
                        </ItemSortableHeader>
                        <ItemSortableHeader
                          column="orderedAt"
                          minWidth="145px"
                          onSort={handleItemSort}
                          sortConfig={itemSortConfig}
                        >
                          Data do Pedido
                        </ItemSortableHeader>
                        <ItemSortableHeader
                          align="right"
                          column="totalPrice"
                          minWidth="110px"
                          onSort={handleItemSort}
                          sortConfig={itemSortConfig}
                        >
                          Faturamento
                        </ItemSortableHeader>
                        <ItemSortableHeader
                          align="right"
                          column="contributionMarginPercent"
                          minWidth="128px"
                          onSort={handleItemSort}
                          sortConfig={itemSortConfig}
                        >
                          Margem de Contribuição
                        </ItemSortableHeader>
                        <ItemSortableHeader
                          align="right"
                          column="totalProfitAmount"
                          minWidth="110px"
                          onSort={handleItemSort}
                          sortConfig={itemSortConfig}
                        >
                          Lucro Total
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
                                  description="Este pedido nao possui itens sincronizados."
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
                              {getProviderBadge(item.channel)}
                            </td>
                            <td className="px-3 py-3 text-left">
                              <div className="flex items-center gap-3 overflow-hidden">
                                <OrderItemThumbnail
                                  alt={item.displayName}
                                  src={item.imageUrl}
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="break-words text-sm font-medium text-foreground">
                                    {item.displayName}
                                  </p>
                                  <p className="break-words text-[11px] text-muted-foreground">
                                    {item.sku ?? "SKU não informado"}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-left text-sm tabular-nums text-muted-foreground">
                              {formatDateTime(item.orderedAt)}
                            </td>
                            <td className="px-3 py-3 text-right text-sm font-semibold tabular-nums text-foreground">
                              {formatMoney(item.totalPrice)}
                            </td>
                            <td
                              className={cn(
                                "px-3 py-3 text-right text-sm tabular-nums",
                                item.contributionMarginPercent !== null &&
                                  Number(item.contributionMarginPercent) < 0
                                  ? "text-error"
                                  : "text-foreground",
                              )}
                            >
                              {formatPercent(item.contributionMarginPercent)}
                            </td>
                            <td
                              className={cn(
                                "px-3 py-3 text-right text-sm font-semibold tabular-nums",
                                item.totalProfitAmount !== null &&
                                  Number(item.totalProfitAmount) < 0
                                  ? "text-error"
                                  : "text-foreground",
                              )}
                            >
                              {item.totalProfitAmount === null
                                ? "—"
                                : formatMoney(item.totalProfitAmount)}
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
