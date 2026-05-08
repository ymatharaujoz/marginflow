import { describe, expect, it } from "vitest";
import { determineDashboardFinancialState } from "./calculations/financial-state";
import { buildDashboardKpis } from "./calculations/kpi-data";
import { buildDashboardProductRows } from "./calculations/product-rows";
import { getProductHealthStatus } from "./calculations/product-health";
import { formatMoney, formatPercent, formatNumber } from "./utils/formatters";

const summary = {
  cards: [],
  summary: {
    breakEvenRevenue: "800.00",
    breakEvenUnits: "4.00",
    contributionMargin: "340.00",
    grossMarginPercent: "28.33",
    grossRevenue: "1200.50",
    netProfit: "210.10",
    netRevenue: "1100.00",
    ordersCount: 4,
    totalAdCosts: "40.00",
    totalCogs: "500.00",
    totalFees: "60.00",
    totalManualExpenses: "25.00",
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
      productId: "prod_1",
      productName: "Premium Notebook",
      sku: "NB-1",
      summary: summary.summary,
    },
  ],
};

describe("dashboard foundation helpers", () => {
  it("derives financial states correctly", () => {
    expect(determineDashboardFinancialState(summary, charts, profitability)).toBe("ready");
    expect(determineDashboardFinancialState(summary, { ...charts, daily: [] }, profitability)).toBe("sync");
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
    expect(formatMoney(undefined)).toBe("—");
  });

  it("builds KPI view models from summary data", () => {
    const kpis = buildDashboardKpis(summary);

    expect(kpis[0]?.label).toBe("Faturamento");
    expect(kpis.some((item) => item.label === "Lucro líquido")).toBe(true);
    expect(kpis.some((item) => item.label === "Investimento em Ads")).toBe(true);
  });

  it("maps profitability rows and classifies health", () => {
    const rows = buildDashboardProductRows(profitability);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe("Premium Notebook");
    expect(rows[0]?.health).toBe("healthy");
  });

  it("classifies critical products", () => {
    expect(getProductHealthStatus({ margin: -3, profit: -10, roi: -0.1, roas: 0.5 })).toBe("critical");
  });
});
