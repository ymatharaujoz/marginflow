import { describe, expect, it } from "vitest";
import type { ProductAnalyticsSnapshot } from "@lucreii/types";
import {
  buildCatalogStats,
  buildProductInsights,
  buildProductTableRows,
  computeRowNetRevenue,
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
  dataGaps: [],
  financialState: "ready",
  manualExpenses: [],
  mercadoLivreSyncStatus: {
    activeRun: null,
    availability: {
      canRun: true,
      currentWindowKey: "2026-05-13-morning",
      currentWindowLabel: "Manha",
      currentWindowSlot: "morning",
      lastSuccessfulSyncAt: null,
      message: "Sync is available for the current daily window.",
      nextAvailableAt: "2026-05-13T09:00:00.000Z",
      provider: "mercadolivre",
      reason: "available",
    },
    lastCompletedRun: null,
  },
  monthlyPerformanceRows: [
    {
      advertisingCost: "10.00",
      channel: "mercadolivre",
      commissionRate: "0.100000",
      fixedFeeUnit: "5.00",
      id: "perf_1",
      marketplaceCommission: "10.00",
      marketplaceCommissionUnit: "10.00",
      packagingCost: "4.00",
      productId: "product_1",
      productName: "Product One",
      referenceMonth: "2026-05-01",
      returnsQuantity: 1,
      salePrice: "100.00",
      salesQuantity: 2,
      shippingFee: "12.00",
      shippingOrFixedFeeSource: "shipping",
      shippingOrFixedFeeUnit: "12.00",
      shippingUnit: "12.00",
      sku: "ABC-1",
      unitCost: "25.00",
    },
    {
      advertisingCost: "0.00",
      channel: "unknown",
      commissionRate: "0.000000",
      fixedFeeUnit: "0.00",
      id: "perf_2",
      marketplaceCommission: "0.00",
      marketplaceCommissionUnit: "0.00",
      packagingCost: "0.00",
      productId: "product_2",
      productName: "Product Two",
      referenceMonth: "2026-05-01",
      returnsQuantity: 0,
      salePrice: "80.00",
      salesQuantity: 0,
      shippingFee: "0.00",
      shippingOrFixedFeeSource: "none",
      shippingOrFixedFeeUnit: "0.00",
      shippingUnit: "0.00",
      sku: "XYZ-1",
      unitCost: "0.00",
    },
  ],
  performanceRows: [
    {
      advertisingCost: "10.00",
      catalogGroupKey: "mercadolivre:MLB-1",
      catalogRole: "parent",
      channel: "mercadolivre",
      children: [],
      isSyntheticParent: false,
      commissionRate: "0.100000",
      fixedFeeUnit: "5.00",
      id: "perf_1",
      marketplaceCommission: "10.00",
      marketplaceCommissionUnit: "10.00",
      packagingCost: "4.00",
      parentProductId: null,
      productId: "product_1",
      productName: "Product One",
      referenceMonth: "2026-05-01",
      returnsQuantity: 1,
      salePrice: "100.00",
      salesQuantity: 2,
      shippingFee: "12.00",
      shippingOrFixedFeeSource: "shipping",
      shippingOrFixedFeeUnit: "12.00",
      shippingUnit: "12.00",
      sku: "ABC-1",
      unitCost: "25.00",
      variationLabel: null,
    },
    {
      advertisingCost: "4.00",
      catalogGroupKey: "mercadolivre:MLB-1",
      catalogRole: "child",
      channel: "mercadolivre",
      children: [],
      isSyntheticParent: false,
      commissionRate: "0.100000",
      fixedFeeUnit: "0.00",
      id: "perf_child_1",
      marketplaceCommission: "4.00",
      marketplaceCommissionUnit: "4.00",
      packagingCost: "2.00",
      parentProductId: "product_1",
      productId: "product_1a",
      productName: "Product One - Azul",
      referenceMonth: "2026-05-01",
      returnsQuantity: 0,
      salePrice: "100.00",
      salesQuantity: 2,
      shippingFee: "3.00",
      shippingOrFixedFeeSource: "shipping",
      shippingOrFixedFeeUnit: "3.00",
      shippingUnit: "3.00",
      sku: "ABC-1-AZ",
      unitCost: "25.00",
      variationLabel: "Cor: Azul",
    },
    {
      advertisingCost: "0.00",
      catalogGroupKey: null,
      catalogRole: "standalone",
      channel: "unknown",
      children: [],
      isSyntheticParent: false,
      commissionRate: "0.000000",
      fixedFeeUnit: "0.00",
      id: "perf_2",
      marketplaceCommission: "0.00",
      marketplaceCommissionUnit: "0.00",
      packagingCost: "0.00",
      parentProductId: null,
      productId: "product_2",
      productName: "Product Two",
      referenceMonth: "2026-05-01",
      returnsQuantity: 0,
      salePrice: "80.00",
      salesQuantity: 0,
      shippingFee: "0.00",
      shippingOrFixedFeeSource: "none",
      shippingOrFixedFeeUnit: "0.00",
      shippingUnit: "0.00",
      sku: "XYZ-1",
      unitCost: "0.00",
      variationLabel: null,
    },
  ],
  productCosts: [],
  productRows: [
    {
      actualRoas: "20.00",
      adSpend: "10.00",
      channel: "mercadolivre",
      contributionMargin: "120.00",
      dataSource: "monthly_performance",
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
      packagingCost: "4.00",
      productCost: "50.00",
      productId: "product_1",
      revenue: "200.00",
      returns: 1,
      roi: "260.00",
      salePrice: "100.00",
      sales: 2,
      shippingCost: "12.00",
      sku: "ABC-1",
      taxAmount: "18.00",
      totalProfit: "120.00",
      unitProfit: "60.00",
    },
    {
      actualRoas: "0.00",
      adSpend: "0.00",
      channel: "unknown",
      contributionMargin: "0.00",
      dataSource: "sync",
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
  scope: {
    companyId: "company_1",
    companyRequired: false,
    referenceMonth: "2026-05-01",
    taxRateDefault: "0.090000",
  },
  products: [
    {
      catalogGroupKey: "mercadolivre:MLB-1",
      catalogRole: "parent",
      companyId: "company_1",
      coverImageUrl: "https://example.com/product-one.png",
      createdAt: "2026-05-01T10:00:00.000Z",
      children: [
        {
          catalogGroupKey: "mercadolivre:MLB-1",
          catalogRole: "child",
          companyId: "company_1",
          coverImageUrl: "https://example.com/product-variation.png",
          createdAt: "2026-05-01T10:00:00.000Z",
          children: [],
          derivedFromProvider: "mercadolivre",
          financeDefaults: null,
          id: "product_1a",
          images: [],
          isActive: true,
          isSyntheticParent: false,
          latestCost: null,
          name: "Product One - Azul",
          organizationId: "org_123",
          parentProductId: "product_1",
          sellingPrice: "100.00",
          sku: "ABC-1-AZ",
          updatedAt: "2026-05-01T10:00:00.000Z",
          variationLabel: "Cor: Azul",
        },
      ],
      derivedFromProvider: "mercadolivre",
      financeDefaults: null,
      id: "product_1",
      images: [],
      isActive: true,
      isSyntheticParent: false,
      latestCost: {
        amount: "25.00",
        companyId: "company_1",
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
      parentProductId: null,
      sellingPrice: "100.00",
      sku: "ABC-1",
      updatedAt: "2026-05-01T10:00:00.000Z",
      variationLabel: null,
    },
    {
      catalogGroupKey: null,
      catalogRole: "standalone",
      companyId: "company_1",
      coverImageUrl: null,
      createdAt: "2026-05-01T10:00:00.000Z",
      children: [],
      derivedFromProvider: null,
      financeDefaults: null,
      id: "product_2",
      images: [],
      isActive: true,
      isSyntheticParent: false,
      latestCost: null,
      name: "Product Two",
      organizationId: "org_123",
      parentProductId: null,
      sellingPrice: "80.00",
      sku: "XYZ-1",
      updatedAt: "2026-05-01T10:00:00.000Z",
      variationLabel: null,
    },
  ],
  syncedProducts: [
    {
      externalProductId: "MLB-1",
      fixedFee: "5.00",
      grossRevenue: "200.00",
      id: "external_1",
      lastOrderedAt: "2026-05-01T11:00:00.000Z",
      latestUnitPrice: "100.00",
      linkedProduct: null,
      marketplaceCommission: "20.00",
      netMarketplaceTake: "37.00",
      orderCount: 1,
      provider: "mercadolivre",
      reviewStatus: "unreviewed",
      sku: "XYZ-1",
      shippingCost: "12.00",
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
        actualRoas: 10,
        adSpend: 10,
        advertisingCost: 10,
        catalogRole: "parent",
        channelLabel: "mercadolivre",
        children: [
          expect.objectContaining({
            catalogRole: "child",
            parentProductId: "product_1",
            variationLabel: "Cor: Azul",
          }),
        ],
        commissionPct: 10,
        contributionMarginRatio: 0.4,
        coverImageUrl: "https://example.com/product-one.png",
        isActive: true,
        isSyntheticParent: false,
        minimumRoas: 2.5,
        name: "Product One",
        netLiquidSales: 1,
        packagingCost: 4,
        performanceId: "perf_1",
        revenue: 100,
        returns: 1,
        roiRatio: 1.6,
        sales: 2,
        shipping: 12,
        taxPct: 9,
        totalPackagingCost: 4,
        totalProductCost: 25,
        totalProfit: 40,
        unitCost: 25,
        unitProfit: 40,
      }),
      expect.objectContaining({
        actualRoas: null,
        adSpend: 0,
        advertisingCost: 0,
        catalogRole: "standalone",
        channelLabel: "unknown",
        children: [],
        commissionPct: 0,
        contributionMarginRatio: null,
        coverImageUrl: null,
        isActive: true,
        isSyntheticParent: false,
        minimumRoas: null,
        name: "Product Two",
        netLiquidSales: 0,
        performanceId: "perf_2",
        revenue: 0,
        roiRatio: null,
        taxPct: 9,
        totalPackagingCost: 0,
        totalProductCost: 0,
        totalProfit: 0,
        unitCost: 0,
        unitProfit: null,
      }),
    ]);
  });

  it("derives product insights from the official analytics snapshot", () => {
    const insights = buildProductInsights(
      snapshot,
      snapshot.catalogStats,
      buildProductTableRows(snapshot),
    );

    expect(insights).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          href: "/app/products",
          id: "best-profit-product",
        }),
        expect.objectContaining({
          href: "/app/products",
          id: "highest-returns-product",
        }),
        expect.objectContaining({
          href: "/app/products",
          id: "highest-shipping-product",
        }),
      ]),
    );
  });

  it("prefers analytics commission totals when building a monthly performance row", () => {
    const commissionSnapshot = structuredClone(snapshot);
    const product = structuredClone(snapshot.products[1]);
    product.id = "product_acc";
    product.catalogRole = "standalone";
    product.name = "Acessório De Celular";
    product.sku = "ACESSORIO-AZUL";
    product.children = [];

    const monthlyPerformanceRow = structuredClone(snapshot.monthlyPerformanceRows[1]);
    monthlyPerformanceRow.id = "perf_acc";
    monthlyPerformanceRow.channel = "mercadolivre";
    monthlyPerformanceRow.productId = "product_acc";
    monthlyPerformanceRow.productName = "Acessório De Celular";
    monthlyPerformanceRow.sku = "ACESSORIO-AZUL";
    monthlyPerformanceRow.salesQuantity = 3;
    monthlyPerformanceRow.returnsQuantity = 0;
    monthlyPerformanceRow.salePrice = "29.90";
    monthlyPerformanceRow.commissionRate = "0.117600";
    monthlyPerformanceRow.marketplaceCommission = "3.51";
    monthlyPerformanceRow.unitCost = "23.00";
    monthlyPerformanceRow.shippingFee = "0.00";
    monthlyPerformanceRow.packagingCost = "0.00";

    commissionSnapshot.products = [product];
    commissionSnapshot.monthlyPerformanceRows = [monthlyPerformanceRow];
    commissionSnapshot.performanceRows = [];
    commissionSnapshot.productRows = [
      {
        ...structuredClone(snapshot.productRows[1]),
        channel: "mercadolivre",
        marketplaceCommission: "31.62",
        name: "Acessório De Celular",
        netSales: 3,
        productId: "product_acc",
        revenue: "89.70",
        sales: 3,
        salePrice: "29.90",
        sku: "ACESSORIO-AZUL",
        returns: 0,
      },
    ];

    const [row] = buildProductTableRows(commissionSnapshot);

    expect(row).toEqual(
      expect.objectContaining({
        name: "Acessório De Celular",
        netLiquidSales: 3,
        sku: "ACESSORIO-AZUL",
        totalCommission: 31.62,
      }),
    );
    expect(row.commissionPct).toBeCloseTo(35.25, 2);
  });

  it("maps composition unit fields without multiplying them by sales", () => {
    const [row] = buildProductTableRows(snapshot);

    expect(row).toEqual(
      expect.objectContaining({
        fixedFeeUnit: 5,
        marketplaceCommissionUnit: 10,
        shippingOrFixedFeeSource: "shipping",
        shippingOrFixedFeeUnit: 12,
        shippingUnit: 12,
      }),
    );
  });

  it("computes net revenue subtracting commission and shipping/fixed fee totals", () => {
    const [baseRow] = buildProductTableRows(snapshot);
    const row = {
      ...baseRow,
      catalogRole: "standalone" as const,
      children: [],
      netLiquidSales: 3,
      revenue: 89.7,
      shippingOrFixedFeeUnit: 6.65,
      totalCommission: 11.67,
    };

    expect(computeRowNetRevenue(row)).toBeCloseTo(58.08, 2);
  });

  it("falls back to monthly performance commission totals when MELI analytics total is unavailable", () => {
    const commissionSnapshot = structuredClone(snapshot);
    const product = structuredClone(snapshot.products[1]);
    product.id = "product_acc";
    product.catalogRole = "standalone";
    product.name = "Acessório De Celular";
    product.sku = "ACESSORIO-AZUL";
    product.children = [];

    const monthlyPerformanceRow = structuredClone(snapshot.monthlyPerformanceRows[1]);
    monthlyPerformanceRow.id = "perf_acc";
    monthlyPerformanceRow.channel = "mercadolivre";
    monthlyPerformanceRow.productId = "product_acc";
    monthlyPerformanceRow.productName = "Acessório De Celular";
    monthlyPerformanceRow.sku = "ACESSORIO-AZUL";
    monthlyPerformanceRow.salesQuantity = 3;
    monthlyPerformanceRow.returnsQuantity = 0;
    monthlyPerformanceRow.salePrice = "29.90";
    monthlyPerformanceRow.commissionRate = "0.117600";
    monthlyPerformanceRow.marketplaceCommission = "3.51";
    monthlyPerformanceRow.unitCost = "23.00";
    monthlyPerformanceRow.shippingFee = "0.00";
    monthlyPerformanceRow.packagingCost = "0.00";

    commissionSnapshot.products = [product];
    commissionSnapshot.monthlyPerformanceRows = [monthlyPerformanceRow];
    commissionSnapshot.performanceRows = [];
    commissionSnapshot.productRows = [
      {
        ...structuredClone(snapshot.productRows[1]),
        channel: "mercadolivre",
        marketplaceCommission: "0.00",
        name: "Acessório De Celular",
        netSales: 999,
        productId: "product_acc",
        revenue: "89.70",
        sales: 3,
        salePrice: "29.90",
        sku: "ACESSORIO-AZUL",
        returns: 0,
      },
    ];

    const [row] = buildProductTableRows(commissionSnapshot);

    expect(row.totalCommission).toBeCloseTo(10.53, 2);
    expect(row.commissionPct).toBeCloseTo((10.53 / 89.7) * 100, 2);
  });

  it("does not apply MELI commission total override to non-MELI channels", () => {
    const commissionSnapshot = structuredClone(snapshot);
    const product = structuredClone(snapshot.products[1]);
    product.id = "product_shopee";
    product.catalogRole = "standalone";
    product.name = "Produto Shopee";
    product.sku = "SHOPEE-1";
    product.children = [];

    const monthlyPerformanceRow = structuredClone(snapshot.monthlyPerformanceRows[1]);
    monthlyPerformanceRow.id = "perf_shopee";
    monthlyPerformanceRow.channel = "shopee";
    monthlyPerformanceRow.productId = "product_shopee";
    monthlyPerformanceRow.productName = "Produto Shopee";
    monthlyPerformanceRow.sku = "SHOPEE-1";
    monthlyPerformanceRow.salesQuantity = 3;
    monthlyPerformanceRow.returnsQuantity = 0;
    monthlyPerformanceRow.salePrice = "29.90";
    monthlyPerformanceRow.commissionRate = "0.117600";
    monthlyPerformanceRow.marketplaceCommission = "3.51";
    monthlyPerformanceRow.unitCost = "23.00";
    monthlyPerformanceRow.shippingFee = "0.00";
    monthlyPerformanceRow.packagingCost = "0.00";

    commissionSnapshot.products = [product];
    commissionSnapshot.monthlyPerformanceRows = [monthlyPerformanceRow];
    commissionSnapshot.performanceRows = [];
    commissionSnapshot.productRows = [
      {
        ...structuredClone(snapshot.productRows[1]),
        channel: "shopee",
        marketplaceCommission: "31.62",
        name: "Produto Shopee",
        netSales: 3,
        productId: "product_shopee",
        revenue: "89.70",
        sales: 3,
        salePrice: "29.90",
        sku: "SHOPEE-1",
        returns: 0,
      },
    ];

    const [row] = buildProductTableRows(commissionSnapshot);

    expect(row.totalCommission).toBeCloseTo(10.53, 2);
    expect(row.commissionPct).toBeCloseTo((10.53 / 89.7) * 100, 2);
  });

  it("groups child monthly performance rows under the parent when catalog hierarchy exists", () => {
    const aggregationSnapshot = structuredClone(snapshot);
    const parent = structuredClone(snapshot.products[0]);
    parent.id = "product_parent";
    parent.catalogRole = "parent";
    parent.name = "Produto Pai";
    parent.sku = "PAI-001";
    parent.sellingPrice = "29.90";
    parent.children = [
      {
        ...structuredClone(snapshot.products[0]),
        catalogRole: "child",
        id: "product_child",
        name: "Produto Pai - Azul",
        parentProductId: "product_parent",
        sku: "PAI-001-AZ",
        sellingPrice: "29.90",
        variationLabel: "Cor: Azul",
        children: [],
      },
    ];

    const childRow: (typeof snapshot.monthlyPerformanceRows)[number] = {
      advertisingCost: "0.00",
      channel: "mercadolivre",
      commissionRate: "0.176000",
      id: "perf_child",
      marketplaceCommission: "10.54",
      packagingCost: "0.00",
      productId: "product_child",
      productName: "Produto Pai - Azul",
      referenceMonth: "2026-05-01",
      returnsQuantity: 0,
      salePrice: "29.90",
      salesQuantity: 4,
      shippingFee: "0.00",
      sku: "PAI-001-AZ",
      unitCost: "23.00",
    };

    aggregationSnapshot.products = [parent];
    aggregationSnapshot.monthlyPerformanceRows = [childRow];
    aggregationSnapshot.performanceRows = [];
    aggregationSnapshot.productRows = [
      {
        ...structuredClone(snapshot.productRows[1]),
        channel: "mercadolivre",
        marketplaceCommission: "21.08",
        name: "Produto Pai",
        netSales: 4,
        productId: "product_parent",
        revenue: "239.20",
        sales: 4,
        salePrice: "59.80",
        sku: "PAI-001",
        returns: 0,
      },
      {
        ...structuredClone(snapshot.productRows[1]),
        channel: "mercadolivre",
        marketplaceCommission: "42.16",
        name: "Produto Pai - Azul",
        netSales: 4,
        productId: "product_child",
        revenue: "119.60",
        sales: 4,
        salePrice: "29.90",
        sku: "PAI-001-AZ",
        returns: 0,
      },
    ];

    const rows = buildProductTableRows(aggregationSnapshot);
    const parentRow = rows.find((row) => row.productId === "product_parent");
    const childRowResult = rows.find((row) => row.productId === "product_child");

    expect(parentRow).toBeDefined();
    expect(parentRow?.catalogRole).toBe("parent");
    expect(parentRow?.children).toHaveLength(1);
    expect(parentRow?.children[0]?.catalogRole).toBe("child");
    expect(parentRow?.children[0]?.productId).toBe("product_child");
    expect(parentRow?.totalCommission).toBeCloseTo(42.16, 2);
    expect(parentRow?.commissionPct).toBeCloseTo((42.16 / 119.6) * 100, 2);
    expect(childRowResult).toBeUndefined();
  });
});
