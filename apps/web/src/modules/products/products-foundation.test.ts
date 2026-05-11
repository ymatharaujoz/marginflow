import { describe, expect, it } from "vitest";
import type { ProductAnalyticsSnapshot } from "@marginflow/types";
import {
  buildCatalogStats,
  buildProductInsights,
  buildProductTableRows,
  determineFinancialState,
} from "./calculations/product-insights";

const snapshot: ProductAnalyticsSnapshot = {
  adCosts: [],
  catalogStats: {
    activeProducts: 2,
    archivedProducts: 0,
    pendingSyncProducts: 1,
    productsWithCost: 1,
    productsWithoutCost: 1,
    syncedProductsTotal: 1,
    totalAdCosts: 0,
    totalManualExpenses: 0,
    totalProducts: 2,
    totalProductCosts: 1,
  },
  dataGaps: ["shipping_cost_unavailable", "tax_amount_unavailable"],
  financialState: "ready",
  manualExpenses: [],
  productCosts: [],
  productRows: [
    {
      actualRoas: "20.00",
      adSpend: "10.00",
      channel: "mercadolivre",
      contributionMargin: "120.00",
      grossProfit: "130.00",
      hasCost: true,
      hasLinkedMarketplaceSignal: true,
      hasSalesSignal: true,
      insufficientReasons: [],
      isActive: true,
      margin: "65.00",
      marketplaceCommission: "20.00",
      minimumRoas: "1.67",
      name: "Product One",
      netSales: 2,
      packagingCost: "0.00",
      productCost: "50.00",
      productId: "product_1",
      revenue: "200.00",
      returns: 0,
      roi: "260.00",
      salePrice: "100.00",
      sales: 2,
      shippingCost: "0.00",
      sku: "ABC-1",
      taxAmount: "0.00",
      totalProfit: "120.00",
      unitProfit: "60.00",
    },
    {
      actualRoas: "0.00",
      adSpend: "0.00",
      channel: "unknown",
      contributionMargin: "0.00",
      grossProfit: "0.00",
      hasCost: false,
      hasLinkedMarketplaceSignal: false,
      hasSalesSignal: false,
      insufficientReasons: ["missing_cost", "missing_sales_signal"],
      isActive: true,
      margin: "0.00",
      marketplaceCommission: "0.00",
      minimumRoas: "Infinity",
      name: "Product Two",
      netSales: 0,
      packagingCost: "0.00",
      productCost: "0.00",
      productId: "product_2",
      revenue: "0.00",
      returns: 0,
      roi: "0.00",
      salePrice: "80.00",
      sales: 0,
      shippingCost: "0.00",
      sku: "XYZ-1",
      taxAmount: "0.00",
      totalProfit: "0.00",
      unitProfit: "0.00",
    },
  ],
  products: [
    {
      createdAt: "2026-05-01T10:00:00.000Z",
      id: "product_1",
      isActive: true,
      latestCost: {
        amount: "25.00",
        costType: "base",
        createdAt: "2026-05-01T10:00:00.000Z",
        currency: "BRL",
        effectiveFrom: "2026-05-01",
        id: "cost_1",
        notes: null,
        organizationId: "org_123",
        productId: "product_1",
        updatedAt: "2026-05-01T10:00:00.000Z",
      },
      name: "Product One",
      organizationId: "org_123",
      sellingPrice: "100.00",
      sku: "ABC-1",
      updatedAt: "2026-05-01T10:00:00.000Z",
    },
    {
      createdAt: "2026-05-01T10:00:00.000Z",
      id: "product_2",
      isActive: true,
      latestCost: null,
      name: "Product Two",
      organizationId: "org_123",
      sellingPrice: "80.00",
      sku: "XYZ-1",
      updatedAt: "2026-05-01T10:00:00.000Z",
    },
  ],
  syncedProducts: [
    {
      externalProductId: "MLB-1",
      grossRevenue: "200.00",
      id: "external_1",
      lastOrderedAt: "2026-05-01T11:00:00.000Z",
      latestUnitPrice: "100.00",
      linkedProduct: null,
      orderCount: 1,
      provider: "mercadolivre",
      reviewStatus: "unreviewed",
      sku: "XYZ-1",
      suggestedMatches: [
        {
          isActive: true,
          name: "Product Two",
          productId: "product_2",
          reason: "sku_exact",
          sku: "XYZ-1",
        },
      ],
      title: "Product Two",
      unitsSold: 2,
    },
  ],
};

describe("products foundation helpers", () => {
  it("uses backend catalog stats and financial state as the source of truth", () => {
    expect(buildCatalogStats(snapshot)).toEqual(snapshot.catalogStats);
    expect(determineFinancialState(snapshot)).toBe("ready");
  });

  it("maps analytics rows without local sales simulation or heuristic costs", () => {
    expect(buildProductTableRows(snapshot)).toEqual([
      expect.objectContaining({
        adSpend: 10,
        channelLabel: "mercadolivre",
        commission: 20,
        health: "scalable",
        name: "Product One",
        productCost: 50,
        profit: 120,
        revenue: 200,
        roi: 260,
        roas: 20,
      }),
      expect.objectContaining({
        adSpend: 0,
        channelLabel: "unknown",
        commission: 0,
        health: "attention",
        name: "Product Two",
        productCost: 0,
        profit: 0,
        revenue: 0,
        roi: 0,
        roas: 0,
      }),
    ]);
  });

  it("derives product insights from the official analytics snapshot", () => {
    const insights = buildProductInsights(snapshot, snapshot.catalogStats);

    expect(insights).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actionLabel: "Cadastrar custos",
          href: "/app/products",
          id: "products-without-cost",
        }),
        expect.objectContaining({
          actionLabel: "Revisar",
          actionKey: "open-synced-review",
          href: "/app/products",
          id: "pending-sync",
        }),
      ]),
    );
  });
});
