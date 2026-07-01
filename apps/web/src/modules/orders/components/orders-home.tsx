"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpDown,
  CalendarRange,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Download,
  DollarSign,
  Filter,
  Loader2,
  Package,
  Percent,
  Search,
  SlidersHorizontal,
  Sparkles,
  Store,
  Truck,
  X,
} from "lucide-react";
import { Badge, Button, Card, Dropdown, EmptyState, Modal, cn } from "@lucreii/ui";
import { Pagination } from "@/components/ui-premium/pagination";
import { StatusBadge } from "@/components/ui-premium/status-badge";
import { MultiSelectDropdown } from "@/components/ui-premium/multi-select-dropdown";
import { slideInUpVariants } from "@/lib/animations";
import type {
  IntegrationProviderSlug,
  OrderCanonicalStatus,
  OrderComposition,
  OrderLineItem,
  OrderListItem,
  OrderStatusOption,
} from "@lucreii/types";
import {
  downloadOrdersExport,
  useOrderDetails,
  useOrdersList,
} from "../hooks/use-orders-data";

const PAGE_SIZE = 20;

const PROVIDER_FILTER_OPTIONS: {
  value: IntegrationProviderSlug;
  label: string;
  swatch: string;
}[] = [
  { value: "mercadolivre", label: "Mercado Livre", swatch: "#ffe600" },
  { value: "shopee", label: "Shopee", swatch: "#fa5230" },
  { value: "shein", label: "Shein", swatch: "#111111" },
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
  | "contributionMarginPercent"
  | "shippingAmount"
  | "tariffAmount"
  | "fixedCostAmount"
  | "totalProfitAmount"
  | "totalWithFees";

type SortDirection = "asc" | "desc" | null;

type ItemSortKey = "displayName" | "unitPrice" | "quantity";

type DetailTabKey = "items" | "composition";

type StatusType = "active" | "inactive" | "pending" | "warning" | "error" | "success";

function formatMoney(value: string | null | undefined) {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) {
    return new Intl.NumberFormat("pt-BR", {
      currency: "BRL",
      style: "currency",
    }).format(0);
  }
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(parsed);
}

function formatTaxRate(value: string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value) * 100;
  if (!Number.isFinite(parsed) || parsed === 0) {
    return null;
  }
  return `${new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(parsed)}%`;
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

function isNegativeNumber(value: string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return false;
  }

  return Number(value) < 0;
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
      return row.displayOrderId;
    case "provider":
      return PROVIDER_LABELS[row.provider] ?? row.provider;
    case "statusLabel":
      return row.statusLabel;
    case "orderedAt":
      return row.orderedAt;
    case "contributionMarginPercent":
      return row.contributionMarginPercent === null
        ? null
        : Number(row.contributionMarginPercent);
    case "shippingAmount":
      return Number(row.shippingAmount);
    case "tariffAmount":
      return Number(row.tariffAmount);
    case "fixedCostAmount":
      return Number(row.fixedCostAmount);
    case "totalWithFees":
      return Number(row.totalWithFees);
    case "totalProfitAmount":
      return row.totalProfitAmount === null ? null : Number(row.totalProfitAmount);
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
    case "displayName":
      return row.displayName;
    case "unitPrice":
      return Number(row.unitPrice);
    case "quantity":
      return row.quantity;
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
  width,
  onSort,
  sortConfig,
}: {
  align?: "left" | "right";
  children: ReactNode;
  column: ItemSortKey;
  width?: string;
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
      style={width ? { width } : undefined}
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
  negative = false,
  variant = "default",
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  negative?: boolean;
  variant?: "default" | "highlight";
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border p-4",
        variant === "highlight"
          ? "border-accent/20 bg-accent/5"
          : "border-border/30 bg-white",
      )}
    >
      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-[11px] font-bold uppercase tracking-[0.14em]">
          {label}
        </span>
      </div>
      <div
        className={cn(
          "flex items-baseline gap-1.5 text-xl font-semibold tabular-nums",
          negative ? "text-red-600" : "text-foreground",
        )}
      >
        {negative ? <span>-</span> : null}
        {value}
      </div>
    </div>
  );
}

