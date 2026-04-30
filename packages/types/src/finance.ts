import type { DecimalString } from "./products";

export type DashboardSummaryMetrics = {
  totalAdCosts: DecimalString;
  totalCogs: DecimalString;
  totalFees: DecimalString;
  totalManualExpenses: DecimalString;
  grossMarginPercent: DecimalString;
  grossRevenue: DecimalString;
  netProfit: DecimalString;
  netRevenue: DecimalString;
  contributionMargin: DecimalString;
  breakEvenRevenue: DecimalString;
  breakEvenUnits: DecimalString;
  ordersCount: number;
  unitsSold: number;
};

export type DashboardDailyMetricPoint = {
  metricDate: string;
  ordersCount: number;
  summary: DashboardSummaryMetrics;
};

export type DashboardProductProfitabilityRow = {
  productId: string;
  productName: string;
  sku: string | null;
  summary: DashboardSummaryMetrics;
};

export type DashboardChannelProfitabilityRow = {
  channel: string;
  summary: DashboardSummaryMetrics;
};

export type DashboardProductMetricRow = {
  metricDate: string;
  productId: string;
  productName: string;
  sku: string | null;
  summary: DashboardSummaryMetrics;
};

export type DashboardReadModel = {
  channels: DashboardChannelProfitabilityRow[];
  daily: DashboardDailyMetricPoint[];
  products: DashboardProductMetricRow[];
  productProfitability: DashboardProductProfitabilityRow[];
  summary: DashboardSummaryMetrics;
};

export type DashboardSummaryCard = {
  label: string;
  value: string | number;
  tone: "default" | "positive" | "warning";
  helperText: string;
};

export type DashboardSummaryResponse = {
  summary: DashboardSummaryMetrics;
  cards: DashboardSummaryCard[];
};

export type DashboardChartPoint = {
  metricDate: string;
  grossRevenue: number;
  netProfit: number;
  unitsSold: number;
  ordersCount: number;
};

export type DashboardChannelChartRow = {
  channel: string;
  grossRevenue: number;
  netProfit: number;
  unitsSold: number;
};

export type DashboardChartsResponse = {
  daily: DashboardChartPoint[];
  channels: DashboardChannelChartRow[];
};

export type DashboardRecentSyncResponse = {
  activeRun: import("./sync").SyncRunRecord | null;
  availability: import("./sync").SyncAvailability;
  lastCompletedRun: import("./sync").SyncRunRecord | null;
};

export type DashboardProfitabilityResponse = {
  channels: DashboardChannelProfitabilityRow[];
  products: DashboardProductProfitabilityRow[];
};
