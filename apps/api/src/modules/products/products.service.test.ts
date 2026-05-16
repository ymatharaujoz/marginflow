import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProductsService } from "./products.service";

vi.mock("@/modules/integrations/synced-products.read-model", () => ({
  listSyncedProductsReadModel: vi.fn().mockResolvedValue([]),
}));

function createInsertMock(returnValue: unknown) {
  return vi.fn().mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([returnValue]),
    }),
  });
}

function createUpdateMock(returnValue: unknown) {
  return vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([returnValue]),
      }),
    }),
  });
}

function createService() {
  const db = {
    insert: vi.fn(),
    query: {
      adCosts: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      manualExpenses: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      productCosts: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      products: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      companies: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      productMonthlyPerformance: {
        findMany: vi.fn(),
      },
    },
    transaction: vi.fn(),
    update: vi.fn(),
  };

  const financeService = {
    buildFinanceSnapshot: vi.fn(),
    materializeOrganizationMetrics: vi.fn(),
  };
  const syncService = {
    getStatus: vi.fn(),
  };

  return {
    db,
    financeService,
    syncService,
    service: new ProductsService(
      db as never,
      financeService as never,
      syncService as never,
    ),
  };
}

describe("ProductsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns products with latest cost snapshots", async () => {
    const { db, financeService, service } = createService();

    db.query.products.findMany.mockResolvedValue([
      {
        createdAt: new Date("2026-04-28T10:00:00.000Z"),
        id: "product_1",
        isActive: true,
        name: "Notebook",
        organizationId: "org_1",
        sellingPrice: "120.00",
        sku: "NB-1",
        updatedAt: new Date("2026-04-28T10:00:00.000Z"),
      },
    ]);
    db.query.productCosts.findMany.mockResolvedValue([
      {
        amount: "54.00",
        costType: "base",
        createdAt: new Date("2026-04-28T12:00:00.000Z"),
        currency: "BRL",
        effectiveFrom: "2026-04-28",
        id: "cost_latest",
        notes: null,
        organizationId: "org_1",
        productId: "product_1",
        updatedAt: new Date("2026-04-28T12:00:00.000Z"),
      },
      {
        amount: "49.00",
        costType: "base",
        createdAt: new Date("2026-04-20T12:00:00.000Z"),
        currency: "BRL",
        effectiveFrom: "2026-04-20",
        id: "cost_old",
        notes: null,
        organizationId: "org_1",
        productId: "product_1",
        updatedAt: new Date("2026-04-20T12:00:00.000Z"),
      },
    ]);

    await expect(service.listProducts("org_1")).resolves.toEqual([
      expect.objectContaining({
        id: "product_1",
        latestCost: expect.objectContaining({
          amount: "54.00",
          id: "cost_latest",
        }),
        name: "Notebook",
      }),
    ]);
  });

  it("creates organization-scoped products", async () => {
    const { db, service } = createService();

    db.insert = createInsertMock({
      createdAt: new Date("2026-04-28T10:00:00.000Z"),
      id: "product_1",
      isActive: true,
      name: "Notebook",
      organizationId: "org_1",
      sellingPrice: "120.00",
      sku: "NB-1",
      updatedAt: new Date("2026-04-28T10:00:00.000Z"),
    });

    await expect(
      service.createProduct("org_1", {
        isActive: true,
        name: "Notebook",
        sellingPrice: "120.00",
        sku: "NB-1",
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        id: "product_1",
        organizationId: "org_1",
      }),
    );
  });

  it("creates a manual product with initial finance inputs in one flow", async () => {
    const { db, financeService, service } = createService();

    const createdProduct = {
      createdAt: new Date("2026-05-14T10:00:00.000Z"),
      id: "product_1",
      isActive: true,
      name: "Kit Mercado Livre",
      organizationId: "org_1",
      sellingPrice: "149.90",
      sku: "ML-001",
      updatedAt: new Date("2026-05-14T10:00:00.000Z"),
    };
    const createdCost = {
      amount: "80.00",
      costType: "base",
      createdAt: new Date("2026-05-14T10:01:00.000Z"),
      currency: "BRL",
      effectiveFrom: "2026-05-01",
      id: "cost_1",
      notes: "Cadastro manual inicial",
      organizationId: "org_1",
      productId: "product_1",
      updatedAt: new Date("2026-05-14T10:01:00.000Z"),
    };
    const createdPerformance = {
      advertisingCost: "15.00",
      channel: "mercadolivre",
      commissionRate: "0.000000",
      companyId: "11111111-1111-4111-8111-111111111111",
      createdAt: new Date("2026-05-14T10:02:00.000Z"),
      id: "perf_1",
      notes: "Cadastro manual inicial",
      organizationId: "org_1",
      packagingCost: "3.00",
      productName: "Kit Mercado Livre",
      referenceMonth: "2026-05-01",
      returnsQuantity: 0,
      salePrice: "149.90",
      salesQuantity: 0,
      shippingFee: "0.00",
      sku: "ML-001",
      taxRate: "0.120000",
      unitCost: "80.00",
      updatedAt: new Date("2026-05-14T10:02:00.000Z"),
      userId: "user_1",
    };

    db.transaction = vi.fn(async (callback) =>
      callback({
        insert: vi
          .fn()
          .mockReturnValueOnce({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([createdProduct]),
            }),
          })
          .mockReturnValueOnce({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([createdCost]),
            }),
          })
          .mockReturnValueOnce({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([createdPerformance]),
            }),
          }),
        query: {
          productMonthlyPerformance: {
            findFirst: vi.fn().mockResolvedValue(null),
          },
        },
        update: vi.fn(),
      }),
    );
    db.query.companies.findFirst.mockResolvedValue({
      code: "MAIN",
      createdAt: new Date("2026-05-01T10:00:00.000Z"),
      id: "11111111-1111-4111-8111-111111111111",
      isActive: true,
      name: "Empresa Principal",
      organizationId: "org_1",
      updatedAt: new Date("2026-05-01T10:00:00.000Z"),
      userId: "user_1",
    });
    financeService.materializeOrganizationMetrics = vi.fn().mockResolvedValue(undefined);

    await expect(
      service.createManualProduct(
        {
          organizationId: "org_1",
          userId: "user_1",
        },
        {
          initialFinance: {
            advertisingCost: "15.00",
            packagingCost: "3.00",
            taxRate: "0.120000",
            unitCost: "80.00",
          },
          product: {
            isActive: true,
            name: "Kit Mercado Livre",
            sellingPrice: "149.90",
            sku: "ML-001",
          },
          scope: {
            channel: "mercadolivre",
            companyId: "11111111-1111-4111-8111-111111111111",
            referenceMonth: "2026-05-01",
          },
        },
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        performance: expect.objectContaining({
          channel: "mercadolivre",
          referenceMonth: "2026-05-01",
          sku: "ML-001",
        }),
        product: expect.objectContaining({
          id: "product_1",
          sellingPrice: "149.90",
          sku: "ML-001",
        }),
        productCost: expect.objectContaining({
          amount: "80.00",
          productId: "product_1",
        }),
      }),
    );
    expect(financeService.materializeOrganizationMetrics).toHaveBeenCalledWith("org_1");
  });

  it("rejects manual product creation when company context is missing", async () => {
    const { db, service } = createService();

    db.query.companies.findFirst.mockResolvedValue(null);

    await expect(
      service.createManualProduct(
        {
          organizationId: "org_1",
          userId: "user_1",
        },
        {
          initialFinance: {
            advertisingCost: "15.00",
            packagingCost: "3.00",
            taxRate: "0.120000",
            unitCost: "80.00",
          },
          product: {
            isActive: true,
            name: "Kit Mercado Livre",
            sellingPrice: "149.90",
            sku: "ML-001",
          },
          scope: {
            channel: "mercadolivre",
            companyId: "22222222-2222-4222-8222-222222222222",
            referenceMonth: "2026-05-01",
          },
        },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("rejects manual product creation when company id is blank", async () => {
    const { service } = createService();

    await expect(
      service.createManualProduct(
        {
          organizationId: "org_1",
          userId: "user_1",
        },
        {
          initialFinance: {
            advertisingCost: "15.00",
            packagingCost: "3.00",
            taxRate: "0.120000",
            unitCost: "80.00",
          },
          product: {
            isActive: true,
            name: "Kit Mercado Livre",
            sellingPrice: "149.90",
            sku: "ML-001",
          },
          scope: {
            channel: "mercadolivre",
            companyId: "",
            referenceMonth: "2026-05-01",
          },
        } as never,
      ),
    ).rejects.toThrow(
      "Cadastre uma empresa ativa antes de salvar um produto manual com custos e impostos mensais.",
    );
  });

  it("rejects cross-organization product cost writes", async () => {
    const { db, service } = createService();

    db.query.products.findFirst.mockResolvedValue({
      id: "product_1",
      organizationId: "org_other",
    });

    await expect(
      service.createProductCost("org_1", {
        amount: "12.00",
        costType: "base",
        currency: "BRL",
        effectiveFrom: null,
        notes: null,
        productId: "product_1",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("updates product costs after validating organization ownership", async () => {
    const { db, service } = createService();

    db.query.productCosts.findFirst.mockResolvedValue({
      id: "cost_1",
      organizationId: "org_1",
    });
    db.query.products.findFirst.mockResolvedValue({
      id: "product_1",
      organizationId: "org_1",
    });
    db.update = createUpdateMock({
      amount: "22.00",
      costType: "packaging",
      createdAt: new Date("2026-04-28T12:00:00.000Z"),
      currency: "BRL",
      effectiveFrom: "2026-04-29",
      id: "cost_1",
      notes: "Updated",
      organizationId: "org_1",
      productId: "product_1",
      updatedAt: new Date("2026-04-29T12:00:00.000Z"),
    });

    await expect(
      service.updateProductCost("org_1", "cost_1", {
        amount: "22.00",
        costType: "packaging",
        effectiveFrom: "2026-04-29",
        notes: "Updated",
        productId: "product_1",
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        amount: "22.00",
        costType: "packaging",
        id: "cost_1",
      }),
    );
  });

  it("updates ad costs and manual expenses", async () => {
    const { db, service } = createService();

    db.query.adCosts.findFirst.mockResolvedValue({
      id: "ad_1",
      organizationId: "org_1",
    });
    db.query.manualExpenses.findFirst.mockResolvedValue({
      id: "expense_1",
      organizationId: "org_1",
    });
    db.update = vi
      .fn()
      .mockImplementationOnce(
        createUpdateMock({
          amount: "90.00",
          channel: "mercado-livre",
          createdAt: new Date("2026-04-28T12:00:00.000Z"),
          currency: "BRL",
          id: "ad_1",
          notes: null,
          organizationId: "org_1",
          productId: null,
          spentAt: "2026-04-29",
          updatedAt: new Date("2026-04-29T12:00:00.000Z"),
        }),
      )
      .mockImplementationOnce(
        createUpdateMock({
          amount: "45.00",
          category: "rent",
          createdAt: new Date("2026-04-28T12:00:00.000Z"),
          currency: "BRL",
          id: "expense_1",
          incurredAt: "2026-04-29",
          notes: "April rent",
          organizationId: "org_1",
          updatedAt: new Date("2026-04-29T12:00:00.000Z"),
        }),
      );

    await expect(
      service.updateAdCost("org_1", "ad_1", {
        amount: "90.00",
        channel: "mercado-livre",
        spentAt: "2026-04-29",
      }),
    ).resolves.toEqual(expect.objectContaining({ id: "ad_1" }));

    await expect(
      service.updateManualExpense("org_1", "expense_1", {
        amount: "45.00",
        category: "rent",
        incurredAt: "2026-04-29",
        notes: "April rent",
      }),
    ).resolves.toEqual(expect.objectContaining({ id: "expense_1" }));
  });

  it("throws not found when product does not exist", async () => {
    const { db, service } = createService();

    db.query.products.findFirst.mockResolvedValue(null);

    await expect(
      service.createProductCost("org_1", {
        amount: "12.00",
        costType: "base",
        currency: "BRL",
        effectiveFrom: null,
        notes: null,
        productId: "missing",
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("uses company-scoped monthly performance in analytics snapshots", async () => {
    const { db, financeService, service, syncService } = createService();

    const product = {
      createdAt: new Date("2026-05-01T10:00:00.000Z"),
      id: "11111111-1111-4111-8111-111111111111",
      isActive: true,
      name: "Notebook",
      organizationId: "org_1",
      sellingPrice: "100.00",
      sku: "NB-1",
      updatedAt: new Date("2026-05-01T10:00:00.000Z"),
    };

    db.query.companies.findFirst.mockResolvedValue({
      id: "22222222-2222-4222-8222-222222222222",
      organizationId: "org_1",
      userId: "user_1",
    });
    db.query.products.findMany.mockResolvedValue([product]);
    db.query.productCosts.findMany.mockResolvedValue([
      {
        amount: "25.00",
        costType: "base",
        createdAt: new Date("2026-05-01T10:00:00.000Z"),
        currency: "BRL",
        effectiveFrom: "2026-05-01",
        id: "cost_1",
        notes: null,
        organizationId: "org_1",
        productId: product.id,
        updatedAt: new Date("2026-05-01T10:00:00.000Z"),
      },
    ]);
    db.query.adCosts.findMany.mockResolvedValue([]);
    db.query.manualExpenses.findMany.mockResolvedValue([]);
    db.query.productMonthlyPerformance.findMany.mockResolvedValue([
      {
        advertisingCost: "10.00",
        channel: "mercadolivre",
        commissionRate: "0.100000",
        companyId: "22222222-2222-4222-8222-222222222222",
        createdAt: new Date("2026-05-01T10:00:00.000Z"),
        id: "perf_1",
        notes: null,
        organizationId: "org_1",
        packagingCost: "2.00",
        productName: "Notebook",
        referenceMonth: "2026-05-01",
        returnsQuantity: 1,
        salePrice: "100.00",
        salesQuantity: 3,
        shippingFee: "6.00",
        sku: "NB-1",
        taxRate: "0.090000",
        unitCost: "25.00",
        updatedAt: new Date("2026-05-01T10:00:00.000Z"),
        userId: "user_1",
      },
    ]);

    financeService.buildFinanceSnapshot.mockResolvedValue({
      adCosts: [],
      manualExpenses: [],
      orders: [],
      products: [
        {
          id: product.id,
          isActive: true,
          name: "Notebook",
          sellingPrice: "100.00",
          sku: "NB-1",
          unitCost: "25.00",
        },
      ],
    });
    syncService.getStatus.mockResolvedValue({
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
    });

    const snapshot = await service.getAnalyticsSnapshot(
      {
        organizationId: "org_1",
        userId: "user_1",
      },
      {
        companyId: "22222222-2222-4222-8222-222222222222",
        referenceMonth: "2026-05-01",
      },
    );

    expect(snapshot.dataGaps).toEqual([]);
    expect(snapshot.mercadoLivreSyncStatus).toEqual(
      expect.objectContaining({
        availability: expect.objectContaining({
          provider: "mercadolivre",
          reason: "available",
        }),
        lastCompletedRun: null,
      }),
    );
    expect(snapshot.scope).toEqual({
      companyId: "22222222-2222-4222-8222-222222222222",
      companyRequired: false,
      referenceMonth: "2026-05-01",
    });
    expect(snapshot.productRows).toEqual([
      expect.objectContaining({
        dataSource: "monthly_performance",
        netSales: 2,
        packagingCost: "4.00",
        returns: 1,
        sales: 3,
        shippingCost: "12.00",
        taxAmount: "18.00",
      }),
    ]);
    expect(snapshot.monthlyPerformanceRows).toEqual([
      {
        advertisingCost: "10.00",
        channel: "mercadolivre",
        commissionRate: "0.100000",
        packagingCost: "2.00",
        productName: "Notebook",
        referenceMonth: "2026-05-01",
        returnsQuantity: 1,
        salePrice: "100.00",
        salesQuantity: 3,
        shippingFee: "6.00",
        sku: "NB-1",
        taxRate: "0.090000",
        unitCost: "25.00",
      },
    ]);
  });

  it("marks analytics scope as company-required when no active company exists", async () => {
    const { db, financeService, service, syncService } = createService();

    db.query.companies.findMany.mockResolvedValue([]);
    db.query.products.findMany.mockResolvedValue([]);
    db.query.productCosts.findMany.mockResolvedValue([]);
    db.query.adCosts.findMany.mockResolvedValue([]);
    db.query.manualExpenses.findMany.mockResolvedValue([]);
    db.query.productMonthlyPerformance.findMany.mockResolvedValue([]);
    financeService.buildFinanceSnapshot.mockResolvedValue({
      adCosts: [],
      manualExpenses: [],
      orders: [],
      products: [],
    });
    syncService.getStatus.mockResolvedValue({
      activeRun: null,
      availability: {
        canRun: false,
        currentWindowKey: null,
        currentWindowLabel: null,
        currentWindowSlot: null,
        lastSuccessfulSyncAt: null,
        message: "Connect this marketplace account before running the first sync.",
        nextAvailableAt: null,
        provider: "mercadolivre",
        reason: "provider_disconnected",
      },
      lastCompletedRun: null,
    });

    const snapshot = await service.getAnalyticsSnapshot({
      organizationId: "org_1",
      userId: "user_1",
    });

    expect(snapshot.scope).toEqual({
      companyId: null,
      companyRequired: true,
      referenceMonth: expect.stringMatching(/^\d{4}-\d{2}-01$/),
    });
  });
});
