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
  sku: string | null;
  channelLabel: string;
  sales: number;
  returns: number;
  netSales: number;
  revenue: number;
  averageTicket: number;
  commission: number;
  shipping: number;
  tax: number;
  productCost: number;
  packagingCost: number;
  totalCost: number;
  adSpend: number;
  roas: number | null;
  profit: number;
  margin: number;
  roi: number | null;
  health: "critical" | "attention" | "neutral" | "healthy" | "scalable";
  isActive: boolean;
  sellingPrice: number;
  latestCost: number | null;
};

export type PaginationState = {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
};

export type { ProductFinancialState };
