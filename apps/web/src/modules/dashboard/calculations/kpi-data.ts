import type { DashboardSummaryResponse } from "@marginflow/types";
import type { DashboardKpiItem } from "../types/dashboard";
import { formatMoney, formatPercent, normalizeNumber } from "../utils/formatters";

function buildHelperText(summary: DashboardSummaryResponse["summary"]) {
  return `${summary.ordersCount} pedidos · ${summary.unitsSold} unidades`;
}

export function buildDashboardKpis(summaryResponse: DashboardSummaryResponse): DashboardKpiItem[] {
  const { summary } = summaryResponse;
  const grossRevenue = normalizeNumber(summary.grossRevenue) ?? 0;
  const netProfit = normalizeNumber(summary.netProfit) ?? 0;
  const grossProfit = normalizeNumber(summary.grossProfit) ?? 0;
  const grossMargin = normalizeNumber(summary.grossMarginPercent) ?? 0;
  const avgRoi = normalizeNumber(summary.avgRoi) ?? 0;
  const avgRoas = normalizeNumber(summary.avgRoas) ?? 0;
  const totalFees = normalizeNumber(summary.totalFees) ?? 0;
  const totalCogs = normalizeNumber(summary.totalCogs) ?? 0;
  const totalAdCosts = normalizeNumber(summary.totalAdCosts) ?? 0;
  const totalManualExpenses = normalizeNumber(summary.totalManualExpenses) ?? 0;

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
      helperText: "Antes de ads e despesas manuais",
    },
    {
      key: "netProfit",
      label: "Lucro líquido",
      value: formatMoney(netProfit),
      icon: "profit",
      variant: netProfit >= 0 ? "success" : "warning",
      helperText: `COGS + taxas + ads + despesas: ${formatMoney(totalFees + totalCogs + totalAdCosts + totalManualExpenses)}`,
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
      value: formatPercent(avgRoi, { digits: 0 }),
      icon: "margin",
      variant: avgRoi >= 50 ? "success" : avgRoi > 0 ? "accent" : "warning",
      helperText: "Retorno sobre investimento",
    },
    {
      key: "roas",
      label: "ROAS médio",
      value: `${avgRoas.toFixed(1)}x`,
      icon: "ads",
      variant: avgRoas >= 3 ? "success" : avgRoas >= 1 ? "accent" : "warning",
      helperText:
        avgRoas >= 3
          ? "ROAS excelente"
          : avgRoas >= 1
            ? "ROAS positivo"
            : "Sem retorno relevante em ads",
    },
  ];
}
