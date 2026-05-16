import type { IntegrationProviderSlug } from "./integrations";
import type { ProductMonthlyPerformanceRow } from "./finance-inputs";
import type { SyncStatusResponse } from "./sync";

export type DecimalString = string;

export type ProductFormValues = {
  name: string;
  sku: string | null;
  sellingPrice: DecimalString;
  isActive: boolean;
};

export type ProductCostFormValues = {
  productId: string;
  costType: string;
  amount: DecimalString;
  currency: string;
  effectiveFrom: string | null;
  notes: string | null;
};

export type ProductManualCreateInitialFinanceValues = {
  unitCost: DecimalString;
  packagingCost: DecimalString;
  advertisingCost: DecimalString;
  taxRate: DecimalString;
};

export type ProductManualCreateScopeValues = {
  companyId: string;
  referenceMonth: string;
  channel: "mercadolivre";
};

export type ProductManualCreateFormValues = {
  product: ProductFormValues & {
    sku: string;
  };
  initialFinance: ProductManualCreateInitialFinanceValues;
  scope: ProductManualCreateScopeValues;
};

export type AdCostFormValues = {
  productId: string | null;
  channel: string;
  amount: DecimalString;
  currency: string;
  spentAt: string | null;
  notes: string | null;
};

export type ManualExpenseFormValues = {
  category: string;
  amount: DecimalString;
  currency: string;
  incurredAt: string | null;
  notes: string | null;
};

export type ProductRecord = {
  id: string;
  organizationId: string;
  name: string;
  sku: string | null;
  sellingPrice: DecimalString;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProductCostRecord = {
  id: string;
  organizationId: string;
  productId: string;
  costType: string;
  amount: DecimalString;
  currency: string;
  effectiveFrom: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdCostRecord = {
  id: string;
  organizationId: string;
  productId: string | null;
  channel: string;
  amount: DecimalString;
  currency: string;
  spentAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ManualExpenseRecord = {
  id: string;
  organizationId: string;
  category: string;
  amount: DecimalString;
  currency: string;
  incurredAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProductListItem = ProductRecord & {
  latestCost: ProductCostRecord | null;
};

export type SyncedProductReviewStatus =
  | "ignored"
  | "imported_as_internal_product"
  | "linked_to_existing_product"
  | "unreviewed";

export type SyncedProductSuggestedMatchReason = "sku_exact";

export type SyncedProductSuggestedMatch = {
  productId: string;
  name: string;
  sku: string | null;
  isActive: boolean;
  reason: SyncedProductSuggestedMatchReason;
};

export type SyncedProductLinkedProduct = {
  id: string;
  name: string;
  sku: string | null;
  isActive: boolean;
};

export type SyncedProductRecord = {
  id: string;
  externalProductId: string;
  provider: IntegrationProviderSlug;
  title: string | null;
  sku: string | null;
  reviewStatus: SyncedProductReviewStatus;
  linkedProduct: SyncedProductLinkedProduct | null;
  suggestedMatches: SyncedProductSuggestedMatch[];
  orderCount: number;
  unitsSold: number;
  grossRevenue: DecimalString;
  marketplaceCommission: DecimalString;
  fixedFee: DecimalString;
  shippingCost: DecimalString;
  netMarketplaceTake: DecimalString;
  latestUnitPrice: DecimalString | null;
  lastOrderedAt: string | null;
};

export type SyncedProductLinkFormValues = {
  productId: string;
};

export type SyncedProductActionResult = {
  linkedProduct: SyncedProductLinkedProduct | null;
  message: string;
  syncedProduct: SyncedProductRecord;
};

export type ProductManualCreateResult = {
  product: ProductRecord;
  productCost: ProductCostRecord;
  performance: ProductMonthlyPerformanceRow;
};

export type ProductFinancialState =
  | "ready"
  | "empty"
  | "no-costs"
  | "insufficient";

export type ProductAnalyticsInsufficientReason =
  | "missing_cost"
  | "missing_linked_marketplace_signal"
  | "missing_sales_signal";

export type ProductAnalyticsDataGap =
  | "packaging_cost_unavailable"
  | "returns_unavailable"
  | "shipping_cost_unavailable"
  | "tax_amount_unavailable";

export type ProductAnalyticsRow = {
  productId: string;
  name: string;
  sku: string | null;
  isActive: boolean;
  channel: string;
  sales: number;
  returns: number;
  netSales: number;
  salePrice: DecimalString;
  revenue: DecimalString;
  marketplaceCommission: DecimalString;
  shippingCost: DecimalString;
  taxAmount: DecimalString;
  packagingCost: DecimalString;
  productCost: DecimalString;
  adSpend: DecimalString;
  grossProfit: DecimalString;
  contributionMargin: DecimalString;
  unitProfit: DecimalString;
  totalProfit: DecimalString;
  margin: DecimalString;
  roi: DecimalString;
  actualRoas: DecimalString;
  minimumRoas: DecimalString;
  hasCost: boolean;
  hasSalesSignal: boolean;
  hasLinkedMarketplaceSignal: boolean;
  insufficientReasons: ProductAnalyticsInsufficientReason[];
  dataSource: "monthly_performance" | "sync";
};

export type ProductAnalyticsScope = {
  companyId: string | null;
  companyRequired: boolean;
  referenceMonth: string;
};

export type ProductMonthlyPerformanceDisplayRow = {
  referenceMonth: string;
  channel: string;
  productName: string;
  sku: string;
  salesQuantity: number;
  returnsQuantity: number;
  unitCost: DecimalString;
  salePrice: DecimalString;
  commissionRate: DecimalString;
  shippingFee: DecimalString;
  taxRate: DecimalString;
  packagingCost: DecimalString;
  advertisingCost: DecimalString;
};

export type ProductAnalyticsCatalogStats = {
  totalProducts: number;
  activeProducts: number;
  archivedProducts: number;
  productsWithCost: number;
  productsWithoutCost: number;
  pendingSyncProducts: number;
  syncedProductsTotal: number;
  totalProductCosts: number;
  totalAdCosts: number;
  totalManualExpenses: number;
};

export type ProductCatalogSnapshot = {
  adCosts: AdCostRecord[];
  manualExpenses: ManualExpenseRecord[];
  productCosts: ProductCostRecord[];
  products: ProductListItem[];
  syncedProducts: SyncedProductRecord[];
};

export type ProductAnalyticsSnapshot = ProductCatalogSnapshot & {
  productRows: ProductAnalyticsRow[];
  monthlyPerformanceRows: ProductMonthlyPerformanceDisplayRow[];
  catalogStats: ProductAnalyticsCatalogStats;
  financialState: ProductFinancialState;
  dataGaps: ProductAnalyticsDataGap[];
  mercadoLivreSyncStatus: SyncStatusResponse;
  scope: ProductAnalyticsScope;
};
