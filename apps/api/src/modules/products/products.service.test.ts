import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { utils, write } from "xlsx";
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
    delete: vi.fn(),
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
      externalProducts: {
        findMany: vi.fn().mockResolvedValue([]),
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
    const { db, service } = createService();

    db.query.products.findMany.mockResolvedValue([
      {
        createdAt: new Date("2026-04-28T10:00:00.000Z"),
        financeDefaults: null,
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

    db.query.products.findMany.mockResolvedValue([]);
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
    const createdDefaults = {
      advertisingCost: "15.00",
      createdAt: new Date("2026-05-14T10:02:00.000Z"),
      id: "defaults_1",
      packagingCost: "3.00",
      productId: "product_1",
      updatedAt: new Date("2026-05-14T10:02:00.000Z"),
    };
    const txInsert = vi
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
          returning: vi.fn().mockResolvedValue([createdDefaults]),
        }),
      });

    db.transaction = vi.fn(async (callback) =>
      callback({
        insert: txInsert,
        update: vi.fn(),
      }),
    );
    db.query.products.findMany.mockResolvedValue([]);
    db.query.companies.findMany.mockResolvedValue([
      {
        id: "company_1",
        isActive: true,
        taxRateDefault: "0.120000",
      },
    ]);
    financeService.materializeOrganizationMetrics = vi.fn().mockResolvedValue(undefined);

    await expect(
      service.createManualProduct(
        {
          organizationId: "org_1",
          userId: "user_1",
        },
        {
          initialFinance: {
            packagingCost: "3.00",
            unitCost: "80.00",
          },
          product: {
            isActive: true,
            name: "Kit Mercado Livre",
            sellingPrice: "149.90",
            sku: " ml-001 ",
          },
        },
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        financeDefaults: expect.objectContaining({
          packagingCost: "3.00",
          productId: "product_1",
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
    expect(db.query.companies.findMany).toHaveBeenCalledOnce();
    expect(txInsert).toHaveBeenCalledTimes(3);
    expect(financeService.materializeOrganizationMetrics).toHaveBeenCalledWith(
      "org_1",
      "company_1",
    );
  });

  it("rejects manual product creation when sku already exists in organization", async () => {
    const { db, service } = createService();
    db.query.products.findMany.mockResolvedValue([
      {
        id: "product_existing",
        sku: " ml-001 ",
      },
    ]);

    await expect(
      service.createManualProduct(
        {
          organizationId: "org_1",
          userId: "user_1",
        },
        {
          initialFinance: {
            packagingCost: "3.00",
            unitCost: "80.00",
          },
          product: {
            isActive: true,
            name: "Kit Mercado Livre",
            sellingPrice: "149.90",
            sku: "ML-001",
          },
        },
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("rejects manual product creation when sku is blank", async () => {
    const { service } = createService();

    await expect(
      service.createManualProduct(
        {
          organizationId: "org_1",
          userId: "user_1",
        },
        {
          initialFinance: {
            packagingCost: "3.00",
            unitCost: "80.00",
          },
          product: {
            isActive: true,
            name: "Kit Mercado Livre",
            sellingPrice: "149.90",
            sku: "",
          },
        } as never,
      ),
    ).rejects.toThrow("SKU is required for manual product creation.");
  });

  it("rejects manual product creation when no active company exists", async () => {
    const { db, service } = createService();
    db.query.products.findMany.mockResolvedValue([]);
    db.query.companies.findMany.mockResolvedValue([]);

    await expect(
      service.createManualProduct(
        {
          organizationId: "org_1",
          userId: "user_1",
        },
        {
          initialFinance: {
            packagingCost: "3.00",
            unitCost: "80.00",
          },
          product: {
            isActive: true,
            name: "Kit Mercado Livre",
            sellingPrice: "149.90",
            sku: "ML-001",
          },
        },
      ),
    ).rejects.toThrow("Cadastre uma empresa ativa em /app antes de criar ou importar produtos.");

    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("allows manual product creation when multiple active companies exist but one is selected", async () => {
    const { db, financeService, service } = createService();
    const createdProduct = {
      createdAt: new Date("2026-05-01T10:00:00.000Z"),
      id: "product_1",
      isActive: true,
      name: "Kit Mercado Livre",
      organizationId: "org_1",
      sellingPrice: "149.90",
      sku: "ML-001",
      updatedAt: new Date("2026-05-01T10:00:00.000Z"),
    };
    const createdCost = {
      amount: "80.00",
      costType: "base",
      createdAt: new Date("2026-05-01T10:00:00.000Z"),
      currency: "BRL",
      effectiveFrom: null,
      id: "cost_1",
      notes: "Cadastro manual inicial",
      organizationId: "org_1",
      productId: "product_1",
      updatedAt: new Date("2026-05-01T10:00:00.000Z"),
    };
    const createdDefaults = {
      advertisingCost: "0",
      createdAt: new Date("2026-05-01T10:00:00.000Z"),
      id: "defaults_1",
      packagingCost: "3.00",
      productId: "product_1",
      updatedAt: new Date("2026-05-01T10:00:00.000Z"),
    };
    const txInsert = vi
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
          returning: vi.fn().mockResolvedValue([createdDefaults]),
        }),
      });

    db.transaction = vi.fn(async (callback) =>
      callback({
        insert: txInsert,
        update: vi.fn(),
      }),
    );
    db.query.products.findMany.mockResolvedValue([]);
    db.query.companies.findMany.mockResolvedValue([
      {
        id: "company_1",
        isActive: true,
        taxRateDefault: "0.120000",
      },
      {
        id: "company_2",
        isActive: true,
        taxRateDefault: "0.080000",
      },
    ]);
    financeService.materializeOrganizationMetrics = vi.fn().mockResolvedValue(undefined);

    await expect(
      service.createManualProduct(
        {
          organizationId: "org_1",
          selectedCompanyId: "company_2",
          userId: "user_1",
        },
        {
          initialFinance: {
            packagingCost: "3.00",
            unitCost: "80.00",
          },
          product: {
            isActive: true,
            name: "Kit Mercado Livre",
            sellingPrice: "149.90",
            sku: "ML-001",
          },
        },
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        product: expect.objectContaining({
          id: "product_1",
        }),
      }),
    );

    expect(db.transaction).toHaveBeenCalledOnce();
  });

  it("imports spreadsheet rows without IMPOSTO and delegates tax resolution to manual creation", async () => {
    const { db, service } = createService();
    db.query.products.findMany.mockResolvedValue([]);
    const createManualProductSpy = vi
      .spyOn(service, "createManualProduct")
      .mockResolvedValue({} as never);

    const workbook = utils.book_new();
    const worksheet = utils.json_to_sheet([
      {
        EMBALAGEM: 3,
        "CUSTO UNITÁRIO": 80,
        "PREÇO DE VENDA": 149.9,
        PRODUTO: "Kit Mercado Livre",
        SKU: " ml-001 ",
        STATUS: 1,
      },
    ]);
    utils.book_append_sheet(workbook, worksheet, "Produtos");
    const fileBuffer = Buffer.from(write(workbook, { bookType: "xlsx", type: "buffer" }));

    await expect(
      service.importProducts(
        {
          organizationId: "org_1",
          userId: "user_1",
        },
        fileBuffer,
      ),
    ).resolves.toEqual({
      errors: [],
      imported: 1,
    });

    expect(createManualProductSpy).toHaveBeenCalledWith(
      {
        companyId: "legacy-company-scope",
        organizationId: "org_1",
        userId: "user_1",
      },
      {
        initialFinance: {
          packagingCost: "3.00",
          unitCost: "80.00",
        },
        product: {
          isActive: true,
          name: "Kit Mercado Livre",
          sellingPrice: "149.90",
          sku: "ML-001",
        },
      },
    );
  });

  it("rejects spreadsheet using legacy IMPOSTO header set", async () => {
    const { service } = createService();
    const workbook = utils.book_new();
    const worksheet = utils.json_to_sheet([
      {
        EMBALAGEM: 3,
        IMPOSTO: 12,
        "CUSTO UNITÁRIO": 80,
        "PREÇO DE VENDA": 149.9,
        PRODUTO: "Kit Mercado Livre",
        SKU: "ML-001",
        STATUS: 1,
      },
    ]);
    utils.book_append_sheet(workbook, worksheet, "Produtos");
    const fileBuffer = Buffer.from(write(workbook, { bookType: "xlsx", type: "buffer" }));

    await expect(
      service.importProducts(
        {
          organizationId: "org_1",
          userId: "user_1",
        },
        fileBuffer,
      ),
    ).rejects.toThrow("Colunas extras não suportadas: IMPOSTO");
  });

  it("rejects spreadsheet rows when sku already exists in catalog ignoring case and spacing", async () => {
    const { db, service } = createService();
    db.query.products.findMany.mockResolvedValue([
      {
        sku: " ml-001 ",
      },
    ]);
    {
      const unitCostHeader = `CUSTO UNIT${String.fromCharCode(193)}RIO`;
      const salePriceHeader = `PRE${String.fromCharCode(199)}O DE VENDA`;
      const workbook = utils.book_new();
      const worksheet = utils.json_to_sheet([
        {
          EMBALAGEM: 3,
          [unitCostHeader]: 80,
          [salePriceHeader]: 149.9,
          PRODUTO: "Kit Mercado Livre",
          SKU: "ML-001",
          STATUS: 1,
        },
      ]);
      utils.book_append_sheet(workbook, worksheet, "Produtos");
      const fileBuffer = Buffer.from(
        write(workbook, { bookType: "xlsx", type: "buffer" }),
      );

      await expect(
        service.importProducts(
          {
            organizationId: "org_1",
            userId: "user_1",
          },
          fileBuffer,
        ),
      ).resolves.toEqual({
        errors: [
          {
            message: 'SKU "ML-001" já existe no catálogo.',
            row: 2,
          },
        ],
        imported: 0,
      });

      return;
    }

    const workbook = utils.book_new();
    const worksheet = utils.json_to_sheet([
      {
        EMBALAGEM: 3,
        "CUSTO UNITÃRIO": 80,
        "PREÃ‡O DE VENDA": 149.9,
        PRODUTO: "Kit Mercado Livre",
        SKU: "ML-001",
        STATUS: 1,
      },
    ]);
    utils.book_append_sheet(workbook, worksheet, "Produtos");
    const fileBuffer = Buffer.from(
      write(workbook, { bookType: "xlsx", type: "buffer" }),
    );

    await expect(
      service.importProducts(
        {
          organizationId: "org_1",
          userId: "user_1",
        },
        fileBuffer,
      ),
    ).resolves.toEqual({
      errors: [
        {
          message: 'SKU "ML-001" jÃ¡ existe no catÃ¡logo',
          row: 2,
        },
      ],
      imported: 0,
    });
  });

  it("rejects spreadsheet rows when sku is duplicated inside file", async () => {
    const { db, service } = createService();
    db.query.products.findMany.mockResolvedValue([]);
    vi.spyOn(service, "createManualProduct").mockResolvedValue({} as never);
    {
      const unitCostHeader = `CUSTO UNIT${String.fromCharCode(193)}RIO`;
      const salePriceHeader = `PRE${String.fromCharCode(199)}O DE VENDA`;
      const workbook = utils.book_new();
      const worksheet = utils.json_to_sheet([
        {
          EMBALAGEM: 3,
          [unitCostHeader]: 80,
          [salePriceHeader]: 149.9,
          PRODUTO: "Kit Mercado Livre",
          SKU: "ML-001",
          STATUS: 1,
        },
        {
          EMBALAGEM: 4,
          [unitCostHeader]: 81,
          [salePriceHeader]: 150.9,
          PRODUTO: "Kit Mercado Livre 2",
          SKU: " ml-001 ",
          STATUS: 1,
        },
      ]);
      utils.book_append_sheet(workbook, worksheet, "Produtos");
      const fileBuffer = Buffer.from(
        write(workbook, { bookType: "xlsx", type: "buffer" }),
      );

      await expect(
        service.importProducts(
          {
            organizationId: "org_1",
            userId: "user_1",
          },
          fileBuffer,
        ),
      ).resolves.toEqual({
        errors: [
          {
            message: 'SKU "ml-001" duplicado na planilha',
            row: 3,
          },
        ],
        imported: 1,
      });

      return;
    }

    const workbook = utils.book_new();
    const worksheet = utils.json_to_sheet([
      {
        EMBALAGEM: 3,
        "CUSTO UNITÃRIO": 80,
        "PREÃ‡O DE VENDA": 149.9,
        PRODUTO: "Kit Mercado Livre",
        SKU: "ML-001",
        STATUS: 1,
      },
      {
        EMBALAGEM: 4,
        "CUSTO UNITÃRIO": 81,
        "PREÃ‡O DE VENDA": 150.9,
        PRODUTO: "Kit Mercado Livre 2",
        SKU: " ml-001 ",
        STATUS: 1,
      },
    ]);
    utils.book_append_sheet(workbook, worksheet, "Produtos");
    const fileBuffer = Buffer.from(
      write(workbook, { bookType: "xlsx", type: "buffer" }),
    );

    await expect(
      service.importProducts(
        {
          organizationId: "org_1",
          userId: "user_1",
        },
        fileBuffer,
      ),
    ).resolves.toEqual({
      errors: [
        {
          message: 'SKU " ml-001 " duplicado na planilha',
          row: 3,
        },
      ],
      imported: 1,
    });
  });

  it("rejects product sku updates when another product already uses normalized sku", async () => {
    const { db, service } = createService();

    db.query.products.findFirst.mockResolvedValue({
      id: "product_1",
      organizationId: "org_1",
    });
    db.query.products.findMany.mockResolvedValue([
      {
        id: "product_1",
        sku: "ABC-1",
      },
      {
        id: "product_2",
        sku: " xyz-1 ",
      },
    ]);

    await expect(
      service.updateProduct("org_1", "product_1", {
        sku: "XYZ-1",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("allows product sku updates when normalized sku belongs to same product", async () => {
    const { db, service } = createService();

    db.query.products.findFirst.mockResolvedValue({
      id: "product_1",
      organizationId: "org_1",
    });
    db.query.products.findMany.mockResolvedValue([
      {
        id: "product_1",
        sku: " xyz-1 ",
      },
    ]);
    db.update = createUpdateMock({
      createdAt: new Date("2026-04-28T10:00:00.000Z"),
      id: "product_1",
      isActive: true,
      name: "Notebook",
      organizationId: "org_1",
      sellingPrice: "120.00",
      sku: "XYZ-1",
      updatedAt: new Date("2026-04-28T10:00:00.000Z"),
    });

    await expect(
      service.updateProduct("org_1", "product_1", {
        sku: "XYZ-1",
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        id: "product_1",
        sku: "XYZ-1",
      }),
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

  it("rejects product creation when sku already exists in organization", async () => {
    const { db, service } = createService();
    db.query.products.findMany.mockResolvedValue([
      {
        id: "product_existing",
        sku: " nb-1 ",
      },
    ]);

    await expect(
      service.createProduct("org_1", {
        isActive: true,
        name: "Notebook",
        sellingPrice: "120.00",
        sku: "NB-1",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      service.createProduct("org_1", {
        isActive: true,
        name: "Notebook",
        sellingPrice: "120.00",
        sku: "NB-1",
      }),
    ).rejects.toThrow('SKU "NB-1" já existe no catálogo.');
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("creates missing cost/default records when saving catalog finance", async () => {
    const { db, financeService, service } = createService();
    const txInsert = vi
      .fn()
      .mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              amount: "30.00",
              costType: "base",
              createdAt: new Date("2026-06-17T10:00:00.000Z"),
              currency: "BRL",
              effectiveFrom: null,
              id: "cost_1",
              notes: "Atualizado pelo catálogo",
              organizationId: "org_1",
              productId: "product_1",
              updatedAt: new Date("2026-06-17T10:00:00.000Z"),
            },
          ]),
        }),
      })
      .mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              advertisingCost: "0.00",
              createdAt: new Date("2026-06-17T10:00:00.000Z"),
              id: "defaults_1",
              packagingCost: "4.50",
              productId: "product_1",
              updatedAt: new Date("2026-06-17T10:00:00.000Z"),
            },
          ]),
        }),
      });

    db.query.products.findFirst
      .mockResolvedValueOnce({
        id: "product_1",
        organizationId: "org_1",
      })
      .mockResolvedValueOnce({
        createdAt: new Date("2026-06-17T10:00:00.000Z"),
        financeDefaults: null,
        id: "product_1",
        images: [],
        isActive: true,
        name: "Kit Mercado Livre",
        organizationId: "org_1",
        sellingPrice: "149.90",
        sku: "ML-001",
        updatedAt: new Date("2026-06-17T10:00:00.000Z"),
      })
      .mockResolvedValueOnce({
        createdAt: new Date("2026-06-17T10:00:00.000Z"),
        financeDefaults: {
          advertisingCost: "0.00",
          createdAt: new Date("2026-06-17T10:00:00.000Z"),
          id: "defaults_1",
          packagingCost: "4.50",
          productId: "product_1",
          updatedAt: new Date("2026-06-17T10:00:00.000Z"),
        },
        id: "product_1",
        images: [],
        isActive: true,
        name: "Kit Mercado Livre",
        organizationId: "org_1",
        sellingPrice: "149.90",
        sku: "ML-001",
        updatedAt: new Date("2026-06-17T10:00:00.000Z"),
      });
    db.query.productCosts.findFirst.mockResolvedValueOnce(null);
    db.query.productCosts.findMany.mockResolvedValueOnce([
      {
        amount: "30.00",
        costType: "base",
        createdAt: new Date("2026-06-17T10:00:00.000Z"),
        currency: "BRL",
        effectiveFrom: null,
        id: "cost_1",
        notes: "Atualizado pelo catálogo",
        organizationId: "org_1",
        productId: "product_1",
        updatedAt: new Date("2026-06-17T10:00:00.000Z"),
      },
    ]);
    db.transaction = vi.fn(async (callback) =>
      callback({
        insert: txInsert,
        update: vi.fn(),
      }),
    );
    financeService.materializeOrganizationMetrics = vi.fn().mockResolvedValue(undefined);

    const updateCatalogFinance = (
      service as ProductsService & {
        updateCatalogFinance: (
          organizationId: string,
          productId: string,
          input: { packagingCost: string; unitCost: string },
        ) => Promise<unknown>;
      }
    ).updateCatalogFinance;

    await expect(
      Promise.resolve().then(() =>
        updateCatalogFinance.call(service, "org_1", "product_1", {
          packagingCost: "4.50",
          unitCost: "30.00",
        }),
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        catalogRole: "standalone",
        children: [],
        financeDefaults: expect.objectContaining({
          packagingCost: "4.50",
        }),
        latestCost: expect.objectContaining({
          amount: "30.00",
        }),
      }),
    );
  });

  it("groups Mercado Livre variations under a virtual parent in analytics snapshots", async () => {
    const { db, financeService, service, syncService } = createService();
    const productRows = [
      {
        createdAt: new Date("2026-06-17T10:00:00.000Z"),
        financeDefaults: {
          advertisingCost: "0.00",
          createdAt: new Date("2026-06-17T10:00:00.000Z"),
          id: "defaults_1",
          packagingCost: "4.50",
          productId: "product_1",
          updatedAt: new Date("2026-06-17T10:00:00.000Z"),
        },
        id: "product_1",
        images: [
          {
            createdAt: new Date("2026-06-17T10:00:00.000Z"),
            externalIdentifier: "img:1",
            id: "image_1",
            organizationId: "org_1",
            position: 0,
            productId: "product_1",
            source: "mercadolivre",
            updatedAt: new Date("2026-06-17T10:00:00.000Z"),
            url: "https://example.com/1.png",
          },
        ],
        isActive: true,
        name: "Produto Azul",
        organizationId: "org_1",
        sellingPrice: "149.90",
        sku: "ML-001-AZ",
        updatedAt: new Date("2026-06-17T10:00:00.000Z"),
      },
      {
        createdAt: new Date("2026-06-17T10:00:00.000Z"),
        financeDefaults: {
          advertisingCost: "0.00",
          createdAt: new Date("2026-06-17T10:00:00.000Z"),
          id: "defaults_2",
          packagingCost: "4.50",
          productId: "product_2",
          updatedAt: new Date("2026-06-17T10:00:00.000Z"),
        },
        id: "product_2",
        images: [
          {
            createdAt: new Date("2026-06-17T10:00:00.000Z"),
            externalIdentifier: "img:2",
            id: "image_2",
            organizationId: "org_1",
            position: 0,
            productId: "product_2",
            source: "mercadolivre",
            updatedAt: new Date("2026-06-17T10:00:00.000Z"),
            url: "https://example.com/2.png",
          },
        ],
        isActive: true,
        name: "Produto Vermelho",
        organizationId: "org_1",
        sellingPrice: "149.90",
        sku: "ML-001-VM",
        updatedAt: new Date("2026-06-17T10:00:00.000Z"),
      },
      {
        createdAt: new Date("2026-06-17T10:00:00.000Z"),
        financeDefaults: null,
        id: "product_3",
        images: [],
        isActive: true,
        name: "Produto Manual",
        organizationId: "org_1",
        sellingPrice: "99.90",
        sku: "MAN-001",
        updatedAt: new Date("2026-06-17T10:00:00.000Z"),
      },
    ];

    db.query.companies.findMany.mockResolvedValue([
      {
        id: "company_1",
        isActive: true,
        taxRateDefault: "0.120000",
      },
    ]);
    db.query.products.findMany
      .mockResolvedValueOnce(productRows)
      .mockResolvedValueOnce(
        productRows.map(({ images, financeDefaults, ...product }) => product),
      );
    db.query.productCosts.findMany.mockResolvedValue([
      {
        amount: "30.00",
        costType: "base",
        createdAt: new Date("2026-06-17T10:00:00.000Z"),
        currency: "BRL",
        effectiveFrom: null,
        id: "cost_1",
        notes: null,
        organizationId: "org_1",
        productId: "product_1",
        updatedAt: new Date("2026-06-17T10:00:00.000Z"),
      },
      {
        amount: "31.00",
        costType: "base",
        createdAt: new Date("2026-06-17T10:00:00.000Z"),
        currency: "BRL",
        effectiveFrom: null,
        id: "cost_2",
        notes: null,
        organizationId: "org_1",
        productId: "product_2",
        updatedAt: new Date("2026-06-17T10:00:00.000Z"),
      },
    ]);
    db.query.adCosts.findMany.mockResolvedValue([]);
    db.query.manualExpenses.findMany.mockResolvedValue([]);
    db.query.productMonthlyPerformance.findMany.mockResolvedValue([]);
    financeService.buildFinanceSnapshot.mockResolvedValue({
      adCosts: [],
      manualExpenses: [],
      orders: [],
      products: [
        {
          id: "product_1",
          isActive: true,
          name: "Produto Azul",
          sellingPrice: "149.90",
          sku: "ML-001-AZ",
          unitCost: "30.00",
        },
        {
          id: "product_2",
          isActive: true,
          name: "Produto Vermelho",
          sellingPrice: "149.90",
          sku: "ML-001-VM",
          unitCost: "31.00",
        },
        {
          id: "product_3",
          isActive: true,
          name: "Produto Manual",
          sellingPrice: "99.90",
          sku: "MAN-001",
          unitCost: "0.00",
        },
      ],
    });
    syncService.getStatus.mockResolvedValue({
      activeRun: null,
      availability: {
        canRun: true,
        currentWindowKey: "2026-06-17-morning",
        currentWindowLabel: "Manha",
        currentWindowSlot: "morning",
        lastSuccessfulSyncAt: null,
        message: "Sync is available for the current daily window.",
        nextAvailableAt: "2026-06-17T09:00:00.000Z",
        provider: "mercadolivre",
        reason: "available",
      },
      lastCompletedRun: null,
    });

    const { listSyncedProductsReadModel } = await import(
      "@/modules/integrations/synced-products.read-model"
    );
    vi.mocked(listSyncedProductsReadModel).mockImplementation(async () =>
      [
        {
          externalProductId: "MLB123",
          fixedFee: "0.00",
          grossRevenue: "0.00",
          id: "external_0",
          lastOrderedAt: null,
          latestUnitPrice: null,
          linkedProduct: {
            id: "product_1",
            isActive: true,
            name: "Produto Azul",
            sku: "ML-001-AZ",
          },
          marketplaceCommission: "0.00",
          netMarketplaceTake: "0.00",
          orderCount: 0,
          provider: "mercadolivre",
          reviewStatus: "linked_to_existing_product",
          shippingCost: "0.00",
          sku: "ML-001-AZ",
          suggestedMatches: [],
          title: "Produto",
          unitsSold: 0,
        },
        {
          externalProductId: "MLB123:101",
          fixedFee: "0.00",
          grossRevenue: "0.00",
          id: "external_1",
          lastOrderedAt: null,
          latestUnitPrice: null,
          linkedProduct: {
            id: "product_2",
            isActive: true,
            name: "Produto Vermelho",
            sku: "ML-001-VM",
          },
          marketplaceCommission: "0.00",
          netMarketplaceTake: "0.00",
          orderCount: 0,
          provider: "mercadolivre",
          reviewStatus: "linked_to_existing_product",
          shippingCost: "0.00",
          sku: "ML-001-VM",
          suggestedMatches: [],
          title: "Cor: Azul",
          unitsSold: 0,
        },
      ],
    );

    const snapshot = await service.getAnalyticsSnapshot({
      organizationId: "org_1",
      userId: "user_1",
    });

    expect(snapshot.products).toEqual([
      expect.objectContaining({
        catalogGroupKey: "mercadolivre:MLB123",
        catalogRole: "parent",
        children: [
          expect.objectContaining({
            catalogRole: "child",
            id: "product_2",
            parentProductId: "product_1",
            variationLabel: "Cor: Azul",
          }),
        ],
        derivedFromProvider: "mercadolivre",
        id: "product_1",
      }),
      expect.objectContaining({
        catalogRole: "standalone",
        children: [],
        derivedFromProvider: null,
        id: "product_3",
      }),
    ]);
  });

  it("builds hierarchical performance rows for Mercado Livre variation groups", async () => {
    const { db, financeService, service, syncService } = createService();
    const productRows = [
      {
        createdAt: new Date("2026-06-17T10:00:00.000Z"),
        financeDefaults: {
          advertisingCost: "0.00",
          createdAt: new Date("2026-06-17T10:00:00.000Z"),
          id: "defaults_parent",
          packagingCost: "4.50",
          productId: "product_parent",
          updatedAt: new Date("2026-06-17T10:00:00.000Z"),
        },
        id: "product_parent",
        images: [],
        isActive: true,
        name: "Produto Pai",
        organizationId: "org_1",
        sellingPrice: "149.90",
        sku: "ML-001-PAI",
        updatedAt: new Date("2026-06-17T10:00:00.000Z"),
      },
      {
        createdAt: new Date("2026-06-17T10:00:00.000Z"),
        financeDefaults: {
          advertisingCost: "0.00",
          createdAt: new Date("2026-06-17T10:00:00.000Z"),
          id: "defaults_child_1",
          packagingCost: "4.50",
          productId: "product_child_1",
          updatedAt: new Date("2026-06-17T10:00:00.000Z"),
        },
        id: "product_child_1",
        images: [],
        isActive: true,
        name: "Produto Azul",
        organizationId: "org_1",
        sellingPrice: "149.90",
        sku: "ML-001-AZ",
        updatedAt: new Date("2026-06-17T10:00:00.000Z"),
      },
      {
        createdAt: new Date("2026-06-17T10:00:00.000Z"),
        financeDefaults: {
          advertisingCost: "0.00",
          createdAt: new Date("2026-06-17T10:00:00.000Z"),
          id: "defaults_child_2",
          packagingCost: "4.50",
          productId: "product_child_2",
          updatedAt: new Date("2026-06-17T10:00:00.000Z"),
        },
        id: "product_child_2",
        images: [],
        isActive: true,
        name: "Produto Vermelho",
        organizationId: "org_1",
        sellingPrice: "149.90",
        sku: "ML-001-VM",
        updatedAt: new Date("2026-06-17T10:00:00.000Z"),
      },
    ];

    db.query.companies.findMany.mockResolvedValue([
      {
        id: "company_1",
        isActive: true,
        taxRateDefault: "0.120000",
      },
    ]);
    db.query.products.findMany
      .mockResolvedValueOnce(productRows)
      .mockResolvedValueOnce(
        productRows.map(({ images, financeDefaults, ...product }) => product),
      );
    db.query.productCosts.findMany.mockResolvedValue([]);
    db.query.adCosts.findMany.mockResolvedValue([]);
    db.query.manualExpenses.findMany.mockResolvedValue([]);
    db.query.productMonthlyPerformance.findMany.mockResolvedValue([
      {
        advertisingCost: "10.00",
        channel: "mercadolivre",
        commissionRate: "0.100000",
        companyId: "company_1",
        createdAt: new Date("2026-06-17T10:00:00.000Z"),
        id: "perf_parent",
        notes: null,
        organizationId: "org_1",
        packagingCost: "1.50",
        productName: "Produto Pai",
        referenceMonth: "2026-06-01",
        returnsQuantity: 0,
        salePrice: "100.00",
        salesQuantity: 1,
        shippingFee: "5.00",
        sku: "ML-001-PAI",
        unitCost: "40.00",
        updatedAt: new Date("2026-06-17T10:00:00.000Z"),
        userId: "user_1",
      },
      {
        advertisingCost: "20.00",
        channel: "mercadolivre",
        commissionRate: "0.100000",
        companyId: "company_1",
        createdAt: new Date("2026-06-17T10:00:00.000Z"),
        id: "perf_child_1",
        notes: null,
        organizationId: "org_1",
        packagingCost: "2.00",
        productName: "Produto Azul",
        referenceMonth: "2026-06-01",
        returnsQuantity: 0,
        salePrice: "110.00",
        salesQuantity: 2,
        shippingFee: "6.00",
        sku: "ML-001-AZ",
        unitCost: "41.00",
        updatedAt: new Date("2026-06-17T10:00:00.000Z"),
        userId: "user_1",
      },
      {
        advertisingCost: "30.00",
        channel: "mercadolivre",
        commissionRate: "0.100000",
        companyId: "company_1",
        createdAt: new Date("2026-06-17T10:00:00.000Z"),
        id: "perf_child_2",
        notes: null,
        organizationId: "org_1",
        packagingCost: "3.00",
        productName: "Produto Vermelho",
        referenceMonth: "2026-06-01",
        returnsQuantity: 1,
        salePrice: "120.00",
        salesQuantity: 3,
        shippingFee: "7.00",
        sku: "ML-001-VM",
        unitCost: "42.00",
        updatedAt: new Date("2026-06-17T10:00:00.000Z"),
        userId: "user_1",
      },
    ]);
    financeService.buildFinanceSnapshot.mockResolvedValue({
      adCosts: [],
      manualExpenses: [],
      monthlyPerformance: [],
      orders: [],
      products: [],
    });
    syncService.getStatus.mockResolvedValue({
      activeRun: null,
      availability: {
        canRun: true,
        currentWindowKey: "2026-06-17-morning",
        currentWindowLabel: "Manha",
        currentWindowSlot: "morning",
        lastSuccessfulSyncAt: null,
        message: "Sync is available for the current daily window.",
        nextAvailableAt: "2026-06-17T09:00:00.000Z",
        provider: "mercadolivre",
        reason: "available",
      },
      lastCompletedRun: null,
    });

    const { listSyncedProductsReadModel } = await import(
      "@/modules/integrations/synced-products.read-model"
    );
    vi.mocked(listSyncedProductsReadModel).mockImplementation(async () => [
      {
        externalProductId: "MLB123",
        fixedFee: "0.00",
        grossRevenue: "0.00",
        id: "external_parent",
        lastOrderedAt: null,
        latestUnitPrice: null,
        linkedProduct: {
          id: "product_parent",
          isActive: true,
          name: "Produto Pai",
          sku: "ML-001-PAI",
        },
        marketplaceCommission: "0.00",
        netMarketplaceTake: "0.00",
        orderCount: 0,
        provider: "mercadolivre",
        reviewStatus: "linked_to_existing_product",
        shippingCost: "0.00",
        sku: "ML-001-PAI",
        suggestedMatches: [],
        title: "Produto Pai",
        unitsSold: 0,
      },
      {
        externalProductId: "MLB123:101",
        fixedFee: "0.00",
        grossRevenue: "0.00",
        id: "external_child_1",
        lastOrderedAt: null,
        latestUnitPrice: null,
        linkedProduct: {
          id: "product_child_1",
          isActive: true,
          name: "Produto Azul",
          sku: "ML-001-AZ",
        },
        marketplaceCommission: "0.00",
        netMarketplaceTake: "0.00",
        orderCount: 0,
        provider: "mercadolivre",
        reviewStatus: "linked_to_existing_product",
        shippingCost: "0.00",
        sku: "ML-001-AZ",
        suggestedMatches: [],
        title: "Cor: Azul",
        unitsSold: 0,
      },
      {
        externalProductId: "MLB123:102",
        fixedFee: "0.00",
        grossRevenue: "0.00",
        id: "external_child_2",
        lastOrderedAt: null,
        latestUnitPrice: null,
        linkedProduct: {
          id: "product_child_2",
          isActive: true,
          name: "Produto Vermelho",
          sku: "ML-001-VM",
        },
        marketplaceCommission: "0.00",
        netMarketplaceTake: "0.00",
        orderCount: 0,
        provider: "mercadolivre",
        reviewStatus: "linked_to_existing_product",
        shippingCost: "0.00",
        sku: "ML-001-VM",
        suggestedMatches: [],
        title: "Cor: Vermelho",
        unitsSold: 0,
      },
    ]);

    const snapshot = await service.getAnalyticsSnapshot({
      organizationId: "org_1",
      userId: "user_1",
    });

    expect(snapshot.performanceRows).toEqual([
      expect.objectContaining({
        catalogGroupKey: "mercadolivre:MLB123",
        catalogRole: "parent",
        parentProductId: null,
        productId: "product_parent",
        salesQuantity: 6,
        returnsQuantity: 1,
        advertisingCost: "60.00",
        shippingFee: "6.20",
        children: [
          expect.objectContaining({
            catalogRole: "child",
            parentProductId: "product_parent",
            productId: "product_child_1",
            salesQuantity: 2,
            returnsQuantity: 0,
            sku: "ML-001-AZ",
            variationLabel: "Cor: Azul",
          }),
          expect.objectContaining({
            catalogRole: "child",
            parentProductId: "product_parent",
            productId: "product_child_2",
            salesQuantity: 3,
            returnsQuantity: 1,
            sku: "ML-001-VM",
            variationLabel: "Cor: Vermelho",
          }),
        ],
      }),
    ]);
  });

  it("replicates catalog finance updates from parent product to linked Mercado Livre variations", async () => {
    const { db, financeService, service } = createService();
    const txUpdate = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    db.query.products.findFirst
      .mockResolvedValueOnce({
        id: "product_1",
        organizationId: "org_1",
      })
      .mockResolvedValueOnce({
        createdAt: new Date("2026-06-17T10:00:00.000Z"),
        financeDefaults: {
          advertisingCost: "0.00",
          createdAt: new Date("2026-06-17T10:00:00.000Z"),
          id: "defaults_1",
          packagingCost: "6.50",
          productId: "product_1",
          updatedAt: new Date("2026-06-17T10:00:00.000Z"),
        },
        id: "product_1",
        images: [],
        isActive: true,
        name: "Produto Azul",
        organizationId: "org_1",
        sellingPrice: "149.90",
        sku: "ML-001-AZ",
        updatedAt: new Date("2026-06-17T10:00:00.000Z"),
      });
    db.query.products.findMany.mockResolvedValue([
      {
        createdAt: new Date("2026-06-17T10:00:00.000Z"),
        financeDefaults: {
          advertisingCost: "0.00",
          createdAt: new Date("2026-06-17T10:00:00.000Z"),
          id: "defaults_1",
          packagingCost: "6.50",
          productId: "product_1",
          updatedAt: new Date("2026-06-17T10:00:00.000Z"),
        },
        id: "product_1",
        images: [],
        isActive: true,
        name: "Produto Azul",
        organizationId: "org_1",
        sellingPrice: "149.90",
        sku: "ML-001-AZ",
        updatedAt: new Date("2026-06-17T10:00:00.000Z"),
      },
      {
        createdAt: new Date("2026-06-17T10:00:00.000Z"),
        financeDefaults: {
          advertisingCost: "0.00",
          createdAt: new Date("2026-06-17T10:00:00.000Z"),
          id: "defaults_2",
          packagingCost: "6.50",
          productId: "product_2",
          updatedAt: new Date("2026-06-17T10:00:00.000Z"),
        },
        id: "product_2",
        images: [],
        isActive: true,
        name: "Produto Vermelho",
        organizationId: "org_1",
        sellingPrice: "149.90",
        sku: "ML-001-VM",
        updatedAt: new Date("2026-06-17T10:00:00.000Z"),
      },
      {
        createdAt: new Date("2026-06-17T10:00:00.000Z"),
        financeDefaults: {
          advertisingCost: "0.00",
          createdAt: new Date("2026-06-17T10:00:00.000Z"),
          id: "defaults_3",
          packagingCost: "6.50",
          productId: "product_3",
          updatedAt: new Date("2026-06-17T10:00:00.000Z"),
        },
        id: "product_3",
        images: [],
        isActive: true,
        name: "Produto Verde",
        organizationId: "org_1",
        sellingPrice: "149.90",
        sku: "ML-001-VD",
        updatedAt: new Date("2026-06-17T10:00:00.000Z"),
      },
    ]);
    db.query.productCosts.findFirst.mockResolvedValue({
      amount: "30.00",
      costType: "base",
      createdAt: new Date("2026-06-17T10:00:00.000Z"),
      currency: "BRL",
      effectiveFrom: null,
      id: "cost_1",
      notes: null,
      organizationId: "org_1",
      productId: "product_1",
      updatedAt: new Date("2026-06-17T10:00:00.000Z"),
    });
    db.query.productCosts.findMany.mockResolvedValue([
      {
        amount: "45.00",
        costType: "base",
        createdAt: new Date("2026-06-17T10:00:00.000Z"),
        currency: "BRL",
        effectiveFrom: null,
        id: "cost_1",
        notes: "Atualizado pelo catÃ¡logo",
        organizationId: "org_1",
        productId: "product_1",
        updatedAt: new Date("2026-06-17T10:00:00.000Z"),
      },
      {
        amount: "45.00",
        costType: "base",
        createdAt: new Date("2026-06-17T10:00:00.000Z"),
        currency: "BRL",
        effectiveFrom: null,
        id: "cost_2",
        notes: "Atualizado pelo catÃ¡logo",
        organizationId: "org_1",
        productId: "product_2",
        updatedAt: new Date("2026-06-17T10:00:00.000Z"),
      },
      {
        amount: "45.00",
        costType: "base",
        createdAt: new Date("2026-06-17T10:00:00.000Z"),
        currency: "BRL",
        effectiveFrom: null,
        id: "cost_3",
        notes: "Atualizado pelo catÃƒÂ¡logo",
        organizationId: "org_1",
        productId: "product_3",
        updatedAt: new Date("2026-06-17T10:00:00.000Z"),
      },
    ]);
    db.transaction = vi.fn(async (callback) =>
      callback({
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
        update: txUpdate,
      }),
    );
    financeService.materializeOrganizationMetrics = vi.fn().mockResolvedValue(undefined);

    const { listSyncedProductsReadModel } = await import(
      "@/modules/integrations/synced-products.read-model"
    );
    vi.mocked(listSyncedProductsReadModel).mockImplementation(async () =>
      [
        {
          externalProductId: "MLB123",
          fixedFee: "0.00",
          grossRevenue: "0.00",
          id: "external_0",
          lastOrderedAt: null,
          latestUnitPrice: null,
          linkedProduct: {
            id: "product_1",
            isActive: true,
            name: "Produto Azul",
            sku: "ML-001-AZ",
          },
          marketplaceCommission: "0.00",
          netMarketplaceTake: "0.00",
          orderCount: 0,
          provider: "mercadolivre",
          reviewStatus: "linked_to_existing_product",
          shippingCost: "0.00",
          sku: "ML-001-AZ",
          suggestedMatches: [],
          title: "Produto Azul",
          unitsSold: 0,
        },
        {
          externalProductId: "MLB123:101",
          fixedFee: "0.00",
          grossRevenue: "0.00",
          id: "external_1",
          lastOrderedAt: null,
          latestUnitPrice: null,
          linkedProduct: {
            id: "product_1",
            isActive: true,
            name: "Produto Azul",
            sku: "ML-001-AZ",
          },
          marketplaceCommission: "0.00",
          netMarketplaceTake: "0.00",
          orderCount: 0,
          provider: "mercadolivre",
          reviewStatus: "linked_to_existing_product",
          shippingCost: "0.00",
          sku: "ML-001-AZ",
          suggestedMatches: [],
          title: "Produto - Cor: Azul",
          unitsSold: 0,
        },
        {
          externalProductId: "MLB123:102",
          fixedFee: "0.00",
          grossRevenue: "0.00",
          id: "external_2",
          lastOrderedAt: null,
          latestUnitPrice: null,
          linkedProduct: {
            id: "product_2",
            isActive: true,
            name: "Produto Vermelho",
            sku: "ML-001-VM",
          },
          marketplaceCommission: "0.00",
          netMarketplaceTake: "0.00",
          orderCount: 0,
          provider: "mercadolivre",
          reviewStatus: "linked_to_existing_product",
          shippingCost: "0.00",
          sku: "ML-001-VM",
          suggestedMatches: [],
          title: "Produto - Cor: Vermelho",
          unitsSold: 0,
        },
        {
          externalProductId: "MLB123:103",
          fixedFee: "0.00",
          grossRevenue: "0.00",
          id: "external_3",
          lastOrderedAt: null,
          latestUnitPrice: null,
          linkedProduct: {
            id: "product_3",
            isActive: true,
            name: "Produto Verde",
            sku: "ML-001-VD",
          },
          marketplaceCommission: "0.00",
          netMarketplaceTake: "0.00",
          orderCount: 0,
          provider: "mercadolivre",
          reviewStatus: "linked_to_existing_product",
          shippingCost: "0.00",
          sku: "ML-001-VD",
          suggestedMatches: [],
          title: "Produto - Cor: Verde",
          unitsSold: 0,
        },
      ],
    );

    const result = await service.updateCatalogFinance("org_1", "product_1", {
      packagingCost: "6.50",
      unitCost: "45.00",
    });

    expect(txUpdate).toHaveBeenCalled();
    expect(txUpdate).toHaveBeenCalledTimes(6);
    expect(result).toEqual(
      expect.objectContaining({
        catalogRole: "parent",
        financeDefaults: expect.objectContaining({
          packagingCost: "6.50",
        }),
        latestCost: expect.objectContaining({
          amount: "45.00",
        }),
        children: [
          expect.objectContaining({
            financeDefaults: expect.objectContaining({
              packagingCost: "6.50",
            }),
            latestCost: expect.objectContaining({
              amount: "45.00",
            }),
          }),
          expect.objectContaining({
            financeDefaults: expect.objectContaining({
              packagingCost: "6.50",
            }),
            latestCost: expect.objectContaining({
              amount: "45.00",
            }),
          }),
        ],
      }),
    );
  });

  it("deletes product after validating organization ownership", async () => {
    const { db, financeService, service } = createService();

    db.query.products.findFirst.mockResolvedValueOnce({
      id: "product_1",
      organizationId: "org_1",
    });
    db.delete = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });
    financeService.materializeOrganizationMetrics = vi.fn().mockResolvedValue(undefined);

    const deleteProduct = (
      service as ProductsService & {
        deleteProduct: (
          organizationId: string,
          productId: string,
        ) => Promise<{ id: string }>;
      }
    ).deleteProduct;

    await expect(
      Promise.resolve().then(() => deleteProduct.call(service, "org_1", "product_1")),
    ).resolves.toEqual({ id: "product_1" });
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
    const { listSyncedProductsReadModel } = await import(
      "@/modules/integrations/synced-products.read-model"
    );

    const product = {
      createdAt: new Date("2026-05-01T10:00:00.000Z"),
      financeDefaults: null,
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
      taxRateDefault: "0.090000",
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
    vi.mocked(listSyncedProductsReadModel).mockResolvedValue([]);

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
      taxRateDefault: "0.090000",
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
    expect(listSyncedProductsReadModel).toHaveBeenCalledTimes(3);
    expect(listSyncedProductsReadModel).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        companyId: "22222222-2222-4222-8222-222222222222",
      }),
    );
    expect(listSyncedProductsReadModel).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        companyId: "22222222-2222-4222-8222-222222222222",
      }),
    );
    expect(listSyncedProductsReadModel).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        companyId: "22222222-2222-4222-8222-222222222222",
      }),
    );
    expect(snapshot.monthlyPerformanceRows).toEqual([
      {
        advertisingCost: "10.00",
        channel: "mercadolivre",
        commissionRate: "0.100000",
        id: "perf_1",
        marketplaceCommission: "10.00",
        packagingCost: "2.00",
        productName: "Notebook",
        referenceMonth: "2026-05-01",
        returnsQuantity: 1,
        salePrice: "100.00",
        salesQuantity: 3,
        shippingFee: "6.00",
        sku: "NB-1",
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
      taxRateDefault: "0",
    });
  });

  it("uses selected company as analytics fallback scope", async () => {
    const { db, financeService, service, syncService } = createService();

    db.query.companies.findMany.mockResolvedValue([
      {
        id: "company_1",
        isActive: true,
        organizationId: "org_1",
        taxRateDefault: "0.050000",
        userId: "user_1",
      },
      {
        id: "company_2",
        isActive: true,
        organizationId: "org_1",
        taxRateDefault: "0.120000",
        userId: "user_1",
      },
    ]);
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
      selectedCompanyId: "company_2",
      userId: "user_1",
    });

    expect(snapshot.scope).toEqual({
      companyId: "company_2",
      companyRequired: false,
      referenceMonth: expect.stringMatching(/^\d{4}-\d{2}-01$/),
      taxRateDefault: "0.120000",
    });
  });
});
