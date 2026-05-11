import type { DecimalString } from "./products";

export type DashboardSummaryMetrics = {
  totalAdCosts: DecimalString;
  totalCogs: DecimalString;
  totalFees: DecimalString;
  totalManualExpenses: DecimalString;
  grossMarginPercent: DecimalString; // Margem media oficial do dashboard, ponderada por receita
  grossRevenue: DecimalString; // Receita bruta total
  netProfit: DecimalString; // Lucro liquido apos ads e despesas manuais
  netRevenue: DecimalString; // Receita liquida apos descontos/refundos conhecidos
  contributionMargin: DecimalString; // Lucro apos fees, COGS e ads, antes de despesas manuais
  breakEvenRevenue: DecimalString; // Receita de equilibrio com a contribuicao atual
  breakEvenUnits: DecimalString; // Unidades de equilibrio com a contribuicao atual
  ordersCount: number;
  unitsSold: number;
  grossProfit: DecimalString; // Lucro bruto antes de ads e despesas manuais
  avgRoi: DecimalString; // ROI medio agregado do catalogo
  avgRoas: DecimalString; // ROAS medio agregado do catalogo
  totalReturns: number; // Total de devolucoes conhecidas no periodo
  avgTicket: DecimalString; // Ticket medio por pedido no periodo
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
  sales: number; // Vendas brutas (unidades)
  returns: number; // Devolucoes (unidades)
  netSales: number; // Vendas liquidas (sales - returns)
  salePrice: DecimalString; // Preco medio unitario efetivo
  revenue: DecimalString; // Receita do produto no periodo
  marketplaceCommission: DecimalString; // Fees de marketplace alocadas ao produto
  shippingCost: DecimalString; // Frete explicitamente conhecido
  taxAmount: DecimalString; // Imposto explicitamente conhecido
  packagingCost: DecimalString; // Custo de embalagem explicitamente conhecido
  productCost: DecimalString; // Custo total do produto vendido
  adSpend: DecimalString; // Investimento em ads alocado ao produto
  grossProfit: DecimalString; // Lucro bruto do produto
  roi: DecimalString; // ROI do produto
  roas: DecimalString; // ROAS do produto
  margin: DecimalString; // Margem percentual do produto
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
