import type { IntegrationProviderSlug } from "./integrations";

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

export type ProductCatalogSnapshot = {
  adCosts: AdCostRecord[];
  manualExpenses: ManualExpenseRecord[];
  productCosts: ProductCostRecord[];
  products: ProductListItem[];
  syncedProducts: SyncedProductRecord[];
};
