import type {
  ProductAnalyticsRow,
  ProductFinancialState,
  ProductMonthlyPerformanceDisplayRow,
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

function resolveNetLiquidSales(salesQuantity: number, returnsQuantity: number): number {
  const sales = Math.max(0, salesQuantity);
  const cappedReturns = Math.max(0, Math.min(returnsQuantity, sales));
  return Math.max(0, sales - cappedReturns);
}

function deriveRowFinancials(row: ProductMonthlyPerformanceDisplayRow): {
  netLiquidSales: number;
  revenue: number;
  totalProfit: number;
  unitProfit: number | null;
  contributionMarginRatio: number | null;
  roiRatio: number | null;
  minimumRoas: number | null;
  actualRoas: number | null;
} {
  const netLiquidSales = resolveNetLiquidSales(row.salesQuantity, row.returnsQuantity);

  const sellingPrice = toNumber(row.salePrice);
  const commissionRate = toNumber(row.commissionRate);
  const shippingFee = toNumber(row.shippingFee);
  const taxRate = toNumber(row.taxRate);
  const packagingCost = toNumber(row.packagingCost);
  const unitCost = toNumber(row.unitCost);
  const advertising = toNumber(row.advertisingCost);

  const revenue = sellingPrice * netLiquidSales;

  const totalProfit =
    revenue
    - revenue * commissionRate
    - shippingFee * netLiquidSales
    - revenue * taxRate
    - packagingCost * netLiquidSales
    - unitCost * netLiquidSales;

  const unitProfit = netLiquidSales > 0 ? totalProfit / netLiquidSales : null;
  const contributionMarginRatio =
    unitProfit !== null && sellingPrice > 0 ? unitProfit / sellingPrice : null;
  const roiRatio = unitProfit !== null && unitCost > 0 ? unitProfit / unitCost : null;
  const minimumRoas =
    contributionMarginRatio !== null && contributionMarginRatio > 0
      ? 1 / contributionMarginRatio
      : null;
  const actualRoas = advertising > 0 ? revenue / advertising : null;

  return {
    actualRoas,
    contributionMarginRatio,
    minimumRoas,
    netLiquidSales,
    revenue,
    roiRatio,
    totalProfit,
    unitProfit,
  };
}

function getProductId(row: { name: string; sku: string | null }): string {
  return row.sku?.trim() ? row.sku : row.name;
}

function resolveMinimumRoas(row: ProductAnalyticsRow): number | null {
  const contribution = parseProtectedNumber(row.contributionMargin) ?? 0;
  if (contribution <= 0) return null;
  const raw = parseProtectedNumber(row.minimumRoas, { allowInfinity: true });
  if (raw === null || raw === Number.POSITIVE_INFINITY || !Number.isFinite(raw)) return null;
  return raw;
}

export function buildCatalogStats(data: ProductCatalogData): CatalogStats {
  return data.catalogStats;
}

export function buildProductInsights(
  data: ProductCatalogData,
  stats: CatalogStats,
  rows: ProductTableRow[],
): ProductInsight[] {
  const insights: ProductInsight[] = [];

  // Agregar métricas
  let totalRevenue = 0;
  let totalAdSpend = 0;

  const productMetrics: Array<{
    id: string;
    name: string;
    sku: string;
    profit: number;
    shipping: number;
    adSpend: number;
    roas: number | null;
  }> = [];

  for (const row of rows) {
    totalRevenue += row.revenue;
    totalAdSpend += row.adSpend;

    productMetrics.push({
      id: row.id,
      name: row.name,
      sku: row.sku,
      profit: row.totalProfit,
      shipping: row.shipping,
      adSpend: row.adSpend,
      roas: row.actualRoas,
    });
  }

  const overallRoas = totalAdSpend > 0 ? totalRevenue / totalAdSpend : null;

  // Ordenar por lucro (crescente e decrescente)
  const byProfitDesc = [...productMetrics].sort((a, b) => b.profit - a.profit);
  const byProfitAsc = [...productMetrics].sort((a, b) => a.profit - b.profit);

  // Ordenar por ROAS (apenas produtos com investimento significativo em ads e ROAS válido)
  const byRoasDesc = [...productMetrics]
    .filter((p) => p.adSpend > 10 && p.roas !== null && p.roas > 0 && p.roas < 50 && Number.isFinite(p.roas))
    .sort((a, b) => (b.roas ?? 0) - (a.roas ?? 0));

  // ===== INSIGHT 1: Produto com maior lucro =====
  if (byProfitDesc.length > 0) {
    const bestProduct = byProfitDesc[0];
    if (bestProduct.profit > 0) {
      insights.push({
        description: `${bestProduct.name} (${bestProduct.sku}) gerou ${formatMoney(bestProduct.profit)} de lucro. Maior lucro do catálogo.`,
        href: "/app/products",
        id: "best-profit-product",
        priority: "medium",
        title: "Maior lucro",
        type: "growth",
      });
    }
  }

  // ===== INSIGHT 2: Produto com frete mais caro =====
  const byShippingDesc = [...productMetrics]
    .filter((p) => p.shipping > 0)
    .sort((a, b) => b.shipping - a.shipping);

  if (byShippingDesc.length > 0) {
    const highestShippingProduct = byShippingDesc[0];

    insights.push({
      description: `${highestShippingProduct.name} (${highestShippingProduct.sku}) tem o frete mais caro.`,
      href: "/app/products",
      id: "highest-shipping-product",
      priority: "medium",
      title: "Frete mais caro",
      type: "alert",
    });
  }

  // ===== INSIGHT 3: Produto com publicidade mais eficiente =====
  if (byRoasDesc.length > 0) {
    const bestRoasProduct = byRoasDesc[0];
    const roasValue = bestRoasProduct.roas ?? 0;
    const revenueFromAds = bestRoasProduct.adSpend * roasValue;

    let roasLabel = "";
    if (roasValue >= 5) roasLabel = "excelente";
    else if (roasValue >= 3) roasLabel = "muito boa";
    else if (roasValue >= 2) roasLabel = "boa";
    else roasLabel = "baixa";

    insights.push({
      description: `${bestRoasProduct.name} (${bestRoasProduct.sku}): ROAS de ${roasValue.toFixed(1)}x (${roasLabel}). Investiu ${formatMoney(bestRoasProduct.adSpend)} e retornou ${formatMoney(revenueFromAds)}.`,
      href: "/app/products",
      id: "best-roas-product",
      priority: "medium",
      title: "Publicidade mais eficiente",
      type: "growth",
    });
  }

  // ===== INSIGHT 4: Publicidade eficiente (geral) =====
  if (totalAdSpend > 0 && overallRoas !== null) {
    if (overallRoas >= 4) {
      insights.push({
        description: `ROAS geral de ${overallRoas.toFixed(1)}x. Performance excelente, considere aumentar investimento.`,
        href: "/app/products",
        id: "high-overall-roas",
        priority: "medium",
        title: "Publicidade eficiente",
        type: "growth",
      });
    } else if (overallRoas >= 2) {
      insights.push({
        description: `ROAS geral de ${overallRoas.toFixed(1)}x. Performance boa, dentro da meta.`,
        href: "/app/products",
        id: "medium-overall-roas",
        priority: "low",
        title: "Publicidade eficiente",
        type: "growth",
      });
    } else {
      insights.push({
        description: `ROAS geral de ${overallRoas.toFixed(1)}x. Investimento em ads está com baixo retorno.`,
        href: "/app/products",
        id: "low-overall-roas",
        priority: "high",
        title: "Publicidade ineficiente",
        type: "alert",
      });
    }
  }

  // Se não tiver publicidade, mostra insight sobre isso
  if (totalAdSpend === 0 && byProfitDesc.length > 0) {
    insights.push({
      description: "Nenhum investimento em publicidade registrado. Considere investir nos produtos de maior margem.",
      href: "/app/products",
      id: "no-ad-spend",
      priority: "low",
      title: "Sem investimento em Ads",
      type: "info",
    });
  }

  return insights.slice(0, 4);
}

function formatMoney(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function buildProductTableRows(data: ProductCatalogData): ProductTableRow[] {
  return data.monthlyPerformanceRows.map((row) => {
    const financials = deriveRowFinancials(row);

    return {
      ...financials,
      adSpend: toNumber(row.advertisingCost),
      channelLabel: row.channel,
      commissionPct: toNumber(row.commissionRate) * 100,
      id: `${row.referenceMonth}:${row.channel}:${row.sku}`,
      name: row.productName,
      packagingCost: toNumber(row.packagingCost),
      referenceMonth: row.referenceMonth,
      returns: row.returnsQuantity,
      sales: row.salesQuantity,
      sellingPrice: toNumber(row.salePrice),
      shipping: toNumber(row.shippingFee),
      sku: row.sku,
      taxPct: toNumber(row.taxRate) * 100,
      unitCost: toNumber(row.unitCost),
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

  return `Este mês ainda não tem performance mensal suficiente: ${labels.join(", ")}.`;
}
