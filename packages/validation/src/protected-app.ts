import { z } from "zod";

const decimalPattern = /^-?\d+(?:\.\d{1,2})?$/;
const decimalRatePattern = /^-?\d+(?:\.\d{1,6})?$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function decimalField(label: string) {
  return z
    .string()
    .trim()
    .regex(decimalPattern, `${label} must be a decimal amount with up to 2 places.`);
}

function decimalOrInfinityField(label: string) {
  return z.union([decimalField(label), z.literal("Infinity")]);
}

function decimalRateField(label: string) {
  return z
    .string()
    .trim()
    .regex(decimalRatePattern, `${label} must be a decimal amount with up to 6 places.`);
}

function isoDateField(label: string) {
  return z
    .string()
    .trim()
    .regex(datePattern, `${label} must be a YYYY-MM-DD date.`);
}

function isoDateTimeField(label: string) {
  return z.string().trim().min(1, `${label} must be a non-empty ISO date time.`);
}

const integrationProviderSchema = z.enum(["mercadolivre", "shopee"]);
const onboardingStatusSchema = z.enum(["complete", "organization_missing"]);
const billingStateStatusSchema = z.enum(["active", "inactive", "no_checkout", "pending_onboarding"]);
const syncAvailabilityReasonSchema = z.enum([
  "available",
  "outside_window",
  "provider_disconnected",
  "provider_needs_reconnect",
  "provider_sync_unsupported",
  "provider_unavailable",
  "sync_in_progress",
  "window_already_used",
]);
const syncWindowSlotSchema = z.enum(["morning", "afternoon", "evening"]).nullable();
const syncedProductReviewStatusSchema = z.enum([
  "ignored",
  "imported_as_internal_product",
  "linked_to_existing_product",
  "unreviewed",
]);
const syncedProductSuggestedMatchReasonSchema = z.enum(["sku_exact"]);
const productFinancialStateSchema = z.enum(["ready", "empty", "no-costs", "insufficient"]);
const productAnalyticsInsufficientReasonSchema = z.enum([
  "missing_cost",
  "missing_linked_marketplace_signal",
  "missing_sales_signal",
]);
const productAnalyticsDataGapSchema = z.enum([
  "packaging_cost_unavailable",
  "returns_unavailable",
  "shipping_cost_unavailable",
  "tax_amount_unavailable",
]);
const productAnalyticsDataSourceSchema = z.enum(["monthly_performance", "sync"]);

export const dashboardSummaryMetricsSchema = z.object({
  totalAdCosts: decimalField("Total ad costs"),
  totalCogs: decimalField("Total COGS"),
  totalFees: decimalField("Total fees"),
  totalManualExpenses: decimalField("Total manual expenses"),
  grossMarginPercent: decimalField("Gross margin percent"),
  grossRevenue: decimalField("Gross revenue"),
  netProfit: decimalField("Net profit"),
  netRevenue: decimalField("Net revenue"),
  contributionMargin: decimalField("Contribution margin"),
  breakEvenRevenue: decimalField("Break-even revenue"),
  breakEvenUnits: decimalField("Break-even units"),
  ordersCount: z.number().int().min(0),
  unitsSold: z.number().int().min(0),
  grossProfit: decimalField("Gross profit"),
  avgRoi: decimalField("Average ROI"),
  avgRoas: decimalField("Average ROAS"),
  totalReturns: z.number().int().min(0),
  avgTicket: decimalField("Average ticket"),
});

export const authenticatedOrganizationSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  role: z.string().trim().min(1),
});

export const authStateSchema = z.object({
  session: z.object({
    id: z.string().trim().min(1),
    expiresAt: isoDateTimeField("Session expires at"),
  }),
  user: z.object({
    id: z.string().trim().min(1),
    email: z.string().email(),
    name: z.string().trim().min(1),
    image: z.string().trim().min(1).nullable(),
    emailVerified: z.boolean(),
  }),
  organization: authenticatedOrganizationSchema.nullable(),
  onboardingStatus: onboardingStatusSchema,
});

export const billingPendingCheckoutSchema = z.object({
  id: z.string().trim().min(1),
  checkoutSessionId: z.string().trim().min(1),
  stripeCustomerId: z.string().trim().min(1).nullable(),
  stripeSubscriptionId: z.string().trim().min(1).nullable(),
  interval: z.string().trim().min(1),
  planCode: z.string().trim().min(1),
  status: z.string().trim().min(1),
});

