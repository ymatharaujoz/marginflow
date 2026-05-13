import type {
  ProductAnalyticsCatalogStats,
  ProductAnalyticsSnapshot,
  ProductFinancialState,
} from "@marginflow/types";

export type ProductCatalogData = ProductAnalyticsSnapshot;

export type ProductInsight = {
  id: string;
  type: "growth" | "alert" | "tip" | "info" | "ai";
  title: string;
  description: string;
  priority?: "high" | "medium" | "low";
  href?: string;
  actionLabel?: string;
  actionKey?: "open-synced-review";
};

export type CatalogStats = ProductAnalyticsCatalogStats;

export type ProductTableRow = {
  id: string;
  name: string;
  sku: string;
  channelLabel: string;
  sales: number;
  returns: number;
  /** Venda líquida: vendas − devoluções (devoluções limitadas às vendas) */
  netLiquidSales: number;
  unitCost: number;
  sellingPrice: number;
  commissionPct: number;
  shipping: number;
  taxPct: number;
  packagingCost: number;
  adSpend: number;
  /** PDV × venda líquida */
  revenue: number;
  /** Contribution-style profit without advertising (formula from ops sheet) */
  totalProfit: number;
  /** totalProfit ÷ netLiquidSales (null if no units) */
  unitProfit: number | null;
  /** unitProfit ÷ PDV (null if PDV = 0 or no unit profit context) */
  contributionMarginRatio: number | null;
  /** unitProfit ÷ unitCost (null if cost = 0 or no unit profit context) */
  roiRatio: number | null;
  /** 1 ÷ contributionMarginRatio (null if ratio ≤ 0) */
  minimumRoas: number | null;
  /** revenue ÷ ad spend (null if no ad spend) */
  actualRoas: number | null;
  referenceMonth: string;
};

export type PaginationState = {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
};

export type { ProductFinancialState };
