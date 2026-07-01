import type { IntegrationProviderSlug } from "./integrations";

export type OrderCanonicalStatus =
  | "confirmed"
  | "payment_required"
  | "payment_in_process"
  | "partially_paid"
  | "paid"
  | "partially_refunded"
  | "pending_cancel"
  | "cancelled";

export type OrderStatusLabel =
  | "Pagamento pendente"
  | "Pagamento obrigatório"
  | "Pagamento em processamento"
  | "Pagamento parcial"
  | "Pagamento aprovado"
  | "Reembolso parcial"
  | "Cancelamento pendente"
  | "Cancelado"
  | string;

export type OrderStatusOption = {
  value: OrderCanonicalStatus;
  label: OrderStatusLabel;
};

export type OrderListFilters = {
  page?: number;
  pageSize?: number;
  search?: string;
  provider?: IntegrationProviderSlug;
  status?: OrderCanonicalStatus;
  orderedFrom?: string;
  orderedTo?: string;
  sortBy?:
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
  sortDirection?: "asc" | "desc";
  includeSummary?: boolean;
};

export type OrderExportFilters = Omit<
  OrderListFilters,
  "includeSummary" | "page" | "pageSize" | "sortBy" | "sortDirection"
> & {
  ids?: string[];
};

export type OrderListItem = {
  id: string;
  orderId: string;
  displayOrderId: string;
  skus: string[];
  provider: IntegrationProviderSlug;
  status: OrderCanonicalStatus;
  sourceStatus: string;
  statusLabel: OrderStatusLabel;
  orderedAt: string | null;
  orderDate: string | null;
  createdAt: string;
  currency: string;
  shippingAmount: string;
  tariffAmount: string;
  fixedCostAmount: string;
  totalFees: string;
  totalWithFees: string;
  totalWithoutFees: string;
  contributionMarginPercent: string | null;
  totalProfitAmount: string | null;
  itemsSold: number;
};

export type OrdersListResponse = {
  summary: OrdersListSummary;
  availableStatuses: OrderStatusOption[];
  items: OrderListItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type OrdersListSummary = {
  grossRevenue: string;
  grossProfit: string;
  averageMargin: string;
  ordersCount: number;
  unitsSold: number;
};

export type OrderLineItem = {
  channel: IntegrationProviderSlug;
  contributionMarginPercent: string | null;
  displayName: string;
  id: string;
  linkedProductId: string | null;
  imageUrl?: string | null;
  netRevenueAmount: string;
  orderedAt: string | null;
  productName: string;
  sku: string | null;
  quantity: number;
  totalProfitAmount: string | null;
  unitPrice: string;
  totalPrice: string;
};

export type OrderComposition = {
  revenueAmount: string;
  netRevenueAmount: string;
  taxAmount: string;
  taxRateDefault: string | null;
  productCostAmount: string;
  marketplaceCommissionAmount: string;
  shippingOrFixedFeeAmount: string;
  refundBonusAmount: string;
  packagingCostAmount: string;
  hasIncompleteCostData: boolean;
  missingLinkedItemsCount: number;
  missingCostItemsCount: number;
};

export type OrderDetails = {
  composition: OrderComposition;
  order: OrderListItem;
  items: OrderLineItem[];
};

export type OrderCompositionUpdateInput = {
  refundBonusAmount: string;
  productCostAmount: string;
  marketplaceCommissionAmount: string;
  shippingOrFixedFeeAmount: string;
  packagingCostAmount: string;
};
