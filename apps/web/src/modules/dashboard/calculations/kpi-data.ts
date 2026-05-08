import type { DashboardSummaryResponse } from "@marginflow/types";
import type { DashboardKpiItem } from "../types/dashboard";
import { formatMoney, formatNumber, formatPercent, normalizeNumber } from "../utils/formatters";

function buildHelperText(summary: DashboardSummaryResponse["summary"]) {
  return `${summary.ordersCount} pedidos · ${summary.unitsSold} unidades`;
}

export function buildDashboardKpis(summaryResponse: DashboardSummaryResponse): DashboardKpiItem[] {
  const { summary } = summaryResponse;
  const grossRevenue = normalizeNumber(summary.grossRevenue) ?? 0;
  const netProfit = normalizeNumber(summary.netProfit) ?? 0;
  const grossProfit = normalizeNumber(summary.grossProfit) ?? netProfit * 1.15; // Fallback
  const grossMargin = normalizeNumber(summary.grossMarginPercent) ?? 0;
  const avgRoi = normalizeNumber(summary.avgRoi);
  const avgRoas = normalizeNumber(summary.avgRoas);
  const totalFees = normalizeNumber(summary.totalFees) ?? 0;
  const totalCogs = normalizeNumber(summary.totalCogs) ?? 0;
  const totalAdCosts = normalizeNumber(summary.totalAdCosts) ?? 0;
  const unitsSold = summary.unitsSold;
  const averageTicket = unitsSold > 0 ? grossRevenue / unitsSold : null;

  // 6 KPIs solicitados:
  // 1. Faturamento
  // 2. Lucro bruto
  // 3. Lucro líquido
  // 4. Margem média
  // 5. ROI médio
  // 6. ROAS médio

  return [
    {
      key: "revenue",
      label: "Faturamento",
      value: formatMoney(grossRevenue),
      icon: "revenue",
      variant: "default",
      helperText: buildHelperText(summary),
    },
    {
      key: "grossProfit",
      label: "Lucro bruto",
      value: formatMoney(grossProfit),
      icon: "profit",
      variant: grossProfit >= 0 ? "success" : "warning",
      helperText: "Antes de impostos e taxas finais",
    },
    {
      key: "netProfit",
      label: "Lucro líquido",
      value: formatMoney(netProfit),
      icon: "profit",
      variant: netProfit >= 0 ? "success" : "warning",
      helperText: `Taxas + custos: ${formatMoney(totalFees + totalCogs + totalAdCosts)}`,
    },
    {
      key: "margin",
      label: "Margem média",
      value: formatPercent(grossMargin),
      icon: "margin",
      variant: grossMargin >= 20 ? "success" : grossMargin > 10 ? "accent" : "warning",
      helperText: grossMargin >= 20 ? "Margem saudável" : grossMargin > 10 ? "Margem razoável" : "Margem baixa",
    },
    {
      key: "roi",
      label: "ROI médio",
      value: avgRoi !== null ? formatPercent(avgRoi, { digits: 0 }) : "—",
      icon: "margin",
      variant: avgRoi !== null && avgRoi >= 50 ? "success" : avgRoi !== null && avgRoi > 0 ? "accent" : "warning",
      helperText: avgRoi !== null ? `Retorno sobre investimento` : "Sem dados de ROI",
    },
    {
      key: "roas",
      label: "ROAS médio",
      value: avgRoas !== null ? `${avgRoas.toFixed(1)}x` : "—",
      icon: "ads",
      variant: avgRoas !== null && avgRoas >= 3 ? "success" : avgRoas !== null && avgRoas >= 1 ? "accent" : "warning",
      helperText: avgRoas !== null
        ? avgRoas >= 3
          ? "ROAS excelente"
          : avgRoas >= 1
            ? "ROAS positivo"
            : "ROAS abaixo do ideal"
        : "Sem investimento em ads",
    },
  ];
}
