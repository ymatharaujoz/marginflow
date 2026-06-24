import { BadRequestException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SyncPerformanceMaterializerService } from "./sync-performance-materializer.service";

function createTxInsertMock(calls: Array<Record<string, unknown>>) {
  return vi.fn().mockImplementation(() => ({
    values: vi.fn().mockImplementation((value) => {
      calls.push(value as Record<string, unknown>);

      return {
        onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
      };
    }),
  }));
}

function createService() {
  const db = {
    query: {
      companies: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      externalOrders: {
        findMany: vi.fn(),
      },
      products: {
        findMany: vi.fn(),
      },
    },
    transaction: vi.fn(),
  };

  return {
    db,
    service: new SyncPerformanceMaterializerService(db as never),
  };
}

describe("SyncPerformanceMaterializerService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("matches normalized sku, groups by month, and ignores unmatched items", async () => {
    const { db, service } = createService();
    const insertedRows: Array<Record<string, unknown>> = [];

    db.query.companies.findMany.mockResolvedValue([
      {
        id: "company_1",
      },
    ]);
    db.query.products.findMany.mockResolvedValue([
      {
        createdAt: new Date("2026-05-01T10:00:00.000Z"),
        financeDefaults: {
          advertisingCost: "15.00",
          packagingCost: "2.00",
        },
        id: "product_1",
        isActive: true,
        name: "Produto ML",
        organizationId: "org_1",
        productCosts: [
          {
            amount: "35.00",
            createdAt: new Date("2026-05-01T10:00:00.000Z"),
            effectiveFrom: "2026-05-01",
          },
        ],
        sellingPrice: "120.00",
        sku: " sku-1 ",
        updatedAt: new Date("2026-05-01T10:00:00.000Z"),
      },
    ]);
    db.query.externalOrders.findMany.mockResolvedValue([
      {
        fees: [
          { amount: "15.00", feeType: "marketplace_commission" },
          { amount: "2.90", feeType: "fixed_fee" },
          { amount: "6.00", feeType: "shipping_cost" },
        ],
        items: [
          {
            externalProduct: {
              sku: "SKU-1",
            },
            quantity: 2,
            totalPrice: "200.00",
          },
          {
            externalProduct: {
              sku: "missing-sku",
            },
            quantity: 1,
            totalPrice: "90.00",
          },
        ],
        metadata: {
          tags: [],
        },
        orderedAt: "2026-05-15T12:00:00.000Z",
        status: "paid",
      },
      {
        fees: [
          { amount: "7.50", feeType: "marketplace_commission" },
          { amount: "3.00", feeType: "shipping_cost" },
        ],
        items: [
          {
            externalProduct: {
              sku: "sku-1",
            },
            quantity: 1,
            totalPrice: "100.00",
          },
        ],
        metadata: {
          tags: [],
        },
        orderedAt: "2026-06-02T12:00:00.000Z",
        status: "paid",
      },
    ]);
    db.transaction.mockImplementation(async (callback: (tx: { insert: ReturnType<typeof createTxInsertMock> }) => Promise<unknown>) =>
      callback({
        insert: createTxInsertMock(insertedRows),
      }),
    );

    await service.materializeForSync({
      organizationId: "org_1",
      providerSlug: "mercadolivre",
      syncRunId: "sync_1",
      userId: "user_1",
    });

    expect(insertedRows).toHaveLength(2);
    expect(insertedRows[0]).toEqual(
      expect.objectContaining({
        advertisingCost: "15.00",
        channel: "mercadolivre",
        commissionRate: "0.051700",
        companyId: "company_1",
        packagingCost: "2.00",
        productId: "product_1",
        productName: "Produto ML",
        referenceMonth: "2026-05-01",
        returnsQuantity: 0,
        salePrice: "100.00",
        salesQuantity: 2,
        shippingFee: "2.07",
        sku: "SKU-1",
        unitCost: "35.00",
        userId: "user_1",
      }),
    );
    expect(insertedRows[1]).toEqual(
      expect.objectContaining({
        referenceMonth: "2026-06-01",
        salesQuantity: 1,
      }),
    );
  });

  it("preserves manual fields on conflict by only updating marketplace-driven values", async () => {
    const { db, service } = createService();
    const conflictCalls: Array<Record<string, unknown>> = [];
    let conflictPayload: Record<string, unknown> | null = null;

    db.query.companies.findMany.mockResolvedValue([{ id: "company_1" }]);
    db.query.products.findMany.mockResolvedValue([
      {
        createdAt: new Date("2026-05-01T10:00:00.000Z"),
        financeDefaults: {
          advertisingCost: "9.00",
          packagingCost: "1.50",
        },
        id: "product_1",
        isActive: true,
        name: "Produto ML",
        organizationId: "org_1",
        productCosts: [],
        sellingPrice: "150.00",
        sku: "SKU-1",
        updatedAt: new Date("2026-05-01T10:00:00.000Z"),
      },
    ]);
    db.query.externalOrders.findMany.mockResolvedValue([
      {
        fees: [{ amount: "10.00", feeType: "marketplace_commission" }],
        items: [
          {
            externalProduct: {
              sku: "sku-1",
            },
            quantity: 2,
            totalPrice: "200.00",
          },
        ],
        metadata: {
          tags: [],
        },
        orderedAt: "2026-05-15T12:00:00.000Z",
        status: "paid",
      },
    ]);
    db.transaction.mockImplementation(async (callback: (tx: { insert: unknown }) => Promise<unknown>) =>
      callback({
        insert: vi.fn().mockImplementation(() => ({
          values: vi.fn().mockImplementation((value) => {
            conflictCalls.push(value as Record<string, unknown>);

            return {
              onConflictDoUpdate: vi.fn().mockImplementation((payload) => {
                conflictPayload = payload as Record<string, unknown>;
                return Promise.resolve(undefined);
              }),
            };
          }),
        })),
      }),
    );

    await service.materializeForSync({
      organizationId: "org_1",
      providerSlug: "mercadolivre",
      syncRunId: "sync_1",
      userId: "user_1",
    });

    expect(conflictCalls).toHaveLength(1);
    const conflictSet = conflictPayload?.["set"] as Record<string, unknown> | undefined;

    expect(conflictSet).toEqual(
      expect.objectContaining({
        commissionRate: "0.050000",
        productName: "Produto ML",
        returnsQuantity: 0,
        salePrice: "100.00",
        salesQuantity: 2,
        shippingFee: "0.00",
      }),
    );
    expect(conflictSet?.unitCost).toBeUndefined();
    expect(conflictSet?.taxRate).toBeUndefined();
    expect(conflictSet?.packagingCost).toBeUndefined();
    expect(conflictSet?.advertisingCost).toBeUndefined();
  });

  it("fails honestly when a single active company cannot be resolved", async () => {
    const { db, service } = createService();

    db.query.companies.findMany.mockResolvedValue([]);

    await expect(
      service.materializeForSync({
        organizationId: "org_1",
        providerSlug: "mercadolivre",
        syncRunId: "sync_1",
        userId: "user_1",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("increments returns only when the imported payload has an explicit return marker", async () => {
    const { db, service } = createService();
    const insertedRows: Array<Record<string, unknown>> = [];

    db.query.companies.findMany.mockResolvedValue([{ id: "company_1" }]);
    db.query.products.findMany.mockResolvedValue([
      {
        createdAt: new Date("2026-05-01T10:00:00.000Z"),
        financeDefaults: null,
        id: "product_1",
        isActive: true,
        name: "Produto ML",
        organizationId: "org_1",
        productCosts: [],
        sellingPrice: "120.00",
        sku: "SKU-1",
        updatedAt: new Date("2026-05-01T10:00:00.000Z"),
      },
    ]);
    db.query.externalOrders.findMany.mockResolvedValue([
      {
        fees: [{ amount: "9.00", feeType: "marketplace_commission" }],
        items: [
          {
            externalProduct: {
              sku: "SKU-1",
            },
            quantity: 2,
            totalPrice: "200.00",
          },
        ],
        metadata: {
          tags: ["paid"],
        },
        orderedAt: "2026-05-15T12:00:00.000Z",
        status: "paid",
      },
      {
        fees: [{ amount: "9.00", feeType: "marketplace_commission" }],
        items: [
          {
            externalProduct: {
              sku: "SKU-1",
            },
            quantity: 1,
            totalPrice: "100.00",
          },
        ],
        metadata: {
          tags: ["return_pending"],
        },
        orderedAt: "2026-05-16T12:00:00.000Z",
        status: "paid",
      },
    ]);
    db.transaction.mockImplementation(async (callback: (tx: { insert: ReturnType<typeof createTxInsertMock> }) => Promise<unknown>) =>
      callback({
        insert: createTxInsertMock(insertedRows),
      }),
    );

    await service.materializeForSync({
      organizationId: "org_1",
      providerSlug: "mercadolivre",
      syncRunId: "sync_1",
      userId: "user_1",
    });

    expect(insertedRows).toHaveLength(1);
    expect(insertedRows[0]).toEqual(
      expect.objectContaining({
        commissionRate: "0.045000",
        returnsQuantity: 1,
        salePrice: "100.00",
        salesQuantity: 3,
        shippingFee: "0.00",
      }),
    );
  });

  it("applies return markers per item variation before falling back to order-level markers", async () => {
    const { db, service } = createService();
    const insertedRows: Array<Record<string, unknown>> = [];

    db.query.companies.findMany.mockResolvedValue([{ id: "company_1" }]);
    db.query.products.findMany.mockResolvedValue([
      {
        createdAt: new Date("2026-05-01T10:00:00.000Z"),
        financeDefaults: null,
        id: "product_red",
        isActive: true,
        name: "Camiseta Vermelha",
        organizationId: "org_1",
        productCosts: [],
        sellingPrice: "120.00",
        sku: "SKU-RED",
        updatedAt: new Date("2026-05-01T10:00:00.000Z"),
      },
      {
        createdAt: new Date("2026-05-01T10:00:00.000Z"),
        financeDefaults: null,
        id: "product_blue",
        isActive: true,
        name: "Camiseta Azul",
        organizationId: "org_1",
        productCosts: [],
        sellingPrice: "120.00",
        sku: "SKU-BLUE",
        updatedAt: new Date("2026-05-01T10:00:00.000Z"),
      },
    ]);
    db.query.externalOrders.findMany.mockResolvedValue([
      {
        fees: [],
        items: [
          {
            externalProduct: { sku: "SKU-RED" },
            metadata: { returnQuantity: 1 },
            quantity: 1,
            totalPrice: "100.00",
          },
          {
            externalProduct: { sku: "SKU-BLUE" },
            metadata: {},
            quantity: 1,
            totalPrice: "120.00",
          },
        ],
        metadata: {
          tags: [],
        },
        orderedAt: "2026-05-16T12:00:00.000Z",
        status: "paid",
      },
    ]);
    db.transaction.mockImplementation(
      async (callback: (tx: { insert: ReturnType<typeof createTxInsertMock> }) => Promise<unknown>) =>
        callback({
          insert: createTxInsertMock(insertedRows),
        }),
    );

    await service.materializeForSync({
      organizationId: "org_1",
      providerSlug: "mercadolivre",
      syncRunId: "sync_1",
      userId: "user_1",
    });

    expect(insertedRows).toHaveLength(2);
    expect(insertedRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          returnsQuantity: 1,
          salesQuantity: 1,
          sku: "SKU-RED",
        }),
        expect.objectContaining({
          returnsQuantity: 0,
          salesQuantity: 1,
          sku: "SKU-BLUE",
        }),
      ]),
    );
  });

  it("materializes by linked product when order item sku is missing", async () => {
    const { db, service } = createService();
    const insertedRows: Array<Record<string, unknown>> = [];

    db.query.companies.findFirst.mockResolvedValue({
      id: "company_1",
      isActive: true,
      organizationId: "org_1",
      userId: "user_1",
    });
    db.query.products.findMany.mockResolvedValue([
      {
        companyId: "company_1",
        createdAt: new Date("2026-05-01T10:00:00.000Z"),
        financeDefaults: null,
        id: "product_blue",
        isActive: true,
        name: "Camiseta Azul",
        organizationId: "org_1",
        productCosts: [],
        sellingPrice: "120.00",
        sku: "SKU-BLUE",
        updatedAt: new Date("2026-05-01T10:00:00.000Z"),
      },
      {
        companyId: "company_2",
        createdAt: new Date("2026-05-01T10:00:00.000Z"),
        financeDefaults: null,
        id: "product_other_company",
        isActive: true,
        name: "Camiseta Azul Outra Empresa",
        organizationId: "org_1",
        productCosts: [],
        sellingPrice: "120.00",
        sku: "SKU-BLUE",
        updatedAt: new Date("2026-05-01T10:00:00.000Z"),
      },
    ]);
    db.query.externalOrders.findMany.mockResolvedValue([
      {
        fees: [],
        items: [
          {
            externalProduct: {
              linkedProductId: "product_blue",
              sku: null,
            },
            metadata: {},
            quantity: 1,
            totalPrice: "120.00",
          },
        ],
        metadata: {
          tags: [],
        },
        orderedAt: "2026-05-16T12:00:00.000Z",
        status: "paid",
      },
    ]);
    db.transaction.mockImplementation(
      async (callback: (tx: { insert: ReturnType<typeof createTxInsertMock> }) => Promise<unknown>) =>
        callback({
          insert: createTxInsertMock(insertedRows),
        }),
    );

    await service.materializeForSync({
      companyId: "company_1",
      organizationId: "org_1",
      providerSlug: "mercadolivre",
      syncRunId: "sync_1",
      userId: "user_1",
    });

    expect(insertedRows).toEqual([
      expect.objectContaining({
        companyId: "company_1",
        productId: "product_blue",
        productName: "Camiseta Azul",
        salesQuantity: 1,
        sku: "SKU-BLUE",
      }),
    ]);
  });

  it("keeps rows separate by linked product even when parent and variation share sku", async () => {
    const { db, service } = createService();
    const insertedRows: Array<Record<string, unknown>> = [];

    db.query.companies.findFirst.mockResolvedValue({
      id: "company_1",
      isActive: true,
      organizationId: "org_1",
      userId: "user_1",
    });
    db.query.products.findMany.mockResolvedValue([
      {
        companyId: "company_1",
        createdAt: new Date("2026-05-01T10:00:00.000Z"),
        financeDefaults: null,
        id: "product_parent",
        isActive: true,
        name: "Produto Pai",
        organizationId: "org_1",
        productCosts: [],
        sellingPrice: "120.00",
        sku: "SKU-SHARED",
        updatedAt: new Date("2026-05-01T10:00:00.000Z"),
      },
      {
        companyId: "company_1",
        createdAt: new Date("2026-05-01T10:00:00.000Z"),
        financeDefaults: null,
        id: "product_child",
        isActive: true,
        name: "Produto Filho",
        organizationId: "org_1",
        productCosts: [],
        sellingPrice: "120.00",
        sku: "SKU-SHARED",
        updatedAt: new Date("2026-05-01T10:00:00.000Z"),
      },
    ]);
    db.query.externalOrders.findMany.mockResolvedValue([
      {
        fees: [],
        items: [
          {
            externalProduct: {
              linkedProductId: "product_parent",
              sku: "SKU-SHARED",
            },
            metadata: {},
            quantity: 1,
            totalPrice: "120.00",
          },
          {
            externalProduct: {
              linkedProductId: "product_child",
              sku: "SKU-SHARED",
            },
            metadata: {},
            quantity: 1,
            totalPrice: "120.00",
          },
        ],
        metadata: {
          tags: [],
        },
        orderedAt: "2026-05-16T12:00:00.000Z",
        status: "paid",
      },
    ]);
    db.transaction.mockImplementation(
      async (callback: (tx: { insert: ReturnType<typeof createTxInsertMock> }) => Promise<unknown>) =>
        callback({
          insert: createTxInsertMock(insertedRows),
        }),
    );

    await service.materializeForSync({
      companyId: "company_1",
      organizationId: "org_1",
      providerSlug: "mercadolivre",
      syncRunId: "sync_1",
      userId: "user_1",
    });

    expect(insertedRows).toHaveLength(2);
    expect(insertedRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          productId: "product_parent",
          productName: "Produto Pai",
          salesQuantity: 1,
          sku: "SKU-SHARED",
        }),
        expect.objectContaining({
          productId: "product_child",
          productName: "Produto Filho",
          salesQuantity: 1,
          sku: "SKU-SHARED",
        }),
      ]),
    );
  });

  it("does not materialize unpaid Shopee orders as sales", async () => {
    const { db, service } = createService();
    const insertedRows: Array<Record<string, unknown>> = [];

    db.query.companies.findMany.mockResolvedValue([{ id: "company_1" }]);
    db.query.products.findMany.mockResolvedValue([
      {
        createdAt: new Date("2026-06-01T10:00:00.000Z"),
        financeDefaults: null,
        id: "product_1",
        isActive: true,
        name: "Produto Shopee",
        organizationId: "org_1",
        productCosts: [],
        sellingPrice: "100.00",
        sku: "SKU-1",
        updatedAt: new Date("2026-06-01T10:00:00.000Z"),
      },
    ]);
    db.query.externalOrders.findMany.mockResolvedValue([
      {
        fees: [{ amount: "15.00", feeType: "marketplace_commission" }],
        items: [
          {
            externalProduct: { sku: "SKU-1" },
            quantity: 1,
            totalPrice: "100.00",
          },
        ],
        metadata: { paid: false },
        orderedAt: "2026-06-12T12:00:00.000Z",
        status: "UNPAID",
      },
    ]);
    db.transaction.mockImplementation(
      async (callback: (tx: { insert: ReturnType<typeof createTxInsertMock> }) => Promise<unknown>) =>
        callback({ insert: createTxInsertMock(insertedRows) }),
    );

    await service.materializeForSync({
      organizationId: "org_1",
      providerSlug: "shopee",
      syncRunId: "sync_1",
      userId: "user_1",
    });

    expect(insertedRows).toHaveLength(0);
  });
});
