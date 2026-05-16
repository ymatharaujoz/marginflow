import type { DashboardSummaryResponse } from "@marginflow/types";
import { parseProtectedNumber } from "@/lib/protected-numbers";
import type { DashboardInsight } from "../types/dashboard";
import { formatMoney } from "../utils/formatters";

export function buildDashboardInsights(data?: DashboardSummaryResponse): DashboardInsight[] {
  if (!data) return [];

  const insights: DashboardInsight[] = [];
  const { summary } = data;
  const netProfit = parseProtectedNumber(summary.netProfit) ?? 0;
  const grossRevenue = parseProtectedNumber(summary.grossRevenue) ?? 0;
  const breakEvenRevenue = parseProtectedNumber(summary.breakEvenRevenue) ?? 0;
  const totalAdCosts = parseProtectedNumber(summary.totalAdCosts) ?? 0;
  const grossMarginPercent = parseProtectedNumber(summary.grossMarginPercent) ?? 0;

  if (netProfit > 0) {
    insights.push({
      id: "profit-positive",
      type: "growth",
      title: "Lucratividade Positiva",
      description: `Seu negócio gerou ${formatMoney(netProfit)} de lucro líquido no período`,
      priority: "medium",
    });
  } else if (netProfit < 0) {
    insights.push({
      id: "profit-negative",
      type: "alert",
      title: "Margem Negativa Detectada",
      description: "Seus custos estão superando a receita. Revise os produtos com menor margem",
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
      title: "Progresso até Ponto de Equilíbrio",
      description: `Você atingiu ${progress.toFixed(0)}% do ponto de equilíbrio financeiro`,
    });
  }

  const avgRoas = parseProtectedNumber(summary.avgRoas) ?? 0;
  const contributionMargin = parseProtectedNumber(summary.contributionMargin) ?? 0;
  const totalReturns = summary.totalReturns ?? 0;
  const unitsSold = summary.unitsSold ?? 0;
  const ordersCount = summary.ordersCount ?? 0;

  if (avgRoas > 0) {
    const roasStatus = avgRoas >= 4 ? "Excelente" : avgRoas >= 2.5 ? "Positivo" : "Atenção";
    const roasTone = avgRoas >= 2.5 ? "growth" : "alert";
    const roasMultiple = avgRoas.toFixed(1);
    const recommendation = avgRoas >= 4
      ? "Possível escalar investimento"
      : avgRoas >= 2.5
        ? "Campanhas rentáveis, monitorar margem"
        : "Revisar segmentação e criativos";

    insights.push({
      id: "roas-performance",
      type: roasTone,
      title: `ROAS ${roasStatus}`,
      description: `Retorno de ${roasMultiple}x sobre ADS ${recommendation}`,
      priority: avgRoas < 2.5 ? "high" : "medium",
    });
  }

  if (contributionMargin > 0 && grossRevenue > 0) {
    const contributionRate = (contributionMargin / grossRevenue) * 100;
    if (contributionRate > 30) {
      insights.push({
        id: "contribution-strong",
        type: "growth",
        title: "Margem de contribuição forte",
        description: `Seu negócio mantém ${contributionRate.toFixed(1)}% de margem de contribuição, cobrindo bem os custos operacionais antes das despesas fixas`,
        priority: "medium",
      });
    }
  }

  if (totalReturns > 0 && unitsSold > 0) {
    const returnRate = (totalReturns / unitsSold) * 100;
    if (returnRate > 10) {
      insights.push({
        id: "high-returns",
        type: "alert",
        title: "Taxa de Devolução Elevada",
        description: `${totalReturns} devoluções em ${unitsSold} vendas (${returnRate.toFixed(1)}%). Revise qualidade ou descrição dos produtos`,
        priority: "high",
        href: "/app/products",
        actionLabel: "Ver produtos",
      });
    } else if (unitsSold >= 10) {
      insights.push({
        id: "returns-healthy",
        type: "growth",
        title: "Taxa de Devolução Saudável",
        description: `Apenas ${returnRate.toFixed(1)}% de devoluções ${totalReturns === 0 ? "Nenhuma devolução registrada no periodo" : "Bom controle de qualidade e expectativas"}`,
        priority: "low",
      });
    }
  }

  if (totalAdCosts > 0 && ordersCount > 0) {
    const cac = totalAdCosts / ordersCount;
    if (cac > 0) {
      insights.push({
        id: "cac-insight",
        type: "info",
        title: "Custo de Aquisição (CAC)",
        description: `Você investe ${formatMoney(cac)} em média para adquirir cada cliente através de anúncios`,
        priority: "low",
      });
    }
  }

  if (totalAdCosts > 0 && grossMarginPercent === 0) {
    insights.push({
      id: "margin-unavailable",
      type: "info",
      title: "Cobertura financeira parcial",
      description:
        "Alguns custos operacionais ainda dependem da cobertura atual do snapshot. O dashboard mostra zeros explicitos em vez de estimativas",
      priority: "medium",
      href: "/app/products",
      actionLabel: "Revisar catálogo",
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: "ai-tip",
      type: "ai",
      title: "Sugestão de IA",
      description: "Continue sincronizando e cadastrando custos para liberar análises mais profundas do catálogo",
    });
  }

  return insights.slice(0, 4);
}
