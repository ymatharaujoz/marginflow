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

export type ProductCatalogSnapshot = {
  adCosts: AdCostRecord[];
  manualExpenses: ManualExpenseRecord[];
  productCosts: ProductCostRecord[];
  products: ProductListItem[];
};
