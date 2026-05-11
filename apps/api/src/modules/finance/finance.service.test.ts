import { describe, expect, it, vi } from "vitest";
import { dailyMetrics, productMetrics } from "@marginflow/database";
import { FinanceService, normalizeSku, selectLatestProductCost, toMetricDate } from "./finance.service";

type TransactionMock = {
  delete: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
};

function createFinanceServiceFixture() {
  const deleteWhere = vi.fn().mockResolvedValue(undefined);
  const dailyInsertValues = vi.fn().mockResolvedValue(undefined);
  const productInsertValues = vi.fn().mockResolvedValue(undefined);
  const tx: TransactionMock = {
    delete: vi.fn(() => ({
      where: deleteWhere,
    })),
    insert: vi.fn((table: unknown) => {
      if (table === dailyMetrics) {
        return {
          values: dailyInsertValues,
        };
      }

      if (table === productMetrics) {
        return {
          values: productInsertValues,
        };
      }

      throw new Error("Unexpected insert target.");
    }),
  };
  const db = {
    query: {
      adCosts: {
        findMany: vi.fn(),
      },
      dailyMetrics: {
        findMany: vi.fn(),
      },
      externalOrders: {
        findMany: vi.fn(),
      },
      externalProducts: {
        findMany: vi.fn(),
      },
      manualExpenses: {
        findMany: vi.fn(),
      },
      productMetrics: {
        findMany: vi.fn(),
      },
      products: {
        findMany: vi.fn(),
      },
    },
    select: vi.fn(),
    transaction: vi.fn(async (callback: (transaction: TransactionMock) => Promise<void>) =>
      callback(tx),
    ),
  };

  return {
    dailyInsertValues,
    db,
    deleteWhere,
    productInsertValues,
    service: new FinanceService(db as never),
    tx,
  };
}

describe("finance service helpers", () => {
  it("normalizes SKU values for marketplace matching", () => {
    expect(normalizeSku(" abc-1 ")).toBe("ABC-1");
    expect(normalizeSku("")).toBeNull();
    expect(normalizeSku(null)).toBeNull();
  });

  it("selects the latest product cost by effective date and creation date", () => {
    expect(
      selectLatestProductCost([
        {
          amount: "10.00",
          createdAt: new Date("2026-04-28T10:00:00.000Z"),
          effectiveFrom: "2026-04-20",
        },
        {
          amount: "25.00",
          createdAt: new Date("2026-04-29T10:00:00.000Z"),
          effectiveFrom: "2026-04-28",
        },
      ]),
    ).toBe("25.00");
    expect(selectLatestProductCost([])).toBe("0.00");
  });

  it("converts dates into persisted metric-day strings", () => {
    expect(toMetricDate(new Date("2026-04-28T10:00:00.000Z"))).toBe("2026-04-28");
    expect(toMetricDate("2026-04-29T10:00:00.000Z")).toBe("2026-04-29");
    expect(toMetricDate(null)).toBeNull();
  });
});

