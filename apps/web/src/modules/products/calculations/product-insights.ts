import type {
  ProductAnalyticsRow,
  ProductFinancialState,
} from "@marginflow/types";
import { parseProtectedNumber } from "@/lib/protected-numbers";
import type {
  ProductCatalogData,
  ProductInsight,
  CatalogStats,
  ProductTableRow,
} from "../types/products";

function toNumber(value: string) {
  return parseProtectedNumber(value, { allowInfinity: true }) ?? 0;
}

function calculateHealth(row: ProductAnalyticsRow): ProductTableRow["health"] {
  const margin = toNumber(row.margin);
  const roi = toNumber(row.roi);
  const roas = toNumber(row.actualRoas);
  const profit = toNumber(row.totalProfit);

  if (!row.hasSalesSignal) {
    return "attention";
  }

  if (profit < 0 || margin < 0) {
    return "critical";
  }

  if (margin >= 40 && roi >= 100 && roas >= 3) {
    return "scalable";
  }

  if (margin >= 25 && roi >= 50) {
    return "healthy";
  }

  if (margin >= 15) {
    return "neutral";
  }

  return "attention";
}

export function buildCatalogStats(data: ProductCatalogData): CatalogStats {
  return data.catalogStats;
}

export function buildProductInsights(
  data: ProductCatalogData,
  stats: CatalogStats,
): ProductInsight[] {
  const insights: ProductInsight[] = [];

  if (stats.productsWithoutCost > 0) {
    insights.push({
      actionLabel: "Cadastrar custos",
      description:
        "Produtos ativos sem custo cadastrado nao geram metricas de lucratividade precisas.",
      href: "/app/products",
      id: "products-without-cost",
      priority: "high",
      title: `${stats.productsWithoutCost} produto${stats.productsWithoutCost > 1 ? "s" : ""} sem custo`,
      type: "alert",
    });
  }

  if (stats.pendingSyncProducts > 0) {
    insights.push({
      actionLabel: "Revisar",
      actionKey: "open-synced-review",
      description:
        "Revise os produtos sincronizados do Mercado Livre para importar ou vincular ao catalogo.",
      href: "/app/products",
      id: "pending-sync",
      priority: "medium",
      title: `${stats.pendingSyncProducts} pendente${stats.pendingSyncProducts > 1 ? "s" : ""} de revisao`,
      type: "tip",
    });
  }

  const negativeProfitProducts = data.productRows.filter((row) => toNumber(row.totalProfit) < 0);

  if (negativeProfitProducts.length > 0) {
    insights.push({
      actionLabel: "Revisar rentabilidade",
      description: "Alguns produtos ja possuem sinal real de prejuizo e precisam de atencao.",
      href: "/app/products",
      id: "negative-profit",
      priority: "high",
      title: `${negativeProfitProducts.length} produto${negativeProfitProducts.length > 1 ? "s" : ""} com prejuizo`,
      type: "alert",
    });
  }

  const healthyRows = data.productRows.filter(
    (row) => row.hasSalesSignal && row.insufficientReasons.length === 0,
  );

  if (
    healthyRows.length > 0 &&
    stats.productsWithoutCost === 0 &&
    stats.pendingSyncProducts === 0 &&
    negativeProfitProducts.length === 0
  ) {
    insights.push({
      description: "Os principais produtos com sinal real estao com custo, vinculo e margem saudavel.",
      id: "healthy-catalog",
      priority: "low",
      title: "Catalogo saudavel",
      type: "growth",
    });
  }

  if (stats.syncedProductsTotal === 0 && stats.totalProducts > 0) {
    insights.push({
      actionLabel: "Conectar",
      description:
        "Conecte sua conta do Mercado Livre para enriquecer a lucratividade com sinal operacional real.",
      href: "/app/integrations",
      id: "no-sync",
      priority: "medium",
      title: "Conecte o Mercado Livre",
      type: "tip",
    });
  }

  return insights.slice(0, 4);
}

export function buildProductTableRows(data: ProductCatalogData): ProductTableRow[] {
  const productById = new Map(data.products.map((product) => [product.id, product] as const));

  return data.productRows.map((row) => {
    const product = productById.get(row.productId);
    const revenue = toNumber(row.revenue);
    const commission = toNumber(row.marketplaceCommission);
    const shipping = toNumber(row.shippingCost);
    const tax = toNumber(row.taxAmount);
    const productCost = toNumber(row.productCost);
    const packagingCost = toNumber(row.packagingCost);
    const adSpend = toNumber(row.adSpend);
    const profit = toNumber(row.totalProfit);
    const netSales = row.netSales;

    return {
      adSpend,
      averageTicket: netSales > 0 ? revenue / netSales : toNumber(row.salePrice),
      channelLabel: row.channel,
      commission,
      health: calculateHealth(row),
      id: row.productId,
      isActive: row.isActive,
      latestCost: product?.latestCost ? Number(product.latestCost.amount) : null,
      margin: toNumber(row.margin),
      name: row.name,
      netSales,
      packagingCost,
      productCost,
      profit,
      returns: row.returns,
      revenue,
      roi: toNumber(row.roi),
      roas: toNumber(row.actualRoas),
      sales: row.sales,
      sellingPrice: toNumber(row.salePrice),
      shipping,
      sku: row.sku,
      tax,
      totalCost: productCost + packagingCost + commission + shipping + tax + adSpend,
    };
  });
}

export function determineFinancialState(
  data: ProductCatalogData,
): ProductFinancialState {
  return data.financialState;
}

const productDataGapLabels: Record<string, string> = {
  packaging_cost_unavailable: "embalagem",
  returns_unavailable: "devolucoes",
  shipping_cost_unavailable: "frete",
  tax_amount_unavailable: "impostos",
};

export function buildProductCoverageNote(data: ProductCatalogData | null | undefined) {
  if (!data || data.dataGaps.length === 0) {
    return null;
  }

  const labels = data.dataGaps
    .map((gap) => productDataGapLabels[gap])
    .filter((label): label is string => Boolean(label));

  if (labels.length === 0) {
    return null;
  }

  return `Cobertura parcial do snapshot atual: ${labels.join(", ")} ainda aparecem como zero explicito quando a fonte operacional nao existe.`;
}
