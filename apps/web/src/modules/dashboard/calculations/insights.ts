import type { DashboardSummaryResponse } from "@marginflow/types";
import type { DashboardInsight } from "../types/dashboard";
import { formatMoney } from "../utils/formatters";

export function buildDashboardInsights(data?: DashboardSummaryResponse): DashboardInsight[] {
  if (!data) return [];

  const insights: DashboardInsight[] = [];
  const { summary } = data;
  const netProfit = Number(summary.netProfit);
  const grossRevenue = Number(summary.grossRevenue);
  const breakEvenRevenue = Number(summary.breakEvenRevenue);
  const totalAdCosts = Number(summary.totalAdCosts);
  const grossMarginPercent = Number(summary.grossMarginPercent);

  if (netProfit > 0) {
    insights.push({
      id: "profit-positive",
      type: "growth",
      title: "Lucratividade positiva",
      description: `Seu negócio gerou ${formatMoney(netProfit)} de lucro líquido no período.`,
      priority: "medium",
    });
  } else if (netProfit < 0) {
    insights.push({
      id: "profit-negative",
      type: "alert",
      title: "Margem negativa detectada",
      description: "Seus custos estão superando a receita. Revise os produtos com menor margem.",
      priority: "high",
      href: "/app/products",
      actionLabel: "Ver produtos",
    });
  }

  if (netProfit > 0 && breakEvenRevenue > 0) {
    const progress = (grossRevenue / breakEvenRevenue) * 100;
    insights.push({
      id: "breakeven",
      type: "info",
      title: "Progresso até breakeven",
      description: `Você atingiu ${progress.toFixed(0)}% do ponto de equilíbrio financeiro.`,
    });
  }

  if (netProfit > 0 && totalAdCosts > netProfit * 0.3) {
    insights.push({
      id: "ads-high",
      type: "tip",
      title: "Otimização de anúncios",
      description: "Custos em anúncios representam mais de 30% do lucro. Considere otimizar campanhas.",
      priority: "medium",
    });
  }

  if (grossMarginPercent <= 10) {
    insights.push({
      id: "margin-low",
      type: "alert",
      title: "Margem comprimida",
      description: "A margem média está baixa. Priorize revisão de custos e taxas do catálogo.",
      priority: "high",
      href: "/app/products",
      actionLabel: "Revisar custos",
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: "ai-tip",
      type: "ai",
      title: "Sugestão de IA",
      description: "Continue sincronizando e cadastrando custos para liberar análises mais profundas do catálogo.",
    });
  }

  return insights.slice(0, 4);
}
