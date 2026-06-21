import type { IntegrationProviderSlug } from "./integrations";

export type OrderStatusLabel =
  | "Pagamento aprovado"
  | "Entregue"
  | "Devolução"
  | string;

export type OrderListFilters = {
  page?: number;
  pageSize?: number;
  search?: string;
  provider?: IntegrationProviderSlug;
  status?: string;
};

export type OrderListItem = {
  id: string;
  orderId: string;
  provider: IntegrationProviderSlug;
  status: string;
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
  itemsSold: number;
};

export type OrdersListResponse = {
  items: OrderListItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type OrderLineItem = {
  id: string;
  linkedProductId: string | null;
  imageUrl?: string | null;
  productName: string;
  sku: string | null;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
};

export type OrderDetails = {
  order: OrderListItem;
  items: OrderLineItem[];
};