function CompositionTab({ composition }: { composition: OrderComposition }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <CompositionMetric
          icon={<DollarSign className="h-4 w-4" />}
          label="Faturamento"
          value={formatMoney(composition.revenueAmount)}
          variant="highlight"
        />
        <CompositionMetric
          icon={<Percent className="h-4 w-4" />}
          label="Estornos / Bônus"
          value={formatMoney(composition.refundBonusAmount)}
        />
        <CompositionMetric
          icon={<Package className="h-4 w-4" />}
          label="Custo Produto"
          value={formatMoney(composition.productCostAmount)}
          negative
        />
        <CompositionMetric
          icon={<Percent className="h-4 w-4" />}
          label="Comissão"
          value={formatMoney(composition.marketplaceCommissionAmount)}
          negative
        />
        <CompositionMetric
          icon={<Truck className="h-4 w-4" />}
          label="Frete / Taxa Fixa"
          value={formatMoney(composition.shippingOrFixedFeeAmount)}
          negative
        />
        <CompositionMetric
          icon={<Package className="h-4 w-4" />}
          label="Embalagem"
          value={formatMoney(composition.packagingCostAmount)}
          negative
        />
        <CompositionMetric
          icon={<Percent className="h-4 w-4" />}
          label="Imposto"
          negative
          value={
            <>
              <span>{formatMoney(composition.taxAmount)}</span>
              {(() => {
                const rateLabel = formatTaxRate(composition.taxRateDefault);
                return rateLabel ? (
                  <span className="text-sm font-medium text-muted-foreground">
                    ({rateLabel})
                  </span>
                ) : null;
              })()}
            </>
          }
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
  const [orderedFrom, setOrderedFrom] = useState("");
  const [orderedTo, setOrderedTo] = useState("");
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
  const [isExporting, setIsExporting] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  const provider =
    selectedMarketplaces.length === 1 ? selectedMarketplaces[0] : "";

  const listQuery = useOrdersList({
    includeSummary: false,
    page,
    pageSize: PAGE_SIZE,
    ...(search ? { search } : {}),
    ...(provider ? { provider: provider as IntegrationProviderSlug } : {}),
    ...(selectedStatus ? { status: selectedStatus } : {}),
    ...(sortConfig?.direction
      ? {
          sortBy: sortConfig.key,
          sortDirection: sortConfig.direction,
        }
      : {}),
    ...(orderedFrom ? { orderedFrom } : {}),
    ...(orderedTo ? { orderedTo } : {}),
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
  const currentPage = listQuery.data?.page ?? page;
  const visibleOrderIds = useMemo(() => rows.map((row) => row.id), [rows]);
  const selectedVisibleCount = visibleOrderIds.filter((id) =>
    selectedOrderIds.includes(id),
  ).length;
  const allVisibleSelected =
    visibleOrderIds.length > 0 && selectedVisibleCount === visibleOrderIds.length;

  const hasActiveFilters =
    search.trim().length > 0 || 
    selectedMarketplaces.length > 0 || 
    selectedStatus !== null ||
    orderedFrom.length > 0 ||
    orderedTo.length > 0; 
 
  const activeFilterCount = 
    (search.trim() ? 1 : 0) + 
    selectedMarketplaces.length + 
    (selectedStatus ? 1 : 0) +
    (orderedFrom ? 1 : 0) +
    (orderedTo ? 1 : 0); 
 
  const clearAllFilters = () => { 
    setSearch(""); 
    setSearchDraft(""); 
    setOrderedFrom("");
    setOrderedTo("");
    setSelectedMarketplaces([]); 
    setSelectedStatus(null); 
    setPage(1);
  };

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrderIds((current) =>
      current.includes(orderId)
        ? current.filter((id) => id !== orderId)
        : [...current, orderId],
    );
  };

  const toggleVisibleSelection = () => {
    setSelectedOrderIds((current) => {
      if (allVisibleSelected) {
        return current.filter((id) => !visibleOrderIds.includes(id));
      }

      return [...new Set([...current, ...visibleOrderIds])];
    });
  };

  const handleExport = async (ids?: string[]) => {
    try {
      setIsExporting(true);
      const blob = await downloadOrdersExport(
        ids
          ? { ids }
          : {
              includeSummary: false,
              orderedFrom: orderedFrom || undefined,
              orderedTo: orderedTo || undefined,
              page: currentPage,
              pageSize: PAGE_SIZE,
              provider: provider
                ? (provider as IntegrationProviderSlug)
                : undefined,
              search: search || undefined,
              status: selectedStatus ?? undefined,
            },
      );
      if (blob instanceof Blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `pedidos-${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      }
    } finally {
      setIsExporting(false);
    }
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

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  void handleExport();
                }}
                disabled={isExporting}
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-border bg-surface-strong px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all duration-[var(--transition-fast)] hover:border-border-strong hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Download className="h-3.5 w-3.5" />
                {isExporting ? "Exportando..." : "Exportar"}
              </button>

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
                  className="relative flex min-w-[260px] flex-[1.5] items-center"
                  onSubmit={(event) => {
                    event.preventDefault();
                    applyFilters();
                  }}
                >
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                  <input
                    type="text"
                    value={searchDraft}
                    onChange={(event) => setSearchDraft(event.target.value)}
                    placeholder="Buscar pedido por ID"
                    className="h-8 w-full min-w-0 rounded-[var(--radius-md)] border border-transparent bg-background pl-9 pr-9 text-sm text-foreground transition-all duration-[var(--transition-fast)] hover:border-border/60 focus:border-accent/60 focus:bg-background focus:outline-none focus:ring-2 focus:ring-accent/20"
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

                <MultiSelectDropdown
                  align="left"
                  emptyLabel="Todos os canais"
                  label="Canais"
                  onChange={(next) => {
                    setSelectedMarketplaces(next);
                    setPage(1);
                  }}
                  options={PROVIDER_FILTER_OPTIONS.map((option) => ({
                    id: option.value,
                    label: option.label,
                    swatch: option.swatch,
                  }))}
                  selected={selectedMarketplaces}
                  triggerIcon={<Store className="h-3.5 w-3.5" />}
                />

                <div className="hidden h-5 w-px shrink-0 bg-border/60 sm:block" />

                <div
                  className={cn(
                    "group flex h-8 items-center gap-1.5 rounded-[var(--radius-md)] border bg-background pl-2.5 pr-1.5 transition-all duration-[var(--transition-fast)]",
                    orderedFrom || orderedTo
                      ? "border-accent/40 ring-1 ring-inset ring-accent/15"
                      : "border-border hover:border-border-strong focus-within:border-accent/60 focus-within:ring-2 focus-within:ring-accent/20",
                  )}
                >
                  <CalendarRange
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 transition-colors",
                      orderedFrom || orderedTo
                        ? "text-accent"
                        : "text-muted-foreground/70 group-focus-within:text-accent",
                    )}
                  />
                  <span className="hidden text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/70 sm:inline">
                    Data do Pedido
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/70 sm:hidden">
                    Data
                  </span>
                  <input
                    aria-label="Data inicial do pedido"
                    type="date"
                    value={orderedFrom}
                    onChange={(event) => {
                      setOrderedFrom(event.target.value);
                      setPage(1);
                    }}
                    className="h-6 min-w-[110px] cursor-pointer rounded-sm border-0 bg-transparent px-1 text-xs font-medium text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 hover:bg-foreground/5 focus-visible:bg-foreground/5 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-80 [&::-webkit-calendar-picker-indicator]:transition-opacity hover:[&::-webkit-calendar-picker-indicator]:opacity-100 focus-visible:[&::-webkit-calendar-picker-indicator]:opacity-100 dark:[color-scheme:dark]"
                  />
                  <span
                    aria-hidden
                    className="select-none text-[10px] font-medium text-muted-foreground/50"
                  >
                    →
                  </span>
                  <input
                    aria-label="Data final do pedido"
                    type="date"
                    value={orderedTo}
                    onChange={(event) => {
                      setOrderedTo(event.target.value);
                      setPage(1);
                    }}
                    className="h-6 min-w-[110px] cursor-pointer rounded-sm border-0 bg-transparent px-1 text-xs font-medium text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 hover:bg-foreground/5 focus-visible:bg-foreground/5 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-80 [&::-webkit-calendar-picker-indicator]:transition-opacity hover:[&::-webkit-calendar-picker-indicator]:opacity-100 focus-visible:[&::-webkit-calendar-picker-indicator]:opacity-100 dark:[color-scheme:dark]"
                  />
                  {orderedFrom || orderedTo ? (
                    <button
                      type="button"
                      onClick={() => {
                        setOrderedFrom("");
                        setOrderedTo("");
                        setPage(1);
                      }}
                      className="ml-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-foreground/10 hover:text-foreground"
                      aria-label="Limpar período"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  ) : null}
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
                    <div
                      className={cn(
                        "inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-md)] border bg-background pl-2.5 pr-2.5 text-sm transition-all duration-[var(--transition-fast)]",
                        selectedStatus
                          ? "border-accent/40 text-foreground ring-1 ring-inset ring-accent/15"
                          : "border-border text-foreground hover:border-border-strong",
                      )}
                    >
                      <SlidersHorizontal
                        className={cn(
                          "h-3.5 w-3.5 shrink-0 transition-colors",
                          selectedStatus ? "text-accent" : "text-muted-foreground/70",
                        )}
                      />
                      <span className="hidden text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/70 md:inline">
                        Status
                      </span>
                      <span
                        aria-hidden
                        className="hidden h-3 w-px shrink-0 bg-border/70 md:inline-block"
                      />
                      <span className="max-w-[140px] truncate font-medium text-foreground">
                        {selectedStatusLabel === "Todos os status"
                          ? "Todos"
                          : selectedStatusLabel}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
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

          {selectedOrderIds.length > 0 ? (
            <AnimatePresence initial={false} mode="wait">
              <motion.div
                key="orders-selection-bar"
                initial={{ opacity: 0, y: -8, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.985 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className="group relative mb-4 flex shrink-0 flex-col gap-3 overflow-hidden rounded-[var(--radius-lg)] border border-accent/25 bg-gradient-to-r from-accent/[0.07] via-accent/[0.04] to-transparent p-3 pl-4 shadow-[0_1px_0_0_rgba(255,255,255,0.6)_inset,var(--shadow-sm)] backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:pl-5 dark:from-accent/[0.12] dark:via-accent/[0.06] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,var(--shadow-sm)]"
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-accent via-accent-strong to-accent"
                />

                <div className="flex min-w-0 items-center gap-3">
                  <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-accent/10 text-accent ring-1 ring-inset ring-accent/20">
                    <Sparkles className="h-4.5 w-4.5" strokeWidth={2.25} />
                    <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-accent ring-2 ring-background">
                      <span className="absolute inset-0 animate-ping rounded-full bg-accent/60" />
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5 text-sm text-foreground">
                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Seleção
                      </span>
                      <span className="text-muted-foreground/40">·</span>
                      <div className="flex items-baseline gap-1">
                        <AnimatePresence mode="popLayout" initial={false}>
                          <motion.span
                            key={selectedOrderIds.length}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.18, ease: "easeOut" }}
                            className="font-mono text-base font-bold tabular-nums text-accent"
                          >
                            {selectedOrderIds.length}
                          </motion.span>
                        </AnimatePresence>
                        <span className="font-medium text-foreground">
                          {selectedOrderIds.length === 1 ? "selecionado" : "selecionados"}
                        </span>
                      </div>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Pronto para ação em massa
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 sm:flex-nowrap sm:gap-2">
                  {visibleOrderIds.length > 0 && !allVisibleSelected ? (
                    <Button
                      className="h-8 gap-1.5 rounded-[var(--radius-sm)] px-2.5 text-xs font-medium text-muted-foreground hover:bg-accent/10 hover:text-accent"
                      onClick={toggleVisibleSelection}
                      size="sm"
                      variant="ghost"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      Selecionar página
                    </Button>
                  ) : null}

                  <Button
                    aria-label="Limpar seleção"
                    className="h-8 gap-1.5 rounded-[var(--radius-sm)] px-2.5 text-xs font-medium text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                    onClick={() => setSelectedOrderIds([])}
                    size="sm"
                    variant="ghost"
                  >
                    <X className="h-3.5 w-3.5" />
                    Limpar
                  </Button>

                  <div className="mx-1 hidden h-5 w-px bg-border/70 sm:block" />

                  <Button
                    className="h-8 gap-1.5 rounded-[var(--radius-sm)] bg-accent/95 px-3 text-xs font-semibold text-accent-foreground shadow-[0_1px_0_0_rgba(255,255,255,0.25)_inset,var(--shadow-xs)] hover:bg-accent hover:shadow-[var(--shadow-sm)]"
                    disabled={isExporting}
                    loading={isExporting}
                    onClick={() => {
                      void handleExport(selectedOrderIds);
                    }}
                    size="sm"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Exportar selecionados
                  </Button>
                </div>
              </motion.div>
            </AnimatePresence>
          ) : null}

          <div className="mb-3 flex shrink-0 items-center justify-between text-xs text-muted-foreground">
            <span>
              <span className="font-semibold tabular-nums text-foreground">
                {rows.length}
              </span>{" "}
              {rows.length === 1 ? "pedido exibido" : "pedidos exibidos"} na
              página atual
            </span>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full min-w-[1100px] border-separate border-spacing-0">
              <thead>
                <tr className="border-b border-border bg-surface-strong/95">
                  <th className="sticky top-0 z-10 w-12 bg-surface-strong/95 px-3 py-3 text-left">
                    <input
                      aria-label="Selecionar pedidos visiveis"
                      checked={allVisibleSelected}
                      onChange={() => toggleVisibleSelection()}
                      type="checkbox"
                    />
                  </th>
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
                  <OrderSortableHeader column="totalWithFees" align="right" onSort={handleSort} sortConfig={sortConfig}>
                    Faturamento
                  </OrderSortableHeader>
                  <OrderSortableHeader column="contributionMarginPercent" align="right" onSort={handleSort} sortConfig={sortConfig}>
                    Margem de Contribuição
                  </OrderSortableHeader>
                  <OrderSortableHeader column="totalProfitAmount" align="right" onSort={handleSort} sortConfig={sortConfig}>
                    Lucro Total
                  </OrderSortableHeader>
                </tr>
              </thead>

              <tbody>
                {listQuery.isLoading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-10 text-center text-sm text-muted-foreground"
                    >
                      Carregando pedidos...
                    </td>
                  </tr>
                ) : listQuery.error ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-10 text-center text-sm text-muted-foreground"
                    >
                      Nao foi possivel carregar os pedidos.
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <EmptyState
                        title="Nenhum pedido encontrado"
                        description="Ajuste os filtros para visualizar outros pedidos."
                        icon={<Package className="h-6 w-6" />}
                      />
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
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
                        <input
                          aria-label={`Selecionar ${row.displayOrderId}`}
                          checked={selectedOrderIds.includes(row.id)}
                          onChange={(event) => {
                            event.stopPropagation();
                            toggleOrderSelection(row.id);
                          }}
                          onClick={(event) => event.stopPropagation()}
                          type="checkbox"
                        />
                      </td>
                      <td className="px-3 py-3 text-left">
                        {getProviderBadge(row.provider)}
                      </td>
                      <td className="px-3 py-3 text-left">
                        <div className="flex flex-col gap-1">
                          <span className="font-mono text-sm font-medium text-foreground">
                            {row.displayOrderId}
                          </span>
                          {(row.skus ?? []).length > 0 ? (
                            (row.skus ?? []).map((sku) => (
                              <span
                                key={`${row.id}-${sku}`}
                                className="font-mono text-[11px] text-muted-foreground"
                              >
                                {sku}
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-muted-foreground">
                              Sem SKU
                            </span>
                          )}
                        </div>
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
                        {formatMoney(row.totalWithFees)}
                      </td>
                      <td
                        className={cn(
                          "px-3 py-3 text-right text-sm font-semibold tabular-nums",
                          isNegativeNumber(row.contributionMarginPercent)
                            ? "text-red-600"
                            : "text-foreground",
                        )}
                      >
                        {formatPercent(row.contributionMarginPercent)}
                      </td>
                      <td
                        className={cn(
                          "px-3 py-3 text-right text-sm font-semibold tabular-nums",
                          isNegativeNumber(row.totalProfitAmount)
                            ? "text-red-600"
                            : "text-foreground",
                        )}
                      >
                        {row.totalProfitAmount === null
                          ? "—"
                          : formatMoney(row.totalProfitAmount)}
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
                currentPage={currentPage}
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
                  Pedido #{detailQuery.data.order.displayOrderId}
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
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-7 w-7 animate-spin text-accent" />
          </div>
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
              <div className="space-y-4">
                <CompositionTab composition={detailQuery.data.composition} />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="max-h-[60vh] overflow-y-auto overflow-x-auto rounded-[var(--radius-lg)] border border-border">
                  <table className="w-full table-fixed border-separate border-spacing-0">
                    <thead>
                      <tr className="border-b border-border bg-surface-strong/95">
                        <ItemSortableHeader
                          column="displayName"
                          width="220px"
                          onSort={handleItemSort}
                          sortConfig={itemSortConfig}
                        >
                          Produto
                        </ItemSortableHeader>
                        <ItemSortableHeader
                          align="right"
                          column="unitPrice"
                          width="150px"
                          onSort={handleItemSort}
                          sortConfig={itemSortConfig}
                        >
                          Preço de Venda
                        </ItemSortableHeader>
                        <ItemSortableHeader
                          align="right"
                          column="quantity"
                          width="180px"
                          onSort={handleItemSort}
                          sortConfig={itemSortConfig}
                        >
                          Quantidade
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
                              <td colSpan={3}>
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
                            <td className="px-3 py-3 text-left align-top">
                              <div className="flex items-start gap-3 overflow-hidden">
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
                            <td className="px-3 py-3 text-right align-top text-sm font-semibold tabular-nums text-foreground">
                              {formatMoney(item.unitPrice)}
                            </td>
                            <td className="px-3 py-3 text-right align-top text-sm font-semibold tabular-nums text-foreground">
                              {item.quantity}
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
