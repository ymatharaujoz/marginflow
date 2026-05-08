import type { DashboardProfitabilityResponse } from "@marginflow/types";
import type { DashboardProductDetailRow } from "../types/dashboard";
import { getProductHealthStatus } from "./product-health";
import { normalizeNumber } from "../utils/formatters";

export function buildDashboardProductRows(data: DashboardProfitabilityResponse): DashboardProductDetailRow[] {
  return data.products.map((product) => {
    // Valores base do produto
    const sales = product.sales ?? product.summary.unitsSold;
    const returns = product.returns ?? 0;
    const netSales = product.netSales ?? sales - returns;
    const revenue = normalizeNumber(product.revenue) ?? normalizeNumber(product.summary.grossRevenue) ?? 0;

    // Custos detalhados (do mock ou calculados)
    const productCost = normalizeNumber(product.productCost) ?? normalizeNumber(product.summary.totalCogs) * 0.8 ?? 0; // 80% do COGS é custo do produto
    const packaging = normalizeNumber(product.packagingCost) ?? netSales * 3; // Fallback R$3/unidade
    const commission = normalizeNumber(product.marketplaceCommission) ?? revenue * 0.12; // Fallback 12%
    const shipping = normalizeNumber(product.shippingCost) ?? netSales * 13; // Fallback R$13/unidade
    const tax = normalizeNumber(product.taxAmount) ?? revenue * 0.14; // Fallback 14%
    const adSpend = normalizeNumber(product.adSpend) ?? normalizeNumber(product.summary.totalAdCosts) ?? 0;

    // Custo total (todos os custos exceto ads)
    const totalCost = productCost + packaging + commission + shipping + tax;

    // Lucro Bruto: revenue - marketplaceCommission - shippingCost - taxAmount - packagingCost - productCost
    // Conforme fórmula especificada pelo usuário
    const profit = revenue - commission - shipping - tax - packaging - productCost;

    // Margem: grossProfit / revenue
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    // ROI: grossProfit / productCost
    const roiCalculated = productCost > 0 ? (profit / productCost) * 100 : null;

    // ROAS: revenue / adSpend
    const roasCalculated = adSpend > 0 ? revenue / adSpend : null;

    // Valores do mock (se existirem) ou calculados
    const roiFromData = normalizeNumber(product.roi);
    const roasFromData = normalizeNumber(product.roas);
    const marginFromData = normalizeNumber(product.margin);
    const profitFromData = normalizeNumber(product.grossProfit);

    // Usar valores do mock se disponíveis, senão usar calculados
    const finalProfit = profitFromData ?? profit;
    const finalMargin = marginFromData ?? margin;
    const finalRoi = roiFromData ?? roiCalculated;
    const finalRoas = roasFromData ?? roasCalculated;

    // Calcular saúde financeira
    const health = getProductHealthStatus({
      margin: finalMargin,
      profit: finalProfit,
      roi: finalRoi,
      roas: finalRoas,
      netSales,
      returns,
      sales,
    });

    return {
      id: product.productId,
      name: product.productName,
      sku: product.sku,
      channelLabel: product.channel ?? "mercadolivre",
      sales,
      returns,
      netSales,
      revenue,
      averageTicket: netSales > 0 ? revenue / netSales : 0,
      commission,
      shipping,
      tax,
      productCost,
      packagingCost: packaging,
      totalCost,
      adSpend,
      roas: finalRoas,
      profit: finalProfit,
      margin: finalMargin,
      roi: finalRoi,
      health,
    };
  });
}
