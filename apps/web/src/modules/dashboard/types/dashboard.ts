import type {
  DashboardChartsResponse,
  DashboardProfitabilityResponse,
  DashboardRecentSyncResponse,
  DashboardSummaryResponse,
} from "@marginflow/types";

export type DashboardPeriod = "7d" | "30d" | "90d" | "12m";

export type DashboardBusinessStatus = "healthy" | "attention" | "review";

export type DashboardFinancialState = "ready" | "sync" | "catalog" | "insufficient";

export type ProductHealthStatus =
  | "critical"
  | "attention"
  | "neutral"
  | "healthy"
  | "scalable";

export type DashboardQueryBundle = {
  summary: DashboardSummaryResponse | undefined;
  charts: DashboardChartsResponse | undefined;
  recentSync: DashboardRecentSyncResponse | undefined;
  profitability: DashboardProfitabilityResponse | undefined;
};

export type DashboardKpiTone = "default" | "accent" | "success" | "warning";

export type DashboardKpiTrendDirection = "up" | "down" | "neutral";

export type DashboardKpiItem = {
  key: string;
  label: string;
  value: string;
  icon: "revenue" | "profit" | "margin" | "ads" | "orders" | "units" | "critical" | "channel" | "roi" | "roas";
  variant: DashboardKpiTone;
  helperText?: string;
  trend?: {
    direction: DashboardKpiTrendDirection;
    value: string;
    label?: string;
  };
};

// Extended product row with all 18 columns
export type DashboardProductDetailRow = {
  id: string;
  name: string;
  sku: string | null;
  channelLabel: string;
  // Sales metrics
  sales: number; // Vendas brutas (unidades)
  returns: number; // Devoluções
  netSales: number; // Vendas líquidas
  // Financial metrics
  revenue: number; // Receita
  averageTicket: number; // Ticket médio
  // Cost breakdown
  commission: number; // Comissão marketplace
  shipping: number; // Frete
  tax: number; // Imposto
  productCost: number; // Custo do produto
  packagingCost: number; // Custo de embalagem
  totalCost: number; // Soma de todos os custos
  // Ads metrics
  adSpend: number; // Investimento em ads
  roas: number | null; // ROAS
  // Profitability
  profit: number; // Lucro bruto
  margin: number; // Margem percentual
  roi: number | null; // ROI percentual
  // Health status
  health: ProductHealthStatus;
};

// Legacy type for backward compatibility
export type DashboardProductRow = DashboardProductDetailRow;

export type DashboardInsight = {
  id: string;
  type: "growth" | "alert" | "tip" | "info" | "ai";
  title: string;
  description: string;
  priority?: "high" | "medium" | "low";
  href?: string;
  actionLabel?: string;
};
