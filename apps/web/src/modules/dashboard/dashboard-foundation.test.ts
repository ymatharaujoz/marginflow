import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { determineDashboardFinancialState } from "./calculations/financial-state";
import { buildDashboardInsights } from "./calculations/insights";
import { buildDashboardKpis } from "./calculations/kpi-data";
import { buildDashboardProductRows } from "./calculations/product-rows";
import { ProductsTable } from "./components/products-table";
import { getProductHealthStatus } from "./calculations/product-health";
import { formatMoney, formatNumber, formatPercent } from "./utils/formatters";

const summary = {
  cards: [],
  summary: {
    avgRoi: "260.00",
    avgRoas: "20.00",
    avgTicket: "300.13",
    breakEvenRevenue: "800.00",
    breakEvenUnits: "4.00",
    contributionMargin: "340.00",
    grossMarginPercent: "54.15",
    grossProfit: "650.10",
    grossRevenue: "1200.50",
    netProfit: "210.10",
    netRevenue: "1100.00",
    ordersCount: 4,
    totalAdCosts: "40.00",
    totalCogs: "500.00",
    totalFees: "50.40",
    totalManualExpenses: "130.00",
    totalReturns: 1,
    unitsSold: 7,
  },
};

const charts = {
  channels: [
    {
      channel: "mercadolivre",
      grossRevenue: 1200.5,
      netProfit: 210.1,
      unitsSold: 7,
    },
  ],
  daily: [
    {
      grossRevenue: 500,
      metricDate: "2026-05-01",
      netProfit: 100,
      ordersCount: 2,
      unitsSold: 3,
    },
  ],
};

const profitability = {
  channels: [
    {
      channel: "mercadolivre",
      summary: summary.summary,
    },
  ],
  products: [
    {
      adSpend: "10.00",
      channel: "mercadolivre",
      grossProfit: "130.00",
      margin: "65.00",
      marketplaceCommission: "20.00",
      netSales: 2,
      packagingCost: "0.00",
      productCost: "50.00",
      productId: "prod_1",
      productName: "Premium Notebook",
      returns: 0,
      revenue: "200.00",
      roi: "260.00",
      roas: "20.00",
      salePrice: "100.00",
      sales: 2,
      shippingCost: "0.00",
      sku: "NB-1",
      summary: {
        ...summary.summary,
        avgTicket: "200.00",
        grossMarginPercent: "65.00",
        grossProfit: "130.00",
        grossRevenue: "200.00",
        netProfit: "120.00",
        ordersCount: 1,
        totalAdCosts: "10.00",
        totalCogs: "50.00",
        totalFees: "20.00",
      },
      taxAmount: "0.00",
    },
  ],
};

describe("dashboard foundation helpers", () => {
  it("derives financial states correctly", () => {
    expect(determineDashboardFinancialState(summary, charts, profitability)).toBe("ready");
    // Sem dados de sync (daily vazio) mas com custos cadastrados → deve mostrar dados (não bloquear)
    expect(determineDashboardFinancialState(summary, { ...charts, daily: [] }, profitability)).toBe("ready");
    expect(
      determineDashboardFinancialState(
        {
          ...summary,
          summary: {
            ...summary.summary,
            totalAdCosts: "0.00",
            totalCogs: "0.00",
            totalManualExpenses: "0.00",
          },
        },
        charts,
        profitability,
      ),
    ).toBe("catalog");
    expect(determineDashboardFinancialState(undefined, charts, profitability)).toBe("insufficient");
  });

  it("formats money, percent, and numbers with fallbacks", () => {
    expect(formatMoney("1200.5")).toContain("R$");
    expect(formatPercent("28.33")).toBe("28.3%");
    expect(formatNumber(42)).toBe("42");
    expect(formatMoney(undefined)).toBe("â€”");
  });

  it("builds KPI view models from explicit summary data", () => {
    const kpis = buildDashboardKpis(summary);

    expect(kpis.map((item) => item.label)).toEqual([
      "Faturamento",
      "Lucro bruto",
      "Lucro líquido",
      "Margem média",
      "ROI médio",
      "ROAS médio",
    ]);
    expect(kpis[1]?.value).toContain("650");
    expect(kpis[2]?.helperText).toContain("despesas");
    expect(kpis[4]?.value).toBe("260%");
    expect(kpis[5]?.value).toBe("20.0x");
  });

  it("keeps dashboard insights tied to explicit contract metrics without heuristic ad or margin thresholds", () => {
    const insights = buildDashboardInsights({
      ...summary,
      summary: {
        ...summary.summary,
        avgRoas: "0.50",
        grossMarginPercent: "5.00",
        netProfit: "90.00",
        totalAdCosts: "120.00",
      },
    });

    expect(insights).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "profit-positive",
        }),
      ]),
    );
    expect(insights.map((insight) => insight.id)).not.toEqual(
      expect.arrayContaining(["ads-high", "margin-low"]),
    );
  });

  it("maps profitability rows from explicit API contract and classifies health", () => {
    const rows = buildDashboardProductRows(profitability);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      channelLabel: "mercadolivre",
      commission: 20,
      health: "scalable",
      name: "Premium Notebook",
      productCost: 50,
      revenue: 200,
      roi: 260,
      roas: 20,
    });
  });

  it("classifies critical products", () => {
    expect(getProductHealthStatus({ margin: -3, profit: -10, roi: -0.1, roas: 0.5 })).toBe("critical");
  });

  it("renders an honest profitability coverage note instead of implying inferred operational fields", () => {
    const markup = renderToStaticMarkup(createElement(ProductsTable, { data: profitability }));

    expect(markup).toContain("Quando frete, imposto, embalagem ou devolucoes ainda nao tiverem fonte operacional dedicada");
  });
});