export const billingStateSchema = z.object({
  organizationId: z.string().trim().min(1).nullable(),
  entitled: z.boolean(),
  status: billingStateStatusSchema,
  customer: z
    .object({
      externalCustomerId: z.string().trim().min(1),
      id: z.string().trim().min(1),
    })
    .nullable(),
  subscription: z
    .object({
      cancelAtPeriodEnd: z.boolean(),
      currentPeriodEnd: isoDateTimeField("Current period end").nullable(),
      currentPeriodStart: isoDateTimeField("Current period start").nullable(),
      externalSubscriptionId: z.string().trim().min(1).nullable(),
      id: z.string().trim().min(1),
      interval: z.string().trim().min(1),
      planCode: z.string().trim().min(1),
      status: z.string().trim().min(1),
    })
    .nullable(),
  pendingCheckout: billingPendingCheckoutSchema.nullable(),
});

export const createOrganizationOnboardingSchema = z.object({
  name: z.string().trim().min(2).max(255),
  slug: z.string().trim().min(2).max(120).nullable().optional(),
});

export const completeOnboardingResponseSchema = z.object({
  organization: authenticatedOrganizationSchema,
  billing: billingStateSchema,
});

export const dashboardSummaryCardSchema = z.object({
  label: z.string().trim().min(1),
  value: z.union([z.string(), z.number()]),
  tone: z.enum(["default", "positive", "warning"]),
  helperText: z.string().trim().min(1),
});

export const dashboardChannelProfitabilityRowSchema = z.object({
  channel: z.string().trim().min(1),
  summary: dashboardSummaryMetricsSchema,
});

export const dashboardSummaryResponseSchema = z.object({
  summary: dashboardSummaryMetricsSchema,
  cards: z.array(dashboardSummaryCardSchema),
});

export const dashboardChartPointSchema = z.object({
  metricDate: isoDateField("Metric date"),
  grossRevenue: z.number(),
  netProfit: z.number(),
  unitsSold: z.number().int().min(0),
  ordersCount: z.number().int().min(0),
});

export const dashboardChannelChartRowSchema = z.object({
  channel: z.string().trim().min(1),
  grossRevenue: z.number(),
  netProfit: z.number(),
  unitsSold: z.number().int().min(0),
});

export const dashboardChartsResponseSchema = z.object({
  daily: z.array(dashboardChartPointSchema),
  channels: z.array(dashboardChannelChartRowSchema),
});

export const syncImportCountsSchema = z.object({
  orders: z.number().int().min(0),
  products: z.number().int().min(0),
  items: z.number().int().min(0),
  fees: z.number().int().min(0),
});

export const syncAvailabilitySchema = z.object({
  provider: integrationProviderSchema,
  canRun: z.boolean(),
  reason: syncAvailabilityReasonSchema,
  message: z.string().trim().min(1),
  currentWindowKey: z.string().trim().min(1).nullable(),
  currentWindowLabel: z.string().trim().min(1).nullable(),
  currentWindowSlot: syncWindowSlotSchema,
  nextAvailableAt: z.string().trim().min(1).nullable(),
  lastSuccessfulSyncAt: z.string().trim().min(1).nullable(),
});

export const syncRunRecordSchema = z.object({
  id: z.string().trim().min(1),
  provider: integrationProviderSchema,
  status: z.string().trim().min(1),
  windowKey: z.string().trim().min(1).nullable(),
  startedAt: z.string().trim().min(1).nullable(),
  finishedAt: z.string().trim().min(1).nullable(),
  createdAt: isoDateTimeField("Created at"),
  updatedAt: isoDateTimeField("Updated at"),
  errorSummary: z.string().trim().min(1).nullable(),
  counts: syncImportCountsSchema,
  cursor: z.record(z.string(), z.unknown()).nullable(),
});

export const dashboardRecentSyncResponseSchema = z.object({
  activeRun: syncRunRecordSchema.nullable(),
  availability: syncAvailabilitySchema,
  lastCompletedRun: syncRunRecordSchema.nullable(),
});

export const dashboardProductProfitabilityRowSchema = z.object({
  productId: z.string().trim().min(1),
  productName: z.string().trim().min(1),
  sku: z.string().trim().min(1).nullable(),
  channel: z.string().trim().min(1),
  summary: dashboardSummaryMetricsSchema,
  sales: z.number().int().min(0),
  returns: z.number().int().min(0),
  netSales: z.number().int().min(0),
  salePrice: decimalField("Sale price"),
  revenue: decimalField("Revenue"),
  marketplaceCommission: decimalField("Marketplace commission"),
  shippingCost: decimalField("Shipping cost"),
  taxAmount: decimalField("Tax amount"),
  packagingCost: decimalField("Packaging cost"),
  productCost: decimalField("Product cost"),
  adSpend: decimalField("Ad spend"),
  grossProfit: decimalField("Gross profit"),
  roi: decimalField("ROI"),
  roas: decimalField("ROAS"),
  margin: decimalField("Margin"),
});

