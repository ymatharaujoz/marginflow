import { describe, expect, it } from "vitest";
import {
  buildFinanceOverview,
  buildProductAnalyticsMetrics,
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
        avgRoi: "530.00",
        avgRoas: "26.92",
        avgTicket: "175.00",
        breakEvenRevenue: "65.28",
        breakEvenUnits: "0.75",
        contributionMargin: "252.00",
        grossMarginPercent: "75.71",
        grossProfit: "265.00",
        grossRevenue: "350.00",
        netProfit: "205.00",
        netRevenue: "350.00",
        ordersCount: 2,
        totalAdCosts: "13.00",
        totalCogs: "50.00",
        totalFees: "35.00",
        totalManualExpenses: "47.00",
        totalReturns: 0,
        unitsSold: 4,
      }),
    );
    expect(overview.daily).toEqual([
      expect.objectContaining({
        metricDate: "2026-04-28",
        summary: expect.objectContaining({
          grossProfit: "220.00",
          grossRevenue: "300.00",
          netProfit: "170.00",
          totalManualExpenses: "40.00",
        }),
      }),
      expect.objectContaining({
        metricDate: "2026-04-29",
        summary: expect.objectContaining({
          grossProfit: "45.00",
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
          grossProfit: "130.00",
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
          grossProfit: "45.00",
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
          grossProfit: "220.00",
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
          grossProfit: "45.00",
          grossRevenue: "50.00",
          netProfit: "42.00",
          totalAdCosts: "3.00",
          totalCogs: "0.00",
          totalFees: "5.00",
        }),
      }),
    ]);
  });

  it("builds explicit product profitability rollups without unmatched marketplace rows", () => {
    expect(buildProductProfitabilityMetrics(snapshot)).toEqual([
      expect.objectContaining({
        adSpend: "10.00",
        channel: "mercadolivre",
        grossProfit: "130.00",
        margin: "65.00",
        marketplaceCommission: "20.00",
        netSales: 2,
        packagingCost: "0.00",
        productCost: "50.00",
        productId: "product_1",
        returns: 0,
        revenue: "200.00",
        roi: "260.00",
        roas: "20.00",
        salePrice: "100.00",
        sales: 2,
        shippingCost: "0.00",
        taxAmount: "0.00",
      }),
      expect.objectContaining({
        adSpend: "0.00",
        channel: "shopee",
        grossProfit: "45.00",
        margin: "90.00",
        marketplaceCommission: "5.00",
        productCost: "0.00",
        productId: "product_2",
        revenue: "50.00",
        roi: "0.00",
        roas: "0.00",
        salePrice: "50.00",
        sales: 1,
      }),
    ]);
  });

  it("builds canonical product analytics rows for all catalog products", () => {
    expect(
      buildProductAnalyticsMetrics(snapshot, {
        linkedMarketplaceSignalsByProductId: {
          product_1: true,
        },
      }),
    ).toEqual([
      expect.objectContaining({
        actualRoas: "20.00",
        adSpend: "10.00",
        channel: "mercadolivre",
        contributionMargin: "120.00",
        grossProfit: "130.00",
        hasCost: true,
        hasLinkedMarketplaceSignal: true,
        hasSalesSignal: true,
        insufficientReasons: [],
        margin: "65.00",
        marketplaceCommission: "20.00",
        minimumRoas: "1.67",
        netSales: 2,
        productId: "product_1",
        productName: "Product One",
        productCost: "50.00",
        revenue: "200.00",
        roi: "260.00",
        salePrice: "100.00",
        sales: 2,
        totalProfit: "120.00",
        unitProfit: "60.00",
      }),
      expect.objectContaining({
        actualRoas: "0.00",
        adSpend: "0.00",
        channel: "shopee",
        contributionMargin: "45.00",
        grossProfit: "45.00",
        hasCost: false,
        hasLinkedMarketplaceSignal: false,
        hasSalesSignal: true,
        insufficientReasons: expect.arrayContaining(["missing_cost", "missing_linked_marketplace_signal"]),
        margin: "90.00",
        minimumRoas: "1.11",
        productId: "product_2",
        revenue: "50.00",
        roi: "0.00",
        totalProfit: "45.00",
        unitProfit: "45.00",
      }),
    ]);
  });

  it("emits explicit insufficient reasons for products without sales signal", () => {
    expect(
      buildProductAnalyticsMetrics(
        {
          ...snapshot,
          products: [
            ...snapshot.products,
            {
              id: "product_3",
              isActive: true,
              name: "Product Three",
              sellingPrice: "80.00",
              sku: "NO-SALES",
              unitCost: "15.00",
            },
          ],
        },
        {
          linkedMarketplaceSignalsByProductId: {},
        },
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          hasCost: true,
          hasLinkedMarketplaceSignal: false,
          hasSalesSignal: false,
          insufficientReasons: expect.arrayContaining([
            "missing_linked_marketplace_signal",
            "missing_sales_signal",
          ]),
          productId: "product_3",
          revenue: "0.00",
          sales: 0,
        }),
      ]),
    );
  });

  it("keeps summary margin weighted by revenue instead of averaging product percentages", () => {
    const overview = buildFinanceOverview({
      adCosts: [],
      manualExpenses: [],
      orders: [
        {
          fees: [],
          id: "order_1",
          items: [
            {
              id: "item_1",
              productId: "product_1",
              quantity: 1,
              sku: "HIGH-MARGIN",
              totalPrice: "100.00",
              unitPrice: "100.00",
            },
          ],
          orderedAt: "2026-05-01T10:00:00.000Z",
          provider: "mercadolivre",
          totalAmount: "100.00",
        },
        {
          fees: [],
          id: "order_2",
          items: [
            {
              id: "item_2",
              productId: "product_2",
              quantity: 1,
              sku: "LOW-MARGIN",
              totalPrice: "900.00",
              unitPrice: "900.00",
            },
          ],
          orderedAt: "2026-05-02T10:00:00.000Z",
          provider: "mercadolivre",
          totalAmount: "900.00",
        },
      ],
      products: [
        {
          id: "product_1",
          isActive: true,
          name: "High Margin",
          sellingPrice: "100.00",
          sku: "HIGH-MARGIN",
          unitCost: "10.00",
        },
        {
          id: "product_2",
          isActive: true,
          name: "Low Margin",
          sellingPrice: "900.00",
          sku: "LOW-MARGIN",
          unitCost: "450.00",
        },
      ],
    });

    expect(overview.summary.grossMarginPercent).toBe("54.00");
  });

  it("keeps ROI and actual ROAS zero-safe and minimum ROAS explicit when contribution is not calculable", () => {
    expect(
      buildProductAnalyticsMetrics(
        {
          adCosts: [],
          manualExpenses: [],
          orders: [
            {
              fees: [{ amount: "120.00", feeType: "marketplace" }],
              id: "order_1",
              items: [
                {
                  id: "item_1",
                  productId: "product_loss",
                  quantity: 1,
                  sku: "LOSS-1",
                  totalPrice: "100.00",
                  unitPrice: "100.00",
                },
              ],
              orderedAt: "2026-05-01T10:00:00.000Z",
              provider: "mercadolivre",
              totalAmount: "100.00",
            },
          ],
          products: [
            {
              id: "product_loss",
              isActive: true,
              name: "Loss Product",
              sellingPrice: "100.00",
              sku: "LOSS-1",
              unitCost: "0.00",
            },
          ],
        },
        {
          linkedMarketplaceSignalsByProductId: {
            product_loss: true,
          },
        },
      ),
    ).toEqual([
      expect.objectContaining({
        actualRoas: "0.00",
        contributionMargin: "-20.00",
        minimumRoas: "Infinity",
        roi: "0.00",
      }),
    ]);
  });
});
