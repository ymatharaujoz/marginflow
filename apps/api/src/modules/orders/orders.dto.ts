import {
  orderCompositionUpdateSchema,
  orderExportQuerySchema,
  orderListFiltersSchema,
} from "@lucreii/validation";
import type {
  OrderCanonicalStatus,
  OrderCompositionUpdateInput,
  OrderExportFilters,
} from "@lucreii/types";

export class OrderListFiltersDto {
  static schema = orderListFiltersSchema;

  page?: number;
  pageSize?: number;
  search?: string;
  provider?: "mercadolivre" | "shopee" | "shein";
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
}

export class UpdateOrderCompositionDto implements OrderCompositionUpdateInput {
  static schema = orderCompositionUpdateSchema;

  refundBonusAmount!: string;
  productCostAmount!: string;
  marketplaceCommissionAmount!: string;
  shippingOrFixedFeeAmount!: string;
  packagingCostAmount!: string;
}

export class OrderExportQueryDto implements OrderExportFilters {
  static schema = orderExportQuerySchema;

  ids?: string[];
  search?: string;
  provider?: "mercadolivre" | "shopee" | "shein";
  status?: OrderCanonicalStatus;
  orderedFrom?: string;
  orderedTo?: string;
}
