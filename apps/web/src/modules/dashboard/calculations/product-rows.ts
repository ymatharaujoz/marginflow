import type { DashboardProfitabilityResponse } from "@marginflow/types";
import type { DashboardProductDetailRow } from "../types/dashboard";
import { getProductHealthStatus } from "./product-health";
import { normalizeNumber } from "../utils/formatters";

export function buildDashboardProductRows(data: DashboardProfitabilityResponse): DashboardProductDetailRow[] {
  return data.products.map((product) => {
    const sales = product.sales;
    const returns = product.returns;
    const netSales = product.netSales;
    const revenue = normalizeNumber(product.revenue) ?? 0;
    const productCost = normalizeNumber(product.productCost) ?? 0;
    const packaging = normalizeNumber(product.packagingCost) ?? 0;
    const commission = normalizeNumber(product.marketplaceCommission) ?? 0;
    const shipping = normalizeNumber(product.shippingCost) ?? 0;
    const tax = normalizeNumber(product.taxAmount) ?? 0;
    const adSpend = normalizeNumber(product.adSpend) ?? 0;
    const profit = normalizeNumber(product.grossProfit) ?? 0;
    const margin = normalizeNumber(product.margin) ?? 0;
    const roi = normalizeNumber(product.roi) ?? 0;
    const roas = normalizeNumber(product.roas) ?? 0;

    const health = getProductHealthStatus({
      margin,
      profit,
      roi,
      roas,
      netSales,
      returns,
      sales,
    });

    return {
      id: product.productId,
      name: product.productName,
      sku: product.sku,
      channelLabel: product.channel,
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
      totalCost: productCost + packaging + commission + shipping + tax,
      adSpend,
      roas,
      profit,
      margin,
      roi,
      health,
    };
  });
}
