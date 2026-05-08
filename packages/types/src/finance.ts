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
  // Extended metrics for dashboard KPIs
  grossProfit: DecimalString; // Lucro bruto total
  avgRoi: DecimalString | null; // ROI médio ponderado
  avgRoas: DecimalString | null; // ROAS médio ponderado
  totalReturns: number; // Total de devoluções
  avgTicket: DecimalString | null; // Ticket médio
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
  channel: string;
  summary: DashboardSummaryMetrics;
  // Detailed metrics for expanded table
  sales: number; // Vendas brutas (unidades)
  returns: number; // Devoluções (unidades)
  netSales: number; // Vendas líquidas (sales - returns)
  salePrice: DecimalString; // Preço de venda unitário
  revenue: DecimalString; // Receita (salePrice * netSales)
  marketplaceCommission: DecimalString; // Comissão do marketplace
  shippingCost: DecimalString; // Frete
  taxAmount: DecimalString; // Imposto
  packagingCost: DecimalString; // Custo de embalagem
  productCost: DecimalString; // Custo do produto
  adSpend: DecimalString; // Investimento em ADS
  grossProfit: DecimalString; // Lucro bruto
  roi: DecimalString | null; // ROI (grossProfit / productCost)
  roas: DecimalString | null; // ROAS (revenue / adSpend)
  margin: DecimalString; // Margem percentual (grossProfit / revenue)
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