export const dashboardProfitabilityResponseSchema = z.object({
  channels: z.array(dashboardChannelProfitabilityRowSchema),
  products: z.array(dashboardProductProfitabilityRowSchema),
});

export const productCostRecordSchema = z.object({
  id: z.string().trim().min(1),
  organizationId: z.string().trim().min(1),
  productId: z.string().trim().min(1),
  costType: z.string().trim().min(1),
  amount: decimalField("Product cost amount"),
  currency: z.string().trim().min(1),
  effectiveFrom: isoDateField("Effective from").nullable(),
  notes: z.string().nullable(),
  createdAt: isoDateTimeField("Created at"),
  updatedAt: isoDateTimeField("Updated at"),
});

export const companyRecordSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  code: z.string().trim().min(1),
  isActive: z.boolean(),
  createdAt: isoDateTimeField("Created at"),
  updatedAt: isoDateTimeField("Updated at"),
});

export const productListItemSchema = z.object({
  id: z.string().trim().min(1),
  organizationId: z.string().trim().min(1),
  name: z.string().trim().min(1),
  sku: z.string().trim().min(1).nullable(),
  sellingPrice: decimalField("Selling price"),
  isActive: z.boolean(),
  createdAt: isoDateTimeField("Created at"),
  updatedAt: isoDateTimeField("Updated at"),
  latestCost: productCostRecordSchema.nullable(),
});

export const adCostRecordSchema = z.object({
  id: z.string().trim().min(1),
  organizationId: z.string().trim().min(1),
  productId: z.string().trim().min(1).nullable(),
  channel: z.string().trim().min(1),
  amount: decimalField("Ad cost amount"),
  currency: z.string().trim().min(1),
  spentAt: isoDateField("Spent at").nullable(),
  notes: z.string().nullable(),
  createdAt: isoDateTimeField("Created at"),
  updatedAt: isoDateTimeField("Updated at"),
});

export const manualExpenseRecordSchema = z.object({
  id: z.string().trim().min(1),
  organizationId: z.string().trim().min(1),
  category: z.string().trim().min(1),
  amount: decimalField("Expense amount"),
  currency: z.string().trim().min(1),
  incurredAt: isoDateField("Incurred at").nullable(),
  notes: z.string().nullable(),
  createdAt: isoDateTimeField("Created at"),
  updatedAt: isoDateTimeField("Updated at"),
});

export const syncedProductSuggestedMatchSchema = z.object({
  productId: z.string().trim().min(1),
  name: z.string().trim().min(1),
  sku: z.string().trim().min(1).nullable(),
  isActive: z.boolean(),
  reason: syncedProductSuggestedMatchReasonSchema,
});

export const syncedProductLinkedProductSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  sku: z.string().trim().min(1).nullable(),
  isActive: z.boolean(),
});

export const syncedProductRecordSchema = z.object({
  id: z.string().trim().min(1),
  externalProductId: z.string().trim().min(1),
  provider: integrationProviderSchema,
  title: z.string().nullable(),
  sku: z.string().trim().min(1).nullable(),
  reviewStatus: syncedProductReviewStatusSchema,
  linkedProduct: syncedProductLinkedProductSchema.nullable(),
  suggestedMatches: z.array(syncedProductSuggestedMatchSchema),
  orderCount: z.number().int().min(0),
  unitsSold: z.number().int().min(0),
  grossRevenue: decimalField("Synced product gross revenue"),
  marketplaceCommission: decimalField("Synced product marketplace commission"),
  fixedFee: decimalField("Synced product fixed fee"),
  shippingCost: decimalField("Synced product shipping cost"),
  netMarketplaceTake: decimalField("Synced product net marketplace take"),
  latestUnitPrice: decimalField("Latest unit price").nullable(),
  lastOrderedAt: z.string().trim().min(1).nullable(),
});

export const productAnalyticsRowSchema = z.object({
  productId: z.string().trim().min(1),
  name: z.string().trim().min(1),
  sku: z.string().trim().min(1).nullable(),
  isActive: z.boolean(),
  channel: z.string().trim().min(1),
  sales: z.number().int().min(0),
  returns: z.number().int().min(0),
  netSales: z.number().int().min(0),
  salePrice: decimalField("Sale price"),
  revenue: decimalField("Revenue"),
  marketplaceCommission: decimalField("Marketplace commission"),
  shippingCost: decimalField("Shipping cost"),
  taxAmount: decimalField("Tax amount"),
  packagingCost: decimalField("Packaging cost"),
  productCost: decimalField("Product cost"),
  adSpend: decimalField("Ad spend"),
  grossProfit: decimalField("Gross profit"),
  contributionMargin: decimalField("Contribution margin"),
  unitProfit: decimalField("Unit profit"),
  totalProfit: decimalField("Total profit"),
  margin: decimalField("Margin"),
  roi: decimalField("ROI"),
  actualRoas: decimalField("Actual ROAS"),
  minimumRoas: decimalOrInfinityField("Minimum ROAS"),
  hasCost: z.boolean(),
  hasSalesSignal: z.boolean(),
  hasLinkedMarketplaceSignal: z.boolean(),
  insufficientReasons: z.array(productAnalyticsInsufficientReasonSchema),
  dataSource: productAnalyticsDataSourceSchema,
});

