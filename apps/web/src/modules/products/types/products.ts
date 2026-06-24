import type {
  ProductAnalyticsCatalogStats,
  ProductAnalyticsSnapshot,
  ProductFinancialState,
} from "@lucreii/types";

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

export type ProductMarketplaceNotice = {
  id: string;
  title: string;
  description: string;
  tone: "alert" | "info" | "success";
  actionLabel?: string;
  href?: string;
  actionKey?: "open-synced-review";
};

export type ProductTableRow = {
  id: string;
  productId: string | null;
  performanceId: string;
  catalogGroupKey: string | null;
  catalogRole: "parent" | "child" | "standalone";
  children: ProductTableRow[];
  name: string;
  displayName: string;
  parentProductId: string | null;
  variationLabel: string | null;
  sku: string;
  isActive: boolean;
  coverImageUrl: string | null;
  channelLabel: string;
  sales: number;
  returns: number;
  /** Venda líquida: vendas − devoluções (devoluções limitadas às vendas) */
  netLiquidSales: number;
  unitCost: number;
  sellingPrice: number;
  commissionPct: number;
  shipping: number;
  marketplaceCommissionUnit?: number;
  fixedFeeUnit?: number;
  shippingUnit?: number;
  shippingOrFixedFeeUnit?: number;
  shippingOrFixedFeeSource?: "shipping" | "fixed_fee" | "none";
  taxPct: number;
  packagingCost: number;
  /** Embalagem total: packagingCost × netLiquidSales */
  totalPackagingCost: number;
  adSpend: number;
  advertisingCost: number;
  /** PDV × venda líquida */
  revenue: number;
  /** Comissão total: marketplaceCommission × netLiquidSales */
  totalCommission: number;
  /** Contribution-style profit without advertising (formula from ops sheet) */
  totalProfit: number;
  /** Custo do produto total: unitCost × netLiquidSales */
  totalProductCost: number;
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