describe("FinanceService", () => {
  it("builds dashboard read models with SKU mapping, rollups, and daily bucketing", async () => {
    const { db, service } = createFinanceServiceFixture();
    const externalProductsSelectWhere = vi.fn().mockResolvedValue([
      {
        id: "external_product_1",
        linkedProductId: null,
        sku: "abc-1",
      },
      {
        id: "external_product_2",
        linkedProductId: null,
        sku: "MISSING",
      },
      {
        id: "external_product_3",
        linkedProductId: null,
        sku: "XYZ-1",
      },
    ]);
    const externalProductsSelectFrom = vi.fn(() => ({
      where: externalProductsSelectWhere,
    }));
    db.select.mockReturnValue({
      from: externalProductsSelectFrom,
    });
    db.query.products.findMany.mockResolvedValue([
      {
        createdAt: new Date("2026-04-28T10:00:00.000Z"),
        id: "product_1",
        isActive: true,
        name: "Product One",
        organizationId: "org_123",
        productCosts: [
          {
            amount: "20.00",
            createdAt: new Date("2026-04-20T10:00:00.000Z"),
            effectiveFrom: "2026-04-20",
          },
          {
            amount: "25.00",
            createdAt: new Date("2026-04-28T10:00:00.000Z"),
            effectiveFrom: "2026-04-28",
          },
        ],
        sellingPrice: "100.00",
        sku: "ABC-1",
      },
      {
        createdAt: new Date("2026-04-28T10:00:00.000Z"),
        id: "product_2",
        isActive: true,
        name: "Product Two",
        organizationId: "org_123",
        productCosts: [],
        sellingPrice: "50.00",
        sku: "XYZ-1",
      },
    ]);
    db.query.externalOrders.findMany.mockResolvedValue([
      {
        createdAt: new Date("2026-04-28T10:00:00.000Z"),
        fees: [{ amount: "30.00", feeType: "marketplace", id: "fee_1" }],
        id: "order_1",
        items: [
          {
            externalProductId: "external_product_1",
            id: "item_1",
            quantity: 2,
            totalPrice: "200.00",
            unitPrice: "100.00",
          },
          {
            externalProductId: "external_product_2",
            id: "item_2",
            quantity: 1,
            totalPrice: "100.00",
            unitPrice: "100.00",
          },
        ],
        orderedAt: new Date("2026-04-28T10:00:00.000Z"),
        provider: "mercadolivre",
        totalAmount: "300.00",
      },
      {
        createdAt: new Date("2026-04-29T10:00:00.000Z"),
        fees: [{ amount: "5.00", feeType: "marketplace", id: "fee_2" }],
        id: "order_2",
        items: [
          {
            externalProductId: "external_product_3",
            id: "item_3",
            quantity: 1,
            totalPrice: "50.00",
            unitPrice: "50.00",
          },
        ],
        orderedAt: new Date("2026-04-29T10:00:00.000Z"),
        provider: "shopee",
        totalAmount: "50.00",
      },
    ]);
    db.query.adCosts.findMany.mockResolvedValue([
      {
        amount: "10.00",
        channel: "mercadolivre",
        createdAt: new Date("2026-04-28T10:00:00.000Z"),
        currency: "BRL",
        id: "ad_1",
        notes: null,
        organizationId: "org_123",
        productId: "product_1",
        spentAt: "2026-04-28",
        updatedAt: new Date("2026-04-28T10:00:00.000Z"),
      },
      {
        amount: "3.00",
        channel: "shopee",
        createdAt: new Date("2026-04-29T10:00:00.000Z"),
        currency: "BRL",
        id: "ad_2",
        notes: null,
        organizationId: "org_123",
        productId: null,
        spentAt: "2026-04-29",
        updatedAt: new Date("2026-04-29T10:00:00.000Z"),
      },
    ]);
    db.query.manualExpenses.findMany.mockResolvedValue([
      {
        amount: "40.00",
        category: "operations",
        createdAt: new Date("2026-04-28T10:00:00.000Z"),
        currency: "BRL",
        id: "expense_1",
        incurredAt: "2026-04-28",
        notes: null,
        organizationId: "org_123",
        updatedAt: new Date("2026-04-28T10:00:00.000Z"),
      },
      {
        amount: "7.00",
        category: "software",
        createdAt: new Date("2026-04-29T10:00:00.000Z"),
        currency: "BRL",
        id: "expense_2",
        incurredAt: "2026-04-29",
        notes: null,
        organizationId: "org_123",
        updatedAt: new Date("2026-04-29T10:00:00.000Z"),
      },
    ]);
    const readModel = await service.buildDashboardReadModel("org_123");

    expect(readModel.summary).toEqual(
      expect.objectContaining({
        breakEvenRevenue: "65.28",
        breakEvenUnits: "0.75",
        contributionMargin: "252.00",
        grossRevenue: "350.00",
        netProfit: "205.00",
        totalAdCosts: "13.00",
        totalCogs: "50.00",
        totalFees: "35.00",
        totalManualExpenses: "47.00",
      }),
    );
    expect(readModel.daily).toEqual([
      expect.objectContaining({
        metricDate: "2026-04-28",
        summary: expect.objectContaining({
          grossRevenue: "300.00",
          netProfit: "170.00",
        }),
      }),
      expect.objectContaining({
        metricDate: "2026-04-29",
        summary: expect.objectContaining({
          grossRevenue: "50.00",
          netProfit: "35.00",
        }),
      }),
    ]);
    expect(readModel.channels).toEqual([
      expect.objectContaining({
        channel: "mercadolivre",
        summary: expect.objectContaining({
          grossRevenue: "300.00",
          netProfit: "210.00",
        }),
      }),
      expect.objectContaining({
        channel: "shopee",
        summary: expect.objectContaining({
          grossRevenue: "50.00",
          netProfit: "42.00",
        }),
      }),
    ]);
    expect(readModel.productProfitability).toEqual([
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
    expect(db.select).toHaveBeenCalledTimes(1);
    expect(externalProductsSelectFrom).toHaveBeenCalledTimes(1);
    expect(externalProductsSelectWhere).toHaveBeenCalledTimes(1);
  });

  it("falls back to legacy external product columns when review-link fields are missing", async () => {
    const { db, service } = createFinanceServiceFixture();
    const legacyExternalProductsWhere = vi.fn().mockResolvedValue([
      {
        id: "external_product_1",
        sku: "ABC-1",
      },
    ]);
    const legacyExternalProductsFrom = vi.fn(() => ({
      where: legacyExternalProductsWhere,
    }));
    const modernExternalProductsFrom = vi.fn(() => {
      const error = new Error('column "linked_product_id" does not exist') as Error & {
        code?: string;
      };
      error.code = "42703";
      throw error;
    });
    db.select
      .mockImplementationOnce(() => ({
        from: modernExternalProductsFrom,
      }))
      .mockImplementationOnce(() => ({
        from: legacyExternalProductsFrom,
      }));
    db.query.products.findMany.mockResolvedValue([
      {
        createdAt: new Date("2026-04-28T10:00:00.000Z"),
        id: "product_1",
        isActive: true,
        name: "Product One",
        organizationId: "org_123",
        productCosts: [],
        sellingPrice: "100.00",
        sku: "ABC-1",
      },
    ]);
    db.query.externalOrders.findMany.mockResolvedValue([
      {
        createdAt: new Date("2026-04-28T10:00:00.000Z"),
        fees: [],
        id: "order_1",
        items: [
          {
            externalProductId: "external_product_1",
            id: "item_1",
            quantity: 1,
            totalPrice: "100.00",
            unitPrice: "100.00",
          },
        ],
        orderedAt: new Date("2026-04-28T10:00:00.000Z"),
        provider: "mercadolivre",
        totalAmount: "100.00",
      },
    ]);
    db.query.adCosts.findMany.mockResolvedValue([]);
    db.query.manualExpenses.findMany.mockResolvedValue([]);

    const readModel = await service.buildDashboardReadModel("org_123");

    expect(readModel.summary.grossRevenue).toBe("100.00");
    expect(db.select).toHaveBeenCalledTimes(2);
    expect(legacyExternalProductsWhere).toHaveBeenCalledTimes(1);
  });

  it("re-materializes daily and product metrics deterministically for the organization", async () => {
    const { dailyInsertValues, db, deleteWhere, productInsertValues, service, tx } =
      createFinanceServiceFixture();
    vi.spyOn(service, "buildDashboardReadModel").mockResolvedValue({
      channels: [],
      daily: [
        {
          metricDate: "2026-04-28",
          ordersCount: 2,
          summary: {
            avgRoi: "58.33",
            avgRoas: "20.00",
            avgTicket: "50.00",
            breakEvenRevenue: "10.00",
            breakEvenUnits: "1.00",
            contributionMargin: "25.00",
            grossMarginPercent: "30.00",
            grossProfit: "30.00",
            grossRevenue: "100.00",
            netProfit: "20.00",
            netRevenue: "100.00",
            ordersCount: 2,
            totalReturns: 0,
            totalAdCosts: "5.00",
            totalCogs: "60.00",
            totalFees: "10.00",
            totalManualExpenses: "5.00",
            unitsSold: 3,
          },
        },
      ],
      productProfitability: [],
      products: [
        {
          metricDate: "2026-04-28",
          productId: "product_1",
          productName: "Product One",
          sku: "ABC-1",
          summary: {
            avgRoi: "100.00",
            avgRoas: "10.00",
            avgTicket: "0.00",
            breakEvenRevenue: "0.00",
            breakEvenUnits: "0.00",
            contributionMargin: "20.00",
            grossMarginPercent: "40.00",
            grossProfit: "20.00",
            grossRevenue: "50.00",
            netProfit: "15.00",
            netRevenue: "50.00",
            ordersCount: 0,
            totalReturns: 0,
            totalAdCosts: "5.00",
            totalCogs: "20.00",
            totalFees: "10.00",
            totalManualExpenses: "0.00",
            unitsSold: 2,
          },
        },
      ],
      summary: {
        avgRoi: "58.33",
        avgRoas: "20.00",
        avgTicket: "50.00",
        breakEvenRevenue: "10.00",
        breakEvenUnits: "1.00",
        contributionMargin: "25.00",
        grossMarginPercent: "30.00",
        grossProfit: "30.00",
        grossRevenue: "100.00",
        netProfit: "20.00",
        netRevenue: "100.00",
        ordersCount: 2,
        totalReturns: 0,
        totalAdCosts: "5.00",
        totalCogs: "60.00",
        totalFees: "10.00",
        totalManualExpenses: "5.00",
        unitsSold: 3,
      },
    });

    await service.materializeOrganizationMetrics("org_123");
    await service.materializeOrganizationMetrics("org_123");

    expect(db.transaction).toHaveBeenCalledTimes(2);
    expect(tx.delete).toHaveBeenCalledTimes(4);
    expect(deleteWhere).toHaveBeenCalledTimes(4);
    expect(dailyInsertValues).toHaveBeenCalledWith([
      expect.objectContaining({
        grossRevenue: "100.00",
        metricDate: "2026-04-28",
        netProfit: "20.00",
        organizationId: "org_123",
      }),
    ]);
    expect(productInsertValues).toHaveBeenCalledWith([
      expect.objectContaining({
        grossRevenue: "50.00",
        metricDate: "2026-04-28",
        netProfit: "15.00",
        organizationId: "org_123",
        productId: "product_1",
      }),
    ]);
  });
});
