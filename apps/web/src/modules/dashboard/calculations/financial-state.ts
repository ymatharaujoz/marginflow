import type { DashboardBusinessStatus, DashboardFinancialState, DashboardQueryBundle } from "../types/dashboard";
import { normalizeNumber } from "../utils/formatters";

export function determineDashboardFinancialState(
  summary: DashboardQueryBundle["summary"],
  charts: DashboardQueryBundle["charts"],
  profitability: DashboardQueryBundle["profitability"],
): DashboardFinancialState {
  if (!summary || !charts || !profitability) return "insufficient";

  const hasSyncData = charts.daily.length > 0;
  const hasCatalogCosts =
    (normalizeNumber(summary.summary.totalCogs) ?? 0) > 0 ||
    (normalizeNumber(summary.summary.totalAdCosts) ?? 0) > 0 ||
    (normalizeNumber(summary.summary.totalManualExpenses) ?? 0) > 0;
  const hasProfitabilitySignal = profitability.products.length > 0 && profitability.channels.length > 0;

  if (!hasSyncData) return "sync";
  if (!hasCatalogCosts) return "catalog";
  if (!hasProfitabilitySignal) return "insufficient";
  return "ready";
}

export function deriveBusinessStatus(summary: DashboardQueryBundle["summary"]): DashboardBusinessStatus {
  if (!summary) return "review";

  const netProfit = normalizeNumber(summary.summary.netProfit) ?? 0;
  const grossMarginPercent = normalizeNumber(summary.summary.grossMarginPercent) ?? 0;

  if (netProfit < 0) return "attention";
  if (grossMarginPercent <= 0) return "review";
  return "healthy";
}