export const productMonthlyPerformanceRowSchema = z.object({
  referenceMonth: isoDateField("Reference month"),
  channel: z.string().trim().min(1),
  productName: z.string().trim().min(1),
  sku: z.string().trim().min(1),
  salesQuantity: z.number().int().min(0),
  returnsQuantity: z.number().int().min(0),
  unitCost: decimalField("Unit cost"),
  salePrice: decimalField("Sale price"),
  commissionRate: decimalRateField("Commission rate"),
  shippingFee: decimalField("Shipping fee"),
  taxRate: decimalRateField("Tax rate"),
  packagingCost: decimalField("Packaging cost"),
  advertisingCost: decimalField("Advertising cost"),
});

export const productAnalyticsCatalogStatsSchema = z.object({
  totalProducts: z.number().int().min(0),
  activeProducts: z.number().int().min(0),
  archivedProducts: z.number().int().min(0),
  productsWithCost: z.number().int().min(0),
  productsWithoutCost: z.number().int().min(0),
  pendingSyncProducts: z.number().int().min(0),
  syncedProductsTotal: z.number().int().min(0),
  totalProductCosts: z.number().min(0),
  totalAdCosts: z.number().min(0),
  totalManualExpenses: z.number().min(0),
});

export const productAnalyticsSnapshotSchema = z.object({
  adCosts: z.array(adCostRecordSchema),
  manualExpenses: z.array(manualExpenseRecordSchema),
  productCosts: z.array(productCostRecordSchema),
  products: z.array(productListItemSchema),
  syncedProducts: z.array(syncedProductRecordSchema),
  mercadoLivreSyncStatus: dashboardRecentSyncResponseSchema,
  productRows: z.array(productAnalyticsRowSchema),
  monthlyPerformanceRows: z.array(productMonthlyPerformanceRowSchema),
  catalogStats: productAnalyticsCatalogStatsSchema,
  financialState: productFinancialStateSchema,
  dataGaps: z.array(productAnalyticsDataGapSchema),
  scope: z.object({
    companyId: z.string().trim().min(1).nullable(),
    companyRequired: z.boolean(),
    referenceMonth: isoDateField("Reference month"),
  }),
});

export function createApiSuccessResponseSchema<T extends z.ZodType>(dataSchema: T) {
  return z.object({
    data: dataSchema,
    error: z.null(),
  });
}

export const dashboardSummaryApiResponseSchema = createApiSuccessResponseSchema(
  dashboardSummaryResponseSchema,
);
export const authStateApiResponseSchema = createApiSuccessResponseSchema(authStateSchema);
export const billingStateApiResponseSchema = createApiSuccessResponseSchema(billingStateSchema);
export const dashboardChartsApiResponseSchema = createApiSuccessResponseSchema(
  dashboardChartsResponseSchema,
);
export const dashboardRecentSyncApiResponseSchema = createApiSuccessResponseSchema(
  dashboardRecentSyncResponseSchema,
);
export const dashboardProfitabilityApiResponseSchema = createApiSuccessResponseSchema(
  dashboardProfitabilityResponseSchema,
);
export const productAnalyticsSnapshotApiResponseSchema = createApiSuccessResponseSchema(
  productAnalyticsSnapshotSchema,
);
export const completeOnboardingApiResponseSchema = createApiSuccessResponseSchema(
  completeOnboardingResponseSchema,
);
export const companiesApiResponseSchema = createApiSuccessResponseSchema(z.array(companyRecordSchema));

export type AuthStateInput = z.infer<typeof authStateSchema>;
export type BillingStateInput = z.infer<typeof billingStateSchema>;
export type DashboardSummaryResponseInput = z.infer<typeof dashboardSummaryResponseSchema>;
export type DashboardChartsResponseInput = z.infer<typeof dashboardChartsResponseSchema>;
export type DashboardRecentSyncResponseInput = z.infer<typeof dashboardRecentSyncResponseSchema>;
export type DashboardProfitabilityResponseInput = z.infer<typeof dashboardProfitabilityResponseSchema>;
export type ProductAnalyticsSnapshotInput = z.infer<typeof productAnalyticsSnapshotSchema>;
export type CompleteOnboardingResponseInput = z.infer<typeof completeOnboardingResponseSchema>;
