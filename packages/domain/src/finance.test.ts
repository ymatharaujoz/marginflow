import { describe, expect, it } from "vitest";
import {
  buildFinanceOverview,
  buildProductProfitabilityMetrics,
  calculateBreakEvenQuantity,
  calculateBreakEvenRevenue,
  calculateContributionMargin,
  calculateGrossMarginPercent,
  calculateGrossRevenue,
  calculateNetProfit,
  calculateNetRevenue,
} from "./finance";

describe("@marginflow/domain finance formulas", () => {
  it("calculates the core finance formulas deterministically", () => {
    expect(calculateGrossRevenue(["100.00", "55.25", "4.75"])).toBe("160.00");
    expect(
      calculateNetRevenue({
        discounts: "5.00",
        grossRevenue: "160.00",
        refunds: "10.00",
      }),
    ).toBe("145.00");
    expect(
      calculateContributionMargin({
        adCosts: "10.00",
        cogs: "50.00",
        marketplaceFees: "15.00",
        revenue: "145.00",
      }),
    ).toBe("70.00");
    expect(calculateGrossMarginPercent("160.00", "50.00")).toBe("68.75");
    expect(
      calculateNetProfit({
        adCosts: "10.00",
        additionalExpenses: "8.00",
        cogs: "50.00",
        fixedCosts: "20.00",
        marketplaceFees: "15.00",
        revenue: "145.00",
        taxesEstimate: "5.00",
      }),
    ).toBe("37.00");
  });

  it("returns zero-safe break-even values when contribution is missing", () => {
    expect(
      calculateBreakEvenQuantity({
        contributionMargin: "0.00",
        fixedCosts: "50.00",
        unitsSold: 10,
      }),
    ).toBe("0.00");
    expect(
      calculateBreakEvenRevenue({
        contributionMargin: "0.00",
        fixedCosts: "50.00",
        grossRevenue: "100.00",
      }),
    ).toBe("0.00");
    expect(calculateGrossMarginPercent("0.00", "10.00")).toBe("0.00");
  });
});

describe("@marginflow/domain finance overview", () => {
  const snapshot = {
    adCosts: [
      {
        amount: "10.00",
        channel: "mercadolivre",
        id: "ad_1",
        productId: "product_1",
        spentAt: "2026-04-28",
      },
      {
        amount: "3.00",
        channel: "shopee",
        id: "ad_2",
        productId: null,
        spentAt: "2026-04-29",
      },
    ],
    manualExpenses: [
      {
        amount: "40.00",
        category: "operations",
        id: "expense_1",
        incurredAt: "2026-04-28",
      },
      {
        amount: "7.00",
        category: "software",
        id: "expense_2",
        incurredAt: "2026-04-29",
      },
    ],
    orders: [
      {
        fees: [{ amount: "30.00", feeType: "marketplace" }],
        id: "order_1",
        items: [
          {
            id: "item_1",
            productId: "product_1",
            quantity: 2,
            sku: "ABC-1",
            totalPrice: "200.00",
            unitPrice: "100.00",
          },
          {
            id: "item_2",
            productId: null,
            quantity: 1,
            sku: "MISSING",
            totalPrice: "100.00",
            unitPrice: "100.00",
          },
        ],
        orderedAt: "2026-04-28T10:00:00.000Z",
        provider: "mercadolivre",
        totalAmount: "300.00",
      },
      {
        fees: [{ amount: "5.00", feeType: "marketplace" }],
        id: "order_2",
        items: [
          {
            id: "item_3",
            productId: "product_2",
            quantity: 1,
            sku: "XYZ-1",
            totalPrice: "50.00",
            unitPrice: "50.00",
          },
        ],
        orderedAt: "2026-04-29T10:00:00.000Z",
        provider: "shopee",
        totalAmount: "50.00",
      },
    ],
    products: [
      {
        id: "product_1",
        isActive: true,
        name: "Product One",
        sellingPrice: "100.00",
        sku: "ABC-1",
        unitCost: "25.00",
      },
      {
        id: "product_2",
        isActive: true,
        name: "Product Two",
        sellingPrice: "50.00",
        sku: "XYZ-1",
        unitCost: "0.00",
      },
    ],
  } as const;

  it("builds aggregated overview outputs for summary, daily, product, and channel metrics", () => {
    const overview = buildFinanceOverview(snapshot);

    expect(overview.summary).toEqual(
      expect.objectContaining({
        breakEvenRevenue: "65.28",
        breakEvenUnits: "0.75",
        contributionMargin: "252.00",
        grossMarginPercent: "85.71",
        grossRevenue: "350.00",
        netProfit: "205.00",
        netRevenue: "350.00",
        ordersCount: 2,
        totalAdCosts: "13.00",
        totalCogs: "50.00",
        totalFees: "35.00",
        totalManualExpenses: "47.00",
        unitsSold: 4,
      }),
    );
    expect(overview.daily).toEqual([
      expect.objectContaining({
        metricDate: "2026-04-28",
        summary: expect.objectContaining({
          grossRevenue: "300.00",
          netProfit: "170.00",
          totalManualExpenses: "40.00",
        }),
      }),
      expect.objectContaining({
        metricDate: "2026-04-29",
        summary: expect.objectContaining({
          grossRevenue: "50.00",
          netProfit: "35.00",
          totalManualExpenses: "7.00",
        }),
      }),
    ]);
    expect(overview.products).toEqual([
      expect.objectContaining({
        metricDate: "2026-04-28",
        productId: "product_1",
        summary: expect.objectContaining({
          grossRevenue: "200.00",
          netProfit: "120.00",
          totalAdCosts: "10.00",
          totalCogs: "50.00",
          totalFees: "20.00",
          unitsSold: 2,
        }),
      }),
      expect.objectContaining({
        metricDate: "2026-04-29",
        productId: "product_2",
        summary: expect.objectContaining({
          grossRevenue: "50.00",
          netProfit: "45.00",
          totalAdCosts: "0.00",
          totalCogs: "0.00",
          totalFees: "5.00",
          unitsSold: 1,
        }),
      }),
    ]);
    expect(overview.channels).toEqual([
      expect.objectContaining({
        channel: "mercadolivre",
        summary: expect.objectContaining({
          grossRevenue: "300.00",
          netProfit: "210.00",
          totalAdCosts: "10.00",
          totalCogs: "50.00",
          totalFees: "30.00",
        }),
      }),
      expect.objectContaining({
        channel: "shopee",
        summary: expect.objectContaining({
          grossRevenue: "50.00",
          netProfit: "42.00",
          totalAdCosts: "3.00",
          totalCogs: "0.00",
          totalFees: "5.00",
        }),
      }),
    ]);
  });

  it("builds product profitability rollups without unmatched marketplace rows", () => {
    expect(buildProductProfitabilityMetrics(snapshot)).toEqual([
      expect.objectContaining({
        productId: "product_1",
        summary: expect.objectContaining({
          grossRevenue: "200.00",
          netProfit: "120.00",
        }),
      }),
      expect.objectContaining({
        productId: "product_2",
        summary: expect.objectContaining({
          grossRevenue: "50.00",
          netProfit: "45.00",
        }),
      }),
    ]);
  });
});
