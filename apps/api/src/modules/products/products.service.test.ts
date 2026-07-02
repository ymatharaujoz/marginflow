import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { read, utils, write } from "xlsx";
import { ProductsService } from "./products.service";
import { listSyncedProductsReadModel } from "@/modules/integrations/synced-products.read-model";

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
  const db: any = {
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
        findMany: vi.fn().mockResolvedValue([]),
      },
      products: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      companies: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      externalOrders: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      externalProducts: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      productMonthlyPerformance: {
        findMany: vi.fn(),
      },
    },
    update: vi.fn(),
  };

  db.transaction = vi.fn(async (callback: (tx: typeof db) => Promise<void>) =>
    callback(db as never),
  );

  const financeService = {
    buildFinanceSnapshot: vi.fn(),
    materializeOrganizationMetrics: vi.fn(),
  };
  const syncService = {
    getStatus: vi.fn(),
    rematerializeProviderMetrics: vi.fn(),
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

function buildCatalogProductRow(overrides: Record<string, unknown> = {}) {
  return {
    companyId: "company_1",
    createdAt: new Date("2026-04-28T10:00:00.000Z"),
    financeDefaults: null,
    id: "product_1",
    images: [],
    isActive: true,
    name: "Notebook",
    organizationId: "org_1",
    sellingPrice: "120.00",
    sku: "NB-1",
    updatedAt: new Date("2026-04-28T10:00:00.000Z"),
    ...overrides,
  };
}

describe("ProductsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function buildWorkbookBuffer(rows: Array<Record<string, unknown>>) {
    const workbook = utils.book_new();
    const worksheet = utils.json_to_sheet(rows);
    utils.book_append_sheet(workbook, worksheet, "Produtos");
    return Buffer.from(write(workbook, { bookType: "xlsx", type: "buffer" }));
  }

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
    financeService.materializeOrganizationMetrics = vi
      .fn()
      .mockResolvedValue(undefined);

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

  it("formats spreadsheet update errors with friendly messages that surface the raw cell value", async () => {
    const { db, financeService, service } = createService();
    const unitCostHeader = `CUSTO UNIT${String.fromCharCode(193)}RIO`;

    db.query.companies.findMany.mockResolvedValue([
      { id: "company_1", isActive: true },
    ]);
    db.query.products.findFirst
      .mockResolvedValueOnce({
        companyId: "company_1",
        createdAt: new Date("2026-06-17T10:00:00.000Z"),
        financeDefaults: {
          advertisingCost: "0.00",
          createdAt: new Date("2026-06-17T10:00:00.000Z"),
          id: "defaults_1",
          packagingCost: "4.50",
          productId: "550e8400-e29b-41d4-a716-446655440000",
          updatedAt: new Date("2026-06-17T10:00:00.000Z"),
        },
        id: "550e8400-e29b-41d4-a716-446655440000",
        images: [],
        isActive: true,
        name: "Kit Mercado Livre",
        organizationId: "org_1",
        sellingPrice: "149.90",
        sku: "ML-001",
        updatedAt: new Date("2026-06-17T10:00:00.000Z"),
      })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    db.query.productCosts.findFirst.mockResolvedValue({
      amount: "25.00",
      companyId: "company_1",
      costType: "base",
      createdAt: new Date("2026-06-17T10:00:00.000Z"),
      currency: "BRL",
      effectiveFrom: null,
      id: "cost_1",
      notes: null,
      organizationId: "org_1",
      productId: "550e8400-e29b-41d4-a716-446655440000",
      updatedAt: new Date("2026-06-17T10:00:00.000Z"),
    });
    db.transaction = vi.fn(async (callback) =>
      callback({
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      }),
    );
    financeService.materializeOrganizationMetrics = vi
      .fn()
      .mockResolvedValue(undefined);

    const fileBuffer = buildWorkbookBuffer([
      { ID: "not-a-uuid", [unitCostHeader]: 10, EMBALAGEM: 2 },
      {
        ID: "550e8400-e29b-41d4-a716-446655440001",
        [unitCostHeader]: 10,
        EMBALAGEM: "abc",
      },
      {
        ID: "550e8400-e29b-41d4-a716-446655440002",
        [unitCostHeader]: 10,
        EMBALAGEM: -3,
      },
    ]);

    const result = await service.importProducts(
      {
        organizationId: "org_1",
        selectedCompanyId: "company_1",
        userId: "user_1",
      },
      fileBuffer,
    );

    expect(result.imported).toBe(0);
    expect(result.errors).toEqual([
      {
        row: 2,
        message: 'ID: o valor "not-a-uuid" não é um identificador válido.',
      },
      {
        row: 3,
        message:
          'Embalagem: o valor "abc" não é um número válido. Use ponto como separador decimal (ex.: 12.50).',
      },
      {
        row: 4,
        message: "Embalagem: o valor -3 deve ser maior ou igual a zero.",
      },
    ]);
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
    ).rejects.toThrow(
      "Cadastre uma empresa ativa em /app antes de criar ou importar produtos.",
    );

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
    financeService.materializeOrganizationMetrics = vi
      .fn()
      .mockResolvedValue(undefined);

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
      created: 1,
      errors: [],
      imported: 1,
      updated: 0,
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
        created: 0,
        errors: [
          {
            message: 'SKU "ML-001" já existe no catálogo.',
            row: 2,
          },
        ],
        imported: 0,
        updated: 0,
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
      created: 0,
      errors: [
        {
          message: 'SKU "ML-001" jÃ¡ existe no catÃ¡logo',
          row: 2,
        },
      ],
      imported: 0,
      updated: 0,
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
        created: 1,
        errors: [
          {
            message: 'SKU "ml-001" duplicado na planilha',
            row: 3,
          },
        ],
        imported: 1,
        updated: 0,
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
      created: 1,
      errors: [
        {
          message: 'SKU " ml-001 " duplicado na planilha',
          row: 3,
        },
      ],
      imported: 1,
      updated: 0,
    });
  });

  it("exports filtered catalog rows as flattened xlsx rows with product ids", async () => {
    const { db, service } = createService();
    const unitCostHeader = `CUSTO UNIT${String.fromCharCode(193)}RIO`;

    db.query.companies.findMany.mockResolvedValue([
      {
        id: "company_1",
        isActive: true,
      },
    ]);

    vi.spyOn(service, "listProducts").mockResolvedValue([
      {
        catalogGroupKey: null,
        catalogRole: "standalone",
        children: [],
        companyId: "company_1",
        coverImageUrl: null,
        createdAt: "2026-06-17T10:00:00.000Z",
        derivedFromProvider: "mercadolivre",
        financeDefaults: {
          advertisingCost: "0.00",
          createdAt: "2026-06-17T10:00:00.000Z",
          id: "defaults_1",
          packagingCost: "4.50",
          productId: "product_parent",
          updatedAt: "2026-06-17T10:00:00.000Z",
        },
        id: "product_parent",
        images: [],
        isActive: true,
        latestCost: {
          amount: "30.00",
          companyId: "company_1",
          costType: "base",
          createdAt: "2026-06-17T10:00:00.000Z",
          currency: "BRL",
          effectiveFrom: null,
          id: "cost_1",
          notes: null,
          organizationId: "org_1",
          productId: "product_parent",
          updatedAt: "2026-06-17T10:00:00.000Z",
        },
        name: "Tênis Esportivo Masculino - Não Ofertar",
        organizationId: "org_1",
        parentProductId: null,
        sellingPrice: "149.90",
        sku: "ML-001",
        updatedAt: "2026-06-17T10:00:00.000Z",
        variationLabel: null,
      },
      {
        catalogGroupKey: null,
        catalogRole: "standalone",
        children: [],
        companyId: "company_1",
        coverImageUrl: null,
        createdAt: "2026-06-17T10:00:00.000Z",
        derivedFromProvider: "mercadolivre",
        financeDefaults: {
          advertisingCost: "0.00",
          createdAt: "2026-06-17T10:00:00.000Z",
          id: "defaults_2",
          packagingCost: "2.00",
          productId: "product_child",
          updatedAt: "2026-06-17T10:00:00.000Z",
        },
        id: "product_child",
        images: [],
        isActive: true,
        latestCost: {
          amount: "20.00",
          companyId: "company_1",
          costType: "base",
          createdAt: "2026-06-17T10:00:00.000Z",
          currency: "BRL",
          effectiveFrom: null,
          id: "cost_child",
          notes: null,
          organizationId: "org_1",
          productId: "product_child",
          updatedAt: "2026-06-17T10:00:00.000Z",
        },
        name: "Cor: Azul, Tamanho: 39 BR",
        organizationId: "org_1",
        parentProductId: null,
        sellingPrice: "99.90",
        sku: "KIT-AZUL",
        updatedAt: "2026-06-17T10:00:00.000Z",
        variationLabel: null,
      },
      {
        catalogGroupKey: null,
        catalogRole: "standalone",
        children: [],
        companyId: "company_1",
        coverImageUrl: null,
        createdAt: "2026-06-18T10:00:00.000Z",
        derivedFromProvider: null,
        financeDefaults: null,
        id: "product_2",
        images: [],
        isActive: false,
        latestCost: null,
        name: "Notebook",
        organizationId: "org_1",
        parentProductId: null,
        sellingPrice: "89.90",
        sku: "NB-1",
        updatedAt: "2026-06-18T10:00:00.000Z",
        variationLabel: null,
      },
    ] as never);

    const { listSyncedProductsReadModel } =
      await import("@/modules/integrations/synced-products.read-model");
    vi.mocked(listSyncedProductsReadModel).mockResolvedValue([
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
          name: "Tênis Esportivo Masculino - Não Ofertar",
          sku: "ML-001",
        },
        marketplaceCommission: "0.00",
        metadata: { itemId: "MLB123", variationId: null },
        netMarketplaceTake: "0.00",
        orderCount: 0,
        provider: "mercadolivre",
        reviewStatus: "linked_to_existing_product",
        shippingCost: "0.00",
        sku: "ML-001",
        suggestedMatches: [],
        title: "Tênis Esportivo Masculino - Não Ofertar",
        unitsSold: 0,
      },
      {
        externalProductId: "MLB123:39-azul",
        fixedFee: "0.00",
        grossRevenue: "0.00",
        id: "external_child",
        lastOrderedAt: null,
        latestUnitPrice: null,
        linkedProduct: {
          id: "product_child",
          isActive: true,
          name: "Cor: Azul, Tamanho: 39 BR",
          sku: "KIT-AZUL",
        },
        marketplaceCommission: "0.00",
        metadata: { itemId: "MLB123", variationId: "39-azul" },
        netMarketplaceTake: "0.00",
        orderCount: 0,
        provider: "mercadolivre",
        reviewStatus: "linked_to_existing_product",
        shippingCost: "0.00",
        sku: "KIT-AZUL",
        suggestedMatches: [],
        title: "Cor: Azul, Tamanho: 39 BR",
        unitsSold: 0,
      },
    ] as never);

    const fileBuffer = await service.exportProductsSpreadsheet(
      {
        organizationId: "org_1",
        selectedCompanyId: "company_1",
        userId: "user_1",
      },
      {
        marketplaces: ["mercadolivre"],
        search: "tênis",
      },
    );

    const workbook = read(fileBuffer, { type: "buffer" });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]!]!;
    const rows = utils.sheet_to_json<Record<string, unknown>>(worksheet);

    expect(rows).toEqual([
      {
        CANAL: "MELI",
        "CRIADO EM": "17/06/2026",
        [unitCostHeader]: 30,
        EMBALAGEM: 4.5,
        ID: "product_parent",
        PDV: 149.9,
        PRODUTO: "Tênis Esportivo Masculino - Não Ofertar",
        SKU: "ML-001",
        STATUS: "Ativo",
      },
      {
        CANAL: "MELI",
        "CRIADO EM": "17/06/2026",
        [unitCostHeader]: 20,
        EMBALAGEM: 2,
        ID: "product_child",
        PDV: 99.9,
        PRODUTO:
          "Tênis Esportivo Masculino - Não Ofertar | Cor: Azul, Tamanho: 39 BR",
        SKU: "KIT-AZUL",
        STATUS: "Ativo",
      },
    ]);
  });

  it("updates only provided spreadsheet finance fields when export template includes id", async () => {
    const { db, financeService, service } = createService();
    const unitCostHeader = `CUSTO UNIT${String.fromCharCode(193)}RIO`;

    db.query.companies.findMany.mockResolvedValue([
      {
        id: "company_1",
        isActive: true,
      },
    ]);
    db.query.products.findFirst
      .mockResolvedValueOnce({
        companyId: "company_1",
        id: "550e8400-e29b-41d4-a716-446655440000",
        organizationId: "org_1",
      })
      .mockResolvedValueOnce({
        companyId: "company_1",
        createdAt: new Date("2026-06-17T10:00:00.000Z"),
        financeDefaults: {
          advertisingCost: "0.00",
          createdAt: new Date("2026-06-17T10:00:00.000Z"),
          id: "defaults_1",
          packagingCost: "4.50",
          productId: "550e8400-e29b-41d4-a716-446655440000",
          updatedAt: new Date("2026-06-17T10:00:00.000Z"),
        },
        id: "550e8400-e29b-41d4-a716-446655440000",
        images: [],
        isActive: true,
        name: "Kit Mercado Livre",
        organizationId: "org_1",
        sellingPrice: "149.90",
        sku: "ML-001",
        updatedAt: new Date("2026-06-17T10:00:00.000Z"),
      });
    db.query.productCosts.findFirst
      .mockResolvedValueOnce({
        amount: "25.00",
        companyId: "company_1",
        costType: "base",
        createdAt: new Date("2026-06-17T10:00:00.000Z"),
        currency: "BRL",
        effectiveFrom: null,
        id: "cost_1",
        notes: null,
        organizationId: "org_1",
        productId: "550e8400-e29b-41d4-a716-446655440000",
        updatedAt: new Date("2026-06-17T10:00:00.000Z"),
      })
      .mockResolvedValueOnce({
        amount: "31.00",
        companyId: "company_1",
        costType: "base",
        createdAt: new Date("2026-06-17T10:00:00.000Z"),
        currency: "BRL",
        effectiveFrom: null,
        id: "cost_1",
        notes: "Atualizado via planilha",
        organizationId: "org_1",
        productId: "550e8400-e29b-41d4-a716-446655440000",
        updatedAt: new Date("2026-06-17T10:00:00.000Z"),
      });
    db.query.productCosts.findMany.mockResolvedValueOnce([
      {
        amount: "31.00",
        companyId: "company_1",
        costType: "base",
        createdAt: new Date("2026-06-17T10:00:00.000Z"),
        currency: "BRL",
        effectiveFrom: null,
        id: "cost_1",
        notes: "Atualizado via planilha",
        organizationId: "org_1",
        productId: "550e8400-e29b-41d4-a716-446655440000",
        updatedAt: new Date("2026-06-17T10:00:00.000Z"),
      },
    ]);
    const txUpdate = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              amount: "31.00",
            },
          ]),
        }),
      }),
    });
    db.transaction = vi.fn(async (callback) =>
      callback({
        insert: vi.fn(),
        update: txUpdate,
      }),
    );
    financeService.materializeOrganizationMetrics = vi
      .fn()
      .mockResolvedValue(undefined);

    const fileBuffer = buildWorkbookBuffer([
      {
        CANAL: "MELI",
        "CRIADO EM": "17/06/2026",
        [unitCostHeader]: 31,
        EMBALAGEM: "",
        ID: "550e8400-e29b-41d4-a716-446655440000",
        PDV: 149.9,
        PRODUTO: "Kit Mercado Livre",
        SKU: "ML-001",
        STATUS: "Ativo",
      },
    ]);

    await expect(
      service.importProducts(
        {
          organizationId: "org_1",
          selectedCompanyId: "company_1",
          userId: "user_1",
        },
        fileBuffer,
      ),
    ).resolves.toEqual({
      created: 0,
      errors: [],
      imported: 1,
      updated: 1,
    });

    expect(txUpdate).toHaveBeenCalledTimes(1);
    expect(financeService.materializeOrganizationMetrics).toHaveBeenCalledWith(
      "org_1",
      "company_1",
    );
  });

  it("ignores invalid spreadsheet update rows and reports updated vs error totals", async () => {
    const { db, financeService, service } = createService();
    const unitCostHeader = `CUSTO UNIT${String.fromCharCode(193)}RIO`;

    db.query.companies.findMany.mockResolvedValue([
      {
        id: "company_1",
        isActive: true,
      },
    ]);
    db.query.products.findFirst
      .mockResolvedValueOnce({
        companyId: "company_1",
        createdAt: new Date("2026-06-17T10:00:00.000Z"),
        financeDefaults: {
          advertisingCost: "0.00",
          createdAt: new Date("2026-06-17T10:00:00.000Z"),
          id: "defaults_1",
          packagingCost: "4.50",
          productId: "550e8400-e29b-41d4-a716-446655440000",
          updatedAt: new Date("2026-06-17T10:00:00.000Z"),
        },
        id: "550e8400-e29b-41d4-a716-446655440000",
        images: [],
        isActive: true,
        name: "Kit Mercado Livre",
        organizationId: "org_1",
        sellingPrice: "149.90",
        sku: "ML-001",
        updatedAt: new Date("2026-06-17T10:00:00.000Z"),
      })
      .mockResolvedValueOnce(null);
    db.query.productCosts.findFirst.mockResolvedValueOnce({
      amount: "25.00",
      companyId: "company_1",
      costType: "base",
      createdAt: new Date("2026-06-17T10:00:00.000Z"),
      currency: "BRL",
      effectiveFrom: null,
      id: "cost_1",
      notes: null,
      organizationId: "org_1",
      productId: "550e8400-e29b-41d4-a716-446655440000",
      updatedAt: new Date("2026-06-17T10:00:00.000Z"),
    });
    db.transaction = vi.fn(async (callback) =>
      callback({
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      }),
    );
    financeService.materializeOrganizationMetrics = vi
      .fn()
      .mockResolvedValue(undefined);

    const fileBuffer = buildWorkbookBuffer([
      {
        ID: "550e8400-e29b-41d4-a716-446655440000",
        [unitCostHeader]: 31,
        EMBALAGEM: 5,
      },
      {
        ID: "550e8400-e29b-41d4-a716-446655440001",
        [unitCostHeader]: 10,
        EMBALAGEM: 2,
      },
      {
        ID: "550e8400-e29b-41d4-a716-446655440002",
        [unitCostHeader]: -1,
        EMBALAGEM: 2,
      },
      {
        ID: "550e8400-e29b-41d4-a716-446655440003",
        [unitCostHeader]: "abc",
        EMBALAGEM: 2,
      },
      {
        ID: "550e8400-e29b-41d4-a716-446655440004",
        [unitCostHeader]: "",
        EMBALAGEM: "",
      },
    ]);

    await expect(
      service.importProducts(
        {
          organizationId: "org_1",
          selectedCompanyId: "company_1",
          userId: "user_1",
        },
        fileBuffer,
      ),
    ).resolves.toEqual({
      created: 0,
      errors: [
        {
          message: "Produto da planilha nao encontrado no catalogo.",
          row: 3,
        },
        {
          message: "Custo unitário: o valor -1 deve ser maior ou igual a zero.",
          row: 4,
        },
        {
          message:
            'Custo unitário: o valor "abc" não é um número válido. Use ponto como separador decimal (ex.: 12.50).',
          row: 5,
        },
        {
          message: expect.stringContaining("Informe ao menos"),
          row: 6,
        },
      ],
      imported: 1,
      updated: 1,
    });

    expect(financeService.materializeOrganizationMetrics).toHaveBeenCalledWith(
      "org_1",
      "company_1",
    );
  });

  it("imports spreadsheet updates with more than 50 rows", async () => {
    const { db, financeService, service } = createService();
    const unitCostHeader = `CUSTO UNIT${String.fromCharCode(193)}RIO`;
    const ids = Array.from(
      { length: 51 },
      (_, index) =>
        `550e8400-e29b-41d4-a716-${String(index + 1).padStart(12, "0")}`,
    );

    db.query.companies.findMany.mockResolvedValue([
      {
        id: "company_1",
        isActive: true,
      },
    ]);
    db.query.products.findFirst.mockImplementation(async () => {
      const id = ids[db.query.products.findFirst.mock.calls.length - 1];

      return id
        ? {
            companyId: "company_1",
            createdAt: new Date("2026-06-17T10:00:00.000Z"),
            financeDefaults: {
              advertisingCost: "0.00",
              createdAt: new Date("2026-06-17T10:00:00.000Z"),
              id: `defaults_${id}`,
              packagingCost: "4.50",
              productId: id,
              updatedAt: new Date("2026-06-17T10:00:00.000Z"),
            },
            id,
            images: [],
            isActive: true,
            name: `Produto ${id}`,
            organizationId: "org_1",
            sellingPrice: "149.90",
            sku: `SKU-${id}`,
            updatedAt: new Date("2026-06-17T10:00:00.000Z"),
          }
        : null;
    });
    db.query.productCosts.findFirst.mockImplementation(async () => {
      const id = ids[db.query.productCosts.findFirst.mock.calls.length - 1];

      return id
        ? {
            amount: "25.00",
            companyId: "company_1",
            costType: "base",
            createdAt: new Date("2026-06-17T10:00:00.000Z"),
            currency: "BRL",
            effectiveFrom: null,
            id: `cost_${id}`,
            notes: null,
            organizationId: "org_1",
            productId: id,
            updatedAt: new Date("2026-06-17T10:00:00.000Z"),
          }
        : null;
    });
    db.transaction = vi.fn(async (callback) =>
      callback({
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      }),
    );
    financeService.materializeOrganizationMetrics = vi
      .fn()
      .mockResolvedValue(undefined);

    const fileBuffer = buildWorkbookBuffer(
      ids.map((id, index) => ({
        EMBALAGEM: 5 + index,
        ID: id,
        [unitCostHeader]: 31 + index,
      })),
    );

    await expect(
      service.importProducts(
        {
          organizationId: "org_1",
          selectedCompanyId: "company_1",
          userId: "user_1",
        },
        fileBuffer,
      ),
    ).resolves.toEqual({
      created: 0,
      errors: [],
      imported: 51,
      updated: 51,
    });

    expect(financeService.materializeOrganizationMetrics).toHaveBeenCalledTimes(
      1,
    );
    expect(financeService.materializeOrganizationMetrics).toHaveBeenCalledWith(
      "org_1",
      "company_1",
    );
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

  it("rematerializes marketplace performance after manual sku update on a linked product", async () => {
    const { db, service, syncService } = createService();

    db.query.products.findFirst.mockResolvedValue({
      companyId: "company_1",
      id: "product_1",
      organizationId: "org_1",
      sku: "ML-9238238958323",
    });
    db.query.products.findMany.mockResolvedValue([
      {
        id: "product_1",
        sku: "ML-9238238958323",
      },
    ]);
    db.query.externalProducts.findMany.mockResolvedValue([
      {
        linkedProductId: "product_1",
        provider: "mercadolivre",
      },
    ]);
    db.update = createUpdateMock({
      createdAt: new Date("2026-04-28T10:00:00.000Z"),
      id: "product_1",
      isActive: true,
      name: "Notebook",
      organizationId: "org_1",
      sellingPrice: "120.00",
      sku: "CALCAPRETA39",
      updatedAt: new Date("2026-04-28T10:00:00.000Z"),
    });

    await expect(
      service.updateProduct(
        {
          organizationId: "org_1",
          selectedCompanyId: "company_1",
          userId: "user_1",
        },
        "product_1",
        {
          sku: "CALCAPRETA39",
        },
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        id: "product_1",
        sku: "CALCAPRETA39",
      }),
    );
    expect(syncService.rematerializeProviderMetrics).toHaveBeenCalledWith({
      companyId: "company_1",
      organizationId: "org_1",
      providerSlug: "mercadolivre",
      userId: "user_1",
    });
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
    financeService.materializeOrganizationMetrics = vi
      .fn()
      .mockResolvedValue(undefined);

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

  it("updates only target child when saving catalog finance for a Mercado Livre variation", async () => {
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
        companyId: "company_1",
        id: "product_2",
        organizationId: "org_1",
      })
      .mockResolvedValueOnce({
        companyId: "company_1",
        createdAt: new Date("2026-06-17T10:00:00.000Z"),
        financeDefaults: {
          advertisingCost: "0.00",
          createdAt: new Date("2026-06-17T10:00:00.000Z"),
          id: "defaults_2",
          packagingCost: "3.00",
          productId: "product_2",
          updatedAt: new Date("2026-06-17T10:00:00.000Z"),
        },
        id: "product_2",
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
        name: "Produto Pai",
        organizationId: "org_1",
        sellingPrice: "149.90",
        sku: "ML-001",
        updatedAt: new Date("2026-06-17T10:00:00.000Z"),
      },
      {
        createdAt: new Date("2026-06-17T10:00:00.000Z"),
        financeDefaults: {
          advertisingCost: "0.00",
          createdAt: new Date("2026-06-17T10:00:00.000Z"),
          id: "defaults_2",
          packagingCost: "4.75",
          productId: "product_2",
          updatedAt: new Date("2026-06-17T10:00:00.000Z"),
        },
        id: "product_2",
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
          id: "defaults_3",
          packagingCost: "5.50",
          productId: "product_3",
          updatedAt: new Date("2026-06-17T10:00:00.000Z"),
        },
        id: "product_3",
        images: [],
        isActive: true,
        name: "Produto Vermelho",
        organizationId: "org_1",
        sellingPrice: "149.90",
        sku: "ML-001-VM",
        updatedAt: new Date("2026-06-17T10:00:00.000Z"),
      },
    ]);
    db.query.productCosts.findFirst.mockResolvedValue({
      amount: "30.00",
      companyId: "company_1",
      costType: "base",
      createdAt: new Date("2026-06-17T10:00:00.000Z"),
      currency: "BRL",
      effectiveFrom: null,
      id: "cost_2",
      notes: null,
      organizationId: "org_1",
      productId: "product_2",
      updatedAt: new Date("2026-06-17T10:00:00.000Z"),
    });
    db.query.productCosts.findMany.mockResolvedValue([
      {
        amount: "50.00",
        companyId: "company_1",
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
        amount: "42.00",
        companyId: "company_1",
        costType: "base",
        createdAt: new Date("2026-06-17T10:00:00.000Z"),
        currency: "BRL",
        effectiveFrom: null,
        id: "cost_2",
        notes: "Atualizado pelo catálogo",
        organizationId: "org_1",
        productId: "product_2",
        updatedAt: new Date("2026-06-17T10:00:00.000Z"),
      },
      {
        amount: "55.00",
        companyId: "company_1",
        costType: "base",
        createdAt: new Date("2026-06-17T10:00:00.000Z"),
        currency: "BRL",
        effectiveFrom: null,
        id: "cost_3",
        notes: null,
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
    financeService.materializeOrganizationMetrics = vi
      .fn()
      .mockResolvedValue(undefined);

    const { listSyncedProductsReadModel } =
      await import("@/modules/integrations/synced-products.read-model");
    vi.mocked(listSyncedProductsReadModel).mockResolvedValue([
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
          name: "Produto Pai",
          sku: "ML-001",
        },
        marketplaceCommission: "0.00",
        netMarketplaceTake: "0.00",
        orderCount: 0,
        provider: "mercadolivre",
        reviewStatus: "linked_to_existing_product",
        shippingCost: "0.00",
        sku: "ML-001",
        suggestedMatches: [],
        title: "Produto Pai",
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
          id: "product_3",
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
    ]);

    const result = await service.updateCatalogFinance("org_1", "product_2", {
      packagingCost: "4.75",
      unitCost: "42.00",
    });

    expect(txUpdate).toHaveBeenCalledTimes(2);
    expect(result).toEqual(
      expect.objectContaining({
        catalogRole: "child",
        financeDefaults: expect.objectContaining({
          packagingCost: "4.75",
        }),
        latestCost: expect.objectContaining({
          amount: "42.00",
        }),
      }),
    );
    expect(result.children).toEqual([]);
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

    const { listSyncedProductsReadModel } =
      await import("@/modules/integrations/synced-products.read-model");
    vi.mocked(listSyncedProductsReadModel).mockImplementation(async () => [
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
    ]);

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

    const { listSyncedProductsReadModel } =
      await import("@/modules/integrations/synced-products.read-model");
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
        children: [],
        parentProductId: null,
        productId: "product_parent",
        salesQuantity: 1,
        returnsQuantity: 0,
        shippingFee: "5.00",
        sku: "ML-001-PAI",
        variationLabel: null,
      }),
      expect.objectContaining({
        catalogGroupKey: "mercadolivre:MLB123",
        catalogRole: "child",
        children: [],
        parentProductId: "product_parent",
        productId: "product_child_1",
        salesQuantity: 2,
        returnsQuantity: 0,
        shippingFee: "6.00",
        sku: "ML-001-AZ",
        variationLabel: "Cor: Azul",
      }),
      expect.objectContaining({
        catalogGroupKey: "mercadolivre:MLB123",
        catalogRole: "child",
        children: [],
        parentProductId: "product_parent",
        productId: "product_child_2",
        salesQuantity: 3,
        returnsQuantity: 1,
        shippingFee: "7.00",
        sku: "ML-001-VM",
        variationLabel: "Cor: Vermelho",
      }),
    ]);
  });

  it("groups Mercado Livre footwear variations by metadata when external ids are not colon-delimited", async () => {
    const { db, financeService, service, syncService } = createService();

    db.query.companies.findMany.mockResolvedValue([
      {
        id: "company_1",
        isActive: true,
        taxRateDefault: "0.120000",
      },
    ]);
    db.query.products.findMany
      .mockResolvedValueOnce([
        {
          createdAt: new Date("2026-06-17T10:00:00.000Z"),
          financeDefaults: null,
          id: "product_boot_parent",
          images: [],
          isActive: true,
          name: "Tenis Run Pro",
          organizationId: "org_1",
          sellingPrice: "199.90",
          sku: "TENIS-RUN-PRO",
          updatedAt: new Date("2026-06-17T10:00:00.000Z"),
        },
        {
          createdAt: new Date("2026-06-17T10:00:00.000Z"),
          financeDefaults: null,
          id: "product_boot_39",
          images: [],
          isActive: true,
          name: "Tenis Run Pro 39",
          organizationId: "org_1",
          sellingPrice: "199.90",
          sku: "TENIS-RUN-PRO-39",
          updatedAt: new Date("2026-06-17T10:00:00.000Z"),
        },
      ])
      .mockResolvedValueOnce([
        {
          createdAt: new Date("2026-06-17T10:00:00.000Z"),
          id: "product_boot_parent",
          isActive: true,
          name: "Tenis Run Pro",
          organizationId: "org_1",
          sellingPrice: "199.90",
          sku: "TENIS-RUN-PRO",
          updatedAt: new Date("2026-06-17T10:00:00.000Z"),
        },
        {
          createdAt: new Date("2026-06-17T10:00:00.000Z"),
          id: "product_boot_39",
          isActive: true,
          name: "Tenis Run Pro 39",
          organizationId: "org_1",
          sellingPrice: "199.90",
          sku: "TENIS-RUN-PRO-39",
          updatedAt: new Date("2026-06-17T10:00:00.000Z"),
        },
      ]);
    db.query.productCosts.findMany.mockResolvedValue([]);
    db.query.adCosts.findMany.mockResolvedValue([]);
    db.query.manualExpenses.findMany.mockResolvedValue([]);
    db.query.productMonthlyPerformance.findMany.mockResolvedValue([]);
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

    const { listSyncedProductsReadModel } =
      await import("@/modules/integrations/synced-products.read-model");
    vi.mocked(listSyncedProductsReadModel).mockImplementation(async () => [
      {
        externalProductId: "MLBBOOT123",
        fixedFee: "0.00",
        grossRevenue: "0.00",
        id: "external_boot_parent",
        lastOrderedAt: null,
        latestUnitPrice: null,
        linkedProduct: {
          id: "product_boot_parent",
          isActive: true,
          name: "Tenis Run Pro",
          sku: "TENIS-RUN-PRO",
        },
        marketplaceCommission: "0.00",
        metadata: {
          itemId: "MLBBOOT123",
          variationId: null,
        },
        netMarketplaceTake: "0.00",
        orderCount: 0,
        provider: "mercadolivre",
        reviewStatus: "linked_to_existing_product",
        shippingCost: "0.00",
        sku: "TENIS-RUN-PRO",
        suggestedMatches: [],
        title: "Tenis Run Pro",
        unitsSold: 0,
      } as never,
      {
        externalProductId: "MLBBOOT123-39",
        fixedFee: "0.00",
        grossRevenue: "0.00",
        id: "external_boot_39",
        lastOrderedAt: null,
        latestUnitPrice: null,
        linkedProduct: {
          id: "product_boot_39",
          isActive: true,
          name: "Tenis Run Pro 39",
          sku: "TENIS-RUN-PRO-39",
        },
        marketplaceCommission: "0.00",
        metadata: {
          itemId: "MLBBOOT123",
          variationId: "39",
        },
        netMarketplaceTake: "0.00",
        orderCount: 0,
        provider: "mercadolivre",
        reviewStatus: "linked_to_existing_product",
        shippingCost: "0.00",
        sku: "TENIS-RUN-PRO-39",
        suggestedMatches: [],
        title: "Tamanho: 39",
        unitsSold: 0,
      } as never,
    ]);

    const snapshot = await service.getAnalyticsSnapshot({
      organizationId: "org_1",
      userId: "user_1",
    });

    expect(snapshot.products).toEqual([
      expect.objectContaining({
        catalogGroupKey: "mercadolivre:MLBBOOT123",
        catalogRole: "parent",
        children: [
          expect.objectContaining({
            catalogRole: "child",
            id: "product_boot_39",
            parentProductId: "product_boot_parent",
            variationLabel: "Tamanho: 39",
          }),
        ],
        id: "product_boot_parent",
      }),
    ]);
  });

  it("groups Mercado Livre matrix variations under parent when metadata arrives before parent and external ids have no colon", async () => {
    const { db, financeService, service, syncService } = createService();

    db.query.companies.findMany.mockResolvedValue([
      {
        id: "company_1",
        isActive: true,
        taxRateDefault: "0.120000",
      },
    ]);
    db.query.products.findMany
      .mockResolvedValueOnce([
        {
          createdAt: new Date("2026-06-17T10:00:00.000Z"),
          financeDefaults: null,
          id: "product_boot_parent",
          images: [],
          isActive: true,
          name: "Tenis Run Pro",
          organizationId: "org_1",
          sellingPrice: "199.90",
          sku: "TENIS-RUN-PRO",
          updatedAt: new Date("2026-06-17T10:00:00.000Z"),
        },
        {
          createdAt: new Date("2026-06-17T10:00:00.000Z"),
          financeDefaults: null,
          id: "product_boot_39_blue",
          images: [],
          isActive: true,
          name: "Tenis Run Pro 39 Azul",
          organizationId: "org_1",
          sellingPrice: "199.90",
          sku: "TENIS-RUN-PRO-39-AZ",
          updatedAt: new Date("2026-06-17T10:00:00.000Z"),
        },
        {
          createdAt: new Date("2026-06-17T10:00:00.000Z"),
          financeDefaults: null,
          id: "product_boot_40_black",
          images: [],
          isActive: true,
          name: "Tenis Run Pro 40 Preto",
          organizationId: "org_1",
          sellingPrice: "199.90",
          sku: "TENIS-RUN-PRO-40-PR",
          updatedAt: new Date("2026-06-17T10:00:00.000Z"),
        },
      ])
      .mockResolvedValueOnce([
        {
          createdAt: new Date("2026-06-17T10:00:00.000Z"),
          id: "product_boot_parent",
          isActive: true,
          name: "Tenis Run Pro",
          organizationId: "org_1",
          sellingPrice: "199.90",
          sku: "TENIS-RUN-PRO",
          updatedAt: new Date("2026-06-17T10:00:00.000Z"),
        },
        {
          createdAt: new Date("2026-06-17T10:00:00.000Z"),
          id: "product_boot_39_blue",
          isActive: true,
          name: "Tenis Run Pro 39 Azul",
          organizationId: "org_1",
          sellingPrice: "199.90",
          sku: "TENIS-RUN-PRO-39-AZ",
          updatedAt: new Date("2026-06-17T10:00:00.000Z"),
        },
        {
          createdAt: new Date("2026-06-17T10:00:00.000Z"),
          id: "product_boot_40_black",
          isActive: true,
          name: "Tenis Run Pro 40 Preto",
          organizationId: "org_1",
          sellingPrice: "199.90",
          sku: "TENIS-RUN-PRO-40-PR",
          updatedAt: new Date("2026-06-17T10:00:00.000Z"),
        },
      ]);
    db.query.productCosts.findMany.mockResolvedValue([]);
    db.query.adCosts.findMany.mockResolvedValue([]);
    db.query.manualExpenses.findMany.mockResolvedValue([]);
    db.query.productMonthlyPerformance.findMany.mockResolvedValue([]);
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

    const { listSyncedProductsReadModel } =
      await import("@/modules/integrations/synced-products.read-model");
    vi.mocked(listSyncedProductsReadModel).mockImplementation(async () => [
      {
        externalProductId: "MLBBOOT123-39-AZ",
        fixedFee: "0.00",
        grossRevenue: "0.00",
        id: "external_boot_39_blue",
        lastOrderedAt: null,
        latestUnitPrice: null,
        linkedProduct: {
          id: "product_boot_39_blue",
          isActive: true,
          name: "Tenis Run Pro 39 Azul",
          sku: "TENIS-RUN-PRO-39-AZ",
        },
        marketplaceCommission: "0.00",
        metadata: {
          itemId: "MLBBOOT123",
          variationId: "39-AZ",
        },
        netMarketplaceTake: "0.00",
        orderCount: 0,
        provider: "mercadolivre",
        reviewStatus: "linked_to_existing_product",
        shippingCost: "0.00",
        sku: "TENIS-RUN-PRO-39-AZ",
        suggestedMatches: [],
        title: "Cor: Azul | Tamanho: 39",
        unitsSold: 0,
      } as never,
      {
        externalProductId: "MLBBOOT123-40-PR",
        fixedFee: "0.00",
        grossRevenue: "0.00",
        id: "external_boot_40_black",
        lastOrderedAt: null,
        latestUnitPrice: null,
        linkedProduct: {
          id: "product_boot_40_black",
          isActive: true,
          name: "Tenis Run Pro 40 Preto",
          sku: "TENIS-RUN-PRO-40-PR",
        },
        marketplaceCommission: "0.00",
        metadata: {
          itemId: "MLBBOOT123",
          variationId: "40-PR",
        },
        netMarketplaceTake: "0.00",
        orderCount: 0,
        provider: "mercadolivre",
        reviewStatus: "linked_to_existing_product",
        shippingCost: "0.00",
        sku: "TENIS-RUN-PRO-40-PR",
        suggestedMatches: [],
        title: "Cor: Preto | Tamanho: 40",
        unitsSold: 0,
      } as never,
      {
        externalProductId: "MLBBOOT123",
        fixedFee: "0.00",
        grossRevenue: "0.00",
        id: "external_boot_parent",
        lastOrderedAt: null,
        latestUnitPrice: null,
        linkedProduct: {
          id: "product_boot_parent",
          isActive: true,
          name: "Tenis Run Pro",
          sku: "TENIS-RUN-PRO",
        },
        marketplaceCommission: "0.00",
        metadata: {
          itemId: "MLBBOOT123",
          variationId: null,
        },
        netMarketplaceTake: "0.00",
        orderCount: 0,
        provider: "mercadolivre",
        reviewStatus: "linked_to_existing_product",
        shippingCost: "0.00",
        sku: "TENIS-RUN-PRO",
        suggestedMatches: [],
        title: "Tenis Run Pro",
        unitsSold: 0,
      } as never,
    ]);

    const snapshot = await service.getAnalyticsSnapshot({
      organizationId: "org_1",
      userId: "user_1",
    });

    expect(snapshot.products).toEqual([
      expect.objectContaining({
        catalogGroupKey: "mercadolivre:MLBBOOT123",
        catalogRole: "parent",
        children: expect.arrayContaining([
          expect.objectContaining({
            catalogRole: "child",
            id: "product_boot_39_blue",
            parentProductId: "product_boot_parent",
            variationLabel: "Cor: Azul | Tamanho: 39",
          }),
          expect.objectContaining({
            catalogRole: "child",
            id: "product_boot_40_black",
            parentProductId: "product_boot_parent",
            variationLabel: "Cor: Preto | Tamanho: 40",
          }),
        ]),
        id: "product_boot_parent",
      }),
    ]);
  });

  it("builds a synthetic Mercado Livre parent when only child variations are linked", async () => {
    const { db, financeService, service } = createService();

    db.query.companies.findMany.mockResolvedValue([
      {
        id: "company_1",
        isActive: true,
        taxRateDefault: "0.120000",
      },
    ]);
    db.query.products.findMany
      .mockResolvedValueOnce([
        {
          companyId: "company_1",
          createdAt: new Date("2026-06-17T10:00:00.000Z"),
          financeDefaults: null,
          id: "product_boot_39_blue",
          images: [],
          isActive: true,
          name: "Tenis Run Pro 39 Azul",
          organizationId: "org_1",
          sellingPrice: "199.90",
          sku: "TENIS-RUN-PRO-39-AZ",
          updatedAt: new Date("2026-06-17T10:00:00.000Z"),
        },
        {
          companyId: "company_1",
          createdAt: new Date("2026-06-17T10:00:00.000Z"),
          financeDefaults: null,
          id: "product_boot_40_black",
          images: [],
          isActive: true,
          name: "Tenis Run Pro 40 Preto",
          organizationId: "org_1",
          sellingPrice: "199.90",
          sku: "TENIS-RUN-PRO-40-PR",
          updatedAt: new Date("2026-06-17T10:00:00.000Z"),
        },
      ])
      .mockResolvedValueOnce([
        {
          companyId: "company_1",
          createdAt: new Date("2026-06-17T10:00:00.000Z"),
          id: "product_boot_39_blue",
          isActive: true,
          name: "Tenis Run Pro 39 Azul",
          organizationId: "org_1",
          sellingPrice: "199.90",
          sku: "TENIS-RUN-PRO-39-AZ",
          updatedAt: new Date("2026-06-17T10:00:00.000Z"),
        },
        {
          companyId: "company_1",
          createdAt: new Date("2026-06-17T10:00:00.000Z"),
          id: "product_boot_40_black",
          isActive: true,
          name: "Tenis Run Pro 40 Preto",
          organizationId: "org_1",
          sellingPrice: "199.90",
          sku: "TENIS-RUN-PRO-40-PR",
          updatedAt: new Date("2026-06-17T10:00:00.000Z"),
        },
      ]);
    db.query.productCosts.findMany.mockResolvedValue([]);
    db.query.adCosts.findMany.mockResolvedValue([]);
    db.query.manualExpenses.findMany.mockResolvedValue([]);
    db.query.productMonthlyPerformance.findMany.mockResolvedValue([]);
    financeService.buildFinanceSnapshot.mockResolvedValue({
      adCosts: [],
      manualExpenses: [],
      monthlyPerformance: [],
      orders: [],
      productCosts: [],
      products: [],
    });
    financeService.materializeOrganizationMetrics.mockResolvedValue(undefined);
    db.query.productCosts.findFirst.mockResolvedValue(null);
    db.query.externalProducts.findMany.mockResolvedValue([]);
    vi.mocked(listSyncedProductsReadModel).mockResolvedValue([
      {
        externalProductId: "MLBBOOT123:39-AZ",
        fixedFee: "0.00",
        grossRevenue: "0.00",
        id: "external_boot_39_blue",
        lastOrderedAt: null,
        latestUnitPrice: null,
        linkedProduct: {
          id: "product_boot_39_blue",
          isActive: true,
          name: "Tenis Run Pro 39 Azul",
          sku: "TENIS-RUN-PRO-39-AZ",
        },
        marketplaceCommission: "0.00",
        metadata: {
          itemId: "MLBBOOT123",
          variationId: "39-AZ",
        },
        netMarketplaceTake: "0.00",
        orderCount: 0,
        provider: "mercadolivre",
        reviewStatus: "linked_to_existing_product",
        shippingCost: "0.00",
        sku: "TENIS-RUN-PRO-39-AZ",
        suggestedMatches: [],
        title: "Cor: Azul | Tamanho: 39",
        unitsSold: 0,
      } as never,
      {
        externalProductId: "MLBBOOT123:40-PR",
        fixedFee: "0.00",
        grossRevenue: "0.00",
        id: "external_boot_40_black",
        lastOrderedAt: null,
        latestUnitPrice: null,
        linkedProduct: {
          id: "product_boot_40_black",
          isActive: true,
          name: "Tenis Run Pro 40 Preto",
          sku: "TENIS-RUN-PRO-40-PR",
        },
        marketplaceCommission: "0.00",
        metadata: {
          itemId: "MLBBOOT123",
          variationId: "40-PR",
        },
        netMarketplaceTake: "0.00",
        orderCount: 0,
        provider: "mercadolivre",
        reviewStatus: "linked_to_existing_product",
        shippingCost: "0.00",
        sku: "TENIS-RUN-PRO-40-PR",
        suggestedMatches: [],
        title: "Cor: Preto | Tamanho: 40",
        unitsSold: 0,
      } as never,
      {
        externalProductId: "MLBBOOT123",
        fixedFee: "0.00",
        grossRevenue: "0.00",
        id: "external_boot_parent",
        lastOrderedAt: null,
        latestUnitPrice: null,
        linkedProduct: null,
        marketplaceCommission: "0.00",
        metadata: {
          itemId: "MLBBOOT123",
          variationId: null,
        },
        netMarketplaceTake: "0.00",
        orderCount: 0,
        provider: "mercadolivre",
        reviewStatus: "unreviewed",
        shippingCost: "0.00",
        sku: "TENIS-RUN-PRO",
        suggestedMatches: [],
        title: "Tenis Run Pro",
        unitsSold: 0,
      } as never,
    ]);

    const snapshot = await service.getAnalyticsSnapshot({
      organizationId: "org_1",
      userId: "user_1",
    });

    expect(snapshot.products).toEqual([
      expect.objectContaining({
        catalogGroupKey: "mercadolivre:MLBBOOT123",
        catalogRole: "parent",
        id: "synthetic-parent:mercadolivre:MLBBOOT123",
        isSyntheticParent: true,
        parentProductId: null,
        sku: "TENIS-RUN-PRO",
        name: "Tenis Run Pro",
        children: [
          expect.objectContaining({
            catalogRole: "child",
            id: "product_boot_39_blue",
            isSyntheticParent: false,
            parentProductId: "synthetic-parent:mercadolivre:MLBBOOT123",
            variationLabel: "Cor: Azul | Tamanho: 39",
          }),
          expect.objectContaining({
            catalogRole: "child",
            id: "product_boot_40_black",
            isSyntheticParent: false,
            parentProductId: "synthetic-parent:mercadolivre:MLBBOOT123",
            variationLabel: "Cor: Preto | Tamanho: 40",
          }),
        ],
      }),
    ]);
  });

  it("builds a synthetic Mercado Livre parent when persisted parent product collides with a variation product", async () => {
    const { db, financeService, service } = createService();

    db.query.companies.findMany.mockResolvedValue([
      {
        id: "company_1",
        isActive: true,
        taxRateDefault: "0.120000",
      },
    ]);
    db.query.products.findMany
      .mockResolvedValueOnce([
        {
          companyId: "company_1",
          createdAt: new Date("2026-06-17T10:00:00.000Z"),
          financeDefaults: null,
          id: "product_boot_35_black",
          images: [],
          isActive: true,
          name: "Bota Feminina Preta 35",
          organizationId: "org_1",
          sellingPrice: "189.90",
          sku: "BOTA-PRETA-35",
          updatedAt: new Date("2026-06-17T10:00:00.000Z"),
        },
        {
          companyId: "company_1",
          createdAt: new Date("2026-06-17T10:00:00.000Z"),
          financeDefaults: null,
          id: "product_boot_37_brown",
          images: [],
          isActive: true,
          name: "Bota Feminina Marrom 37",
          organizationId: "org_1",
          sellingPrice: "189.90",
          sku: "BOTA-MARROM-37",
          updatedAt: new Date("2026-06-17T10:00:00.000Z"),
        },
      ])
      .mockResolvedValueOnce([
        {
          companyId: "company_1",
          createdAt: new Date("2026-06-17T10:00:00.000Z"),
          id: "product_boot_35_black",
          isActive: true,
          name: "Bota Feminina Preta 35",
          organizationId: "org_1",
          sellingPrice: "189.90",
          sku: "BOTA-PRETA-35",
          updatedAt: new Date("2026-06-17T10:00:00.000Z"),
        },
        {
          companyId: "company_1",
          createdAt: new Date("2026-06-17T10:00:00.000Z"),
          id: "product_boot_37_brown",
          isActive: true,
          name: "Bota Feminina Marrom 37",
          organizationId: "org_1",
          sellingPrice: "189.90",
          sku: "BOTA-MARROM-37",
          updatedAt: new Date("2026-06-17T10:00:00.000Z"),
        },
      ]);
    db.query.productCosts.findMany.mockResolvedValue([]);
    db.query.adCosts.findMany.mockResolvedValue([]);
    db.query.manualExpenses.findMany.mockResolvedValue([]);
    db.query.productMonthlyPerformance.findMany.mockResolvedValue([]);
    financeService.buildFinanceSnapshot.mockResolvedValue({
      adCosts: [],
      manualExpenses: [],
      monthlyPerformance: [],
      orders: [],
      productCosts: [],
      products: [],
    });
    financeService.materializeOrganizationMetrics.mockResolvedValue(undefined);
    db.query.productCosts.findFirst.mockResolvedValue(null);
    db.query.externalProducts.findMany.mockResolvedValue([]);
    vi.mocked(listSyncedProductsReadModel).mockResolvedValue([
      {
        externalProductId: "MLBBOOT456",
        fixedFee: "0.00",
        grossRevenue: "0.00",
        id: "external_boot_parent",
        lastOrderedAt: null,
        latestUnitPrice: null,
        linkedProduct: {
          id: "product_boot_35_black",
          isActive: true,
          name: "Bota Feminina Preta 35",
          sku: "BOTA-PAI",
        },
        marketplaceCommission: "0.00",
        metadata: {
          itemId: "MLBBOOT456",
          variationId: null,
        },
        netMarketplaceTake: "0.00",
        orderCount: 0,
        provider: "mercadolivre",
        reviewStatus: "linked_to_existing_product",
        shippingCost: "0.00",
        sku: "BOTA-PAI",
        suggestedMatches: [],
        title: "Bota Feminina",
        unitsSold: 0,
      } as never,
      {
        externalProductId: "MLBBOOT456:35-PT",
        fixedFee: "0.00",
        grossRevenue: "0.00",
        id: "external_boot_35_black",
        lastOrderedAt: null,
        latestUnitPrice: null,
        linkedProduct: {
          id: "product_boot_35_black",
          isActive: true,
          name: "Bota Feminina Preta 35",
          sku: "BOTA-PRETA-35",
        },
        marketplaceCommission: "0.00",
        metadata: {
          itemId: "MLBBOOT456",
          variationId: "35-PT",
        },
        netMarketplaceTake: "0.00",
        orderCount: 0,
        provider: "mercadolivre",
        reviewStatus: "linked_to_existing_product",
        shippingCost: "0.00",
        sku: "BOTA-PRETA-35",
        suggestedMatches: [],
        title: "Cor: Preto | Tamanho: 35",
        unitsSold: 0,
      } as never,
      {
        externalProductId: "MLBBOOT456:37-MR",
        fixedFee: "0.00",
        grossRevenue: "0.00",
        id: "external_boot_37_brown",
        lastOrderedAt: null,
        latestUnitPrice: null,
        linkedProduct: {
          id: "product_boot_37_brown",
          isActive: true,
          name: "Bota Feminina Marrom 37",
          sku: "BOTA-MARROM-37",
        },
        marketplaceCommission: "0.00",
        metadata: {
          itemId: "MLBBOOT456",
          variationId: "37-MR",
        },
        netMarketplaceTake: "0.00",
        orderCount: 0,
        provider: "mercadolivre",
        reviewStatus: "linked_to_existing_product",
        shippingCost: "0.00",
        sku: "BOTA-MARROM-37",
        suggestedMatches: [],
        title: "Cor: Marrom | Tamanho: 37",
        unitsSold: 0,
      } as never,
    ]);

    const snapshot = await service.getAnalyticsSnapshot({
      organizationId: "org_1",
      userId: "user_1",
    });

    expect(snapshot.products).toEqual([
      expect.objectContaining({
        catalogGroupKey: "mercadolivre:MLBBOOT456",
        catalogRole: "parent",
        id: "synthetic-parent:mercadolivre:MLBBOOT456",
        isSyntheticParent: true,
        name: "Bota Feminina",
        sku: "BOTA-PAI",
        children: [
          expect.objectContaining({
            catalogRole: "child",
            id: "product_boot_35_black",
            parentProductId: "synthetic-parent:mercadolivre:MLBBOOT456",
            variationLabel: "Cor: Preto | Tamanho: 35",
          }),
          expect.objectContaining({
            catalogRole: "child",
            id: "product_boot_37_brown",
            parentProductId: "synthetic-parent:mercadolivre:MLBBOOT456",
            variationLabel: "Cor: Marrom | Tamanho: 37",
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
    financeService.materializeOrganizationMetrics = vi
      .fn()
      .mockResolvedValue(undefined);

    const { listSyncedProductsReadModel } =
      await import("@/modules/integrations/synced-products.read-model");
    vi.mocked(listSyncedProductsReadModel).mockImplementation(async () => [
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
        externalProductId: "MLB123:102",
        fixedFee: "0.00",
        grossRevenue: "0.00",
        id: "external_2",
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
    ]);

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

    db.query.products.findMany.mockResolvedValue([
      buildCatalogProductRow(),
    ]);
    vi.mocked(listSyncedProductsReadModel).mockResolvedValueOnce([]);
    db.delete = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });
    financeService.materializeOrganizationMetrics = vi
      .fn()
      .mockResolvedValue(undefined);

    const deleteProduct = (
      service as ProductsService & {
        deleteProduct: (
          organizationId: string,
          productId: string,
        ) => Promise<{ id: string }>;
      }
    ).deleteProduct;

    await expect(
      Promise.resolve().then(() =>
        deleteProduct.call(service, "org_1", "product_1"),
      ),
    ).resolves.toEqual({ id: "product_1" });
    expect(db.delete).toHaveBeenCalledTimes(1);
    expect(db.transaction).toHaveBeenCalledTimes(1);
  });

  it("deletes a catalog parent together with all linked variations", async () => {
    const { db, financeService, service } = createService();

    db.query.products.findMany.mockResolvedValue([
      buildCatalogProductRow({
        id: "product_parent",
        name: "Produto Pai",
        sku: "PARENT-1",
      }),
      buildCatalogProductRow({
        id: "product_child_1",
        name: "Variação Azul",
        sku: "CHILD-1",
      }),
      buildCatalogProductRow({
        id: "product_child_2",
        name: "Variação Vermelha",
        sku: "CHILD-2",
      }),
    ]);
    vi.mocked(listSyncedProductsReadModel).mockResolvedValueOnce([
      {
        externalProductId: "MLB123",
        id: "synced_parent",
        linkedProduct: {
          id: "product_parent",
        },
        metadata: {
          itemId: "MLB123",
        },
        provider: "mercadolivre",
        title: "Produto Pai",
      },
      {
        externalProductId: "MLB123:1",
        id: "synced_child_1",
        linkedProduct: {
          id: "product_child_1",
        },
        metadata: {
          itemId: "MLB123",
          variationId: "1",
        },
        provider: "mercadolivre",
        title: "Cor: Azul",
      },
      {
        externalProductId: "MLB123:2",
        id: "synced_child_2",
        linkedProduct: {
          id: "product_child_2",
        },
        metadata: {
          itemId: "MLB123",
          variationId: "2",
        },
        provider: "mercadolivre",
        title: "Cor: Vermelho",
      },
    ] as never);
    db.delete = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });
    financeService.materializeOrganizationMetrics = vi
      .fn()
      .mockResolvedValue(undefined);

    const deleteProduct = (
      service as ProductsService & {
        deleteProduct: (
          organizationId: string,
          productId: string,
        ) => Promise<{ id: string }>;
      }
    ).deleteProduct;

    await expect(
      Promise.resolve().then(() =>
        deleteProduct.call(service, "org_1", "product_parent"),
      ),
    ).resolves.toEqual({ id: "product_parent" });
    expect(db.delete).toHaveBeenCalledTimes(3);
    expect(db.transaction).toHaveBeenCalledTimes(1);
  });

  it("deletes a catalog parent together with all linked variations in bulk", async () => {
    const { db, financeService, service } = createService();

    db.query.products.findMany.mockResolvedValue([
      {
        companyId: "company_1",
        createdAt: new Date("2026-04-28T10:00:00.000Z"),
        financeDefaults: null,
        id: "product_parent",
        images: [],
        isActive: true,
        name: "Produto Pai",
        organizationId: "org_1",
        sellingPrice: "149.90",
        sku: "PARENT-1",
        updatedAt: new Date("2026-04-28T10:00:00.000Z"),
      },
      {
        companyId: "company_1",
        createdAt: new Date("2026-04-28T10:00:00.000Z"),
        financeDefaults: null,
        id: "product_child_1",
        images: [],
        isActive: true,
        name: "Variação Azul",
        organizationId: "org_1",
        sellingPrice: "149.90",
        sku: "CHILD-1",
        updatedAt: new Date("2026-04-28T10:00:00.000Z"),
      },
      {
        companyId: "company_1",
        createdAt: new Date("2026-04-28T10:00:00.000Z"),
        financeDefaults: null,
        id: "product_child_2",
        images: [],
        isActive: true,
        name: "Variação Vermelha",
        organizationId: "org_1",
        sellingPrice: "149.90",
        sku: "CHILD-2",
        updatedAt: new Date("2026-04-28T10:00:00.000Z"),
      },
    ] as never);
    vi.mocked(listSyncedProductsReadModel).mockResolvedValueOnce([
      {
        externalProductId: "MLB123",
        id: "synced_parent",
        linkedProduct: {
          id: "product_parent",
        },
        metadata: {
          itemId: "MLB123",
        },
        provider: "mercadolivre",
        title: "Produto Pai",
      },
      {
        externalProductId: "MLB123:1",
        id: "synced_child_1",
        linkedProduct: {
          id: "product_child_1",
        },
        metadata: {
          itemId: "MLB123",
          variationId: "1",
        },
        provider: "mercadolivre",
        title: "Cor: Azul",
      },
      {
        externalProductId: "MLB123:2",
        id: "synced_child_2",
        linkedProduct: {
          id: "product_child_2",
        },
        metadata: {
          itemId: "MLB123",
          variationId: "2",
        },
        provider: "mercadolivre",
        title: "Cor: Vermelho",
      },
    ] as never);
    db.delete = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });
    financeService.materializeOrganizationMetrics = vi
      .fn()
      .mockResolvedValue(undefined);

    const deleteProductsBulk = (
      service as ProductsService & {
        deleteProductsBulk: (
          context: {
            organizationId: string;
            selectedCompanyId?: string | null;
            userId: string;
          },
          ids: string[],
        ) => Promise<{ ids: string[]; totalDeleted: number }>;
      }
    ).deleteProductsBulk;

    await expect(
      Promise.resolve().then(() =>
        deleteProductsBulk.call(
          service,
          {
            organizationId: "org_1",
            selectedCompanyId: "company_1",
            userId: "user_1",
          },
          ["product_parent"],
        ),
      ),
    ).resolves.toEqual({
      ids: ["product_parent", "product_child_1", "product_child_2"],
      totalDeleted: 3,
    });
    expect(db.delete).toHaveBeenCalledTimes(3);
    expect(db.transaction).toHaveBeenCalledTimes(1);
  });

  it("deduplicates mixed bulk selections across parent and child ids", async () => {
    const { db, financeService, service } = createService();

    db.query.products.findMany.mockResolvedValue([
      buildCatalogProductRow({
        id: "product_parent",
        name: "Produto Pai",
        sku: "PARENT-1",
      }),
      buildCatalogProductRow({
        id: "product_child_1",
        name: "Variação Azul",
        sku: "CHILD-1",
      }),
      buildCatalogProductRow({
        id: "product_child_2",
        name: "Variação Vermelha",
        sku: "CHILD-2",
      }),
    ]);
    vi.mocked(listSyncedProductsReadModel).mockResolvedValueOnce([
      {
        externalProductId: "MLB123",
        id: "synced_parent",
        linkedProduct: {
          id: "product_parent",
        },
        metadata: {
          itemId: "MLB123",
        },
        provider: "mercadolivre",
        title: "Produto Pai",
      },
      {
        externalProductId: "MLB123:1",
        id: "synced_child_1",
        linkedProduct: {
          id: "product_child_1",
        },
        metadata: {
          itemId: "MLB123",
          variationId: "1",
        },
        provider: "mercadolivre",
        title: "Cor: Azul",
      },
      {
        externalProductId: "MLB123:2",
        id: "synced_child_2",
        linkedProduct: {
          id: "product_child_2",
        },
        metadata: {
          itemId: "MLB123",
          variationId: "2",
        },
        provider: "mercadolivre",
        title: "Cor: Vermelho",
      },
    ] as never);
    db.delete = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });
    financeService.materializeOrganizationMetrics = vi
      .fn()
      .mockResolvedValue(undefined);

    const deleteProductsBulk = (
      service as ProductsService & {
        deleteProductsBulk: (
          context: {
            organizationId: string;
            selectedCompanyId?: string | null;
            userId: string;
          },
          ids: string[],
        ) => Promise<{ ids: string[]; totalDeleted: number }>;
      }
    ).deleteProductsBulk;

    await expect(
      Promise.resolve().then(() =>
        deleteProductsBulk.call(
          service,
          {
            organizationId: "org_1",
            selectedCompanyId: "company_1",
            userId: "user_1",
          },
          ["product_parent", "product_child_1", "product_parent"],
        ),
      ),
    ).resolves.toEqual({
      ids: ["product_parent", "product_child_1", "product_child_2"],
      totalDeleted: 3,
    });
    expect(db.delete).toHaveBeenCalledTimes(3);
    expect(db.transaction).toHaveBeenCalledTimes(1);
  });

  it("rejects empty bulk selections", async () => {
    const { service } = createService();

    const deleteProductsBulk = (
      service as ProductsService & {
        deleteProductsBulk: (
          context: {
            organizationId: string;
            selectedCompanyId?: string | null;
            userId: string;
          },
          ids: string[],
        ) => Promise<{ ids: string[]; totalDeleted: number }>;
      }
    ).deleteProductsBulk;

    await expect(
      Promise.resolve().then(() =>
        deleteProductsBulk.call(
          service,
          {
            organizationId: "org_1",
            selectedCompanyId: "company_1",
            userId: "user_1",
          },
          ["", "   "],
        ),
      ),
    ).rejects.toThrow("Selecione ao menos um produto.");
  });

  it("rejects bulk selections with ids outside the catalog", async () => {
    const { db, service } = createService();

    db.query.products.findMany.mockResolvedValue([
      buildCatalogProductRow({
        id: "product_parent",
        name: "Produto Pai",
        sku: "PARENT-1",
      }),
    ]);
    db.delete = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });

    const deleteProductsBulk = (
      service as ProductsService & {
        deleteProductsBulk: (
          context: {
            organizationId: string;
            selectedCompanyId?: string | null;
            userId: string;
          },
          ids: string[],
        ) => Promise<{ ids: string[]; totalDeleted: number }>;
      }
    ).deleteProductsBulk;

    await expect(
      Promise.resolve().then(() =>
        deleteProductsBulk.call(
          service,
          {
            organizationId: "org_1",
            selectedCompanyId: "company_1",
            userId: "user_1",
          },
          ["missing_product"],
        ),
      ),
    ).rejects.toThrow("A selecao contem produto invalido ou sintetico.");
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
    const { listSyncedProductsReadModel } =
      await import("@/modules/integrations/synced-products.read-model");

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
        marketplaceCommissionUnit: "10.00",
        fixedFeeUnit: "0.00",
        packagingCost: "2.00",
        productId: "11111111-1111-4111-8111-111111111111",
        productName: "Notebook",
        referenceMonth: "2026-05-01",
        returnsQuantity: 1,
        salePrice: "100.00",
        salesQuantity: 3,
        shippingFee: "6.00",
        shippingUnit: "6.00",
        shippingOrFixedFeeSource: "shipping",
        shippingOrFixedFeeUnit: "6.00",
        sku: "NB-1",
        unitCost: "25.00",
      },
    ]);
  });

  it("falls back to fixed fee unit when synced shipping is unavailable", async () => {
    const { db, financeService, service, syncService } = createService();
    const { listSyncedProductsReadModel } =
      await import("@/modules/integrations/synced-products.read-model");

    db.query.companies.findMany.mockResolvedValue([
      {
        id: "company_1",
        isActive: true,
        taxRateDefault: "0.090000",
      },
    ]);
    db.query.products.findMany.mockResolvedValue([
      {
        createdAt: new Date("2026-05-01T10:00:00.000Z"),
        financeDefaults: null,
        id: "product_1",
        images: [],
        isActive: true,
        name: "Notebook",
        organizationId: "org_1",
        sellingPrice: "100.00",
        sku: "NB-1",
        updatedAt: new Date("2026-05-01T10:00:00.000Z"),
      },
    ]);
    db.query.productCosts.findMany.mockResolvedValue([]);
    db.query.adCosts.findMany.mockResolvedValue([]);
    db.query.manualExpenses.findMany.mockResolvedValue([]);
    db.query.productMonthlyPerformance.findMany.mockResolvedValue([
      {
        advertisingCost: "10.00",
        channel: "mercadolivre",
        commissionRate: "0.100000",
        companyId: "company_1",
        createdAt: new Date("2026-05-01T10:00:00.000Z"),
        id: "perf_1",
        notes: null,
        organizationId: "org_1",
        packagingCost: "2.00",
        productId: "product_1",
        productName: "Notebook",
        referenceMonth: "2026-05-01",
        returnsQuantity: 0,
        salePrice: "100.00",
        salesQuantity: 2,
        shippingFee: "0.00",
        sku: "NB-1",
        unitCost: "25.00",
        updatedAt: new Date("2026-05-01T10:00:00.000Z"),
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
    vi.mocked(listSyncedProductsReadModel).mockImplementation(async (input) =>
      input.providerSlug === "mercadolivre"
        ? [
            {
              externalProductId: "MLB-1",
              fixedFee: "8.50",
              grossRevenue: "200.00",
              id: "external_1",
              lastOrderedAt: "2026-05-01T11:00:00.000Z",
              latestUnitPrice: "100.00",
              linkedProduct: {
                id: "product_1",
                isActive: true,
                name: "Notebook",
                sku: "NB-1",
              },
              marketplaceCommission: "20.00",
              netMarketplaceTake: "28.50",
              orderCount: 1,
              provider: "mercadolivre",
              reviewStatus: "linked_to_existing_product",
              shippingCost: "0.00",
              sku: "NB-1",
              suggestedMatches: [],
              title: "Notebook",
              unitsSold: 2,
            },
          ]
        : [],
    );

    const snapshot = await service.getAnalyticsSnapshot({
      organizationId: "org_1",
      userId: "user_1",
    });

    expect(snapshot.monthlyPerformanceRows).toEqual([
      expect.objectContaining({
        fixedFeeUnit: "4.25",
        marketplaceCommissionUnit: "10.00",
        shippingOrFixedFeeSource: "fixed_fee",
        shippingOrFixedFeeUnit: "4.25",
        shippingUnit: "0.00",
      }),
    ]);
    expect(snapshot.performanceRows).toEqual([
      expect.objectContaining({
        fixedFeeUnit: "4.25",
        marketplaceCommissionUnit: "10.00",
        shippingOrFixedFeeSource: "fixed_fee",
        shippingOrFixedFeeUnit: "4.25",
      }),
    ]);
  });

  it("prefers catalog cost and packaging for standalone performance rows", async () => {
    const { db, financeService, service, syncService } = createService();
    const { listSyncedProductsReadModel } =
      await import("@/modules/integrations/synced-products.read-model");

    const product = {
      createdAt: new Date("2026-05-01T10:00:00.000Z"),
      financeDefaults: {
        advertisingCost: "0.00",
        createdAt: new Date("2026-05-01T10:00:00.000Z"),
        id: "defaults_1",
        packagingCost: "4.50",
        productId: "product_1",
        updatedAt: new Date("2026-05-01T10:00:00.000Z"),
      },
      id: "product_1",
      images: [],
      isActive: true,
      name: "Notebook",
      organizationId: "org_1",
      sellingPrice: "100.00",
      sku: "NB-1",
      updatedAt: new Date("2026-05-01T10:00:00.000Z"),
    };

    db.query.companies.findMany.mockResolvedValue([
      {
        id: "company_1",
        isActive: true,
        taxRateDefault: "0.090000",
      },
    ]);
    db.query.products.findMany.mockResolvedValue([product]);
    db.query.productCosts.findMany.mockResolvedValue([
      {
        amount: "33.00",
        costType: "base",
        createdAt: new Date("2026-05-01T10:00:00.000Z"),
        currency: "BRL",
        effectiveFrom: "2026-05-01",
        id: "cost_1",
        notes: null,
        organizationId: "org_1",
        productId: "product_1",
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
        companyId: "company_1",
        createdAt: new Date("2026-05-01T10:00:00.000Z"),
        id: "perf_1",
        notes: null,
        organizationId: "org_1",
        packagingCost: "0.00",
        productId: "product_1",
        productName: "Notebook",
        referenceMonth: "2026-05-01",
        returnsQuantity: 1,
        salePrice: "100.00",
        salesQuantity: 3,
        shippingFee: "6.00",
        sku: "NB-1",
        unitCost: "0.00",
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
          id: "product_1",
          isActive: true,
          name: "Notebook",
          sellingPrice: "100.00",
          sku: "NB-1",
          unitCost: "33.00",
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

    const snapshot = await service.getAnalyticsSnapshot({
      organizationId: "org_1",
      userId: "user_1",
    });

    expect(snapshot.monthlyPerformanceRows).toEqual([
      expect.objectContaining({
        packagingCost: "4.50",
        unitCost: "33.00",
      }),
    ]);
    expect(snapshot.performanceRows).toEqual([
      expect.objectContaining({
        packagingCost: "4.50",
        unitCost: "33.00",
      }),
    ]);
    expect(snapshot.productRows).toEqual([
      expect.objectContaining({
        packagingCost: "9.00",
        productCost: "66.00",
      }),
    ]);
  });

  it("prefers child and parent catalog cost and packaging in grouped performance rows", async () => {
    const { db, financeService, service, syncService } = createService();

    db.query.companies.findMany.mockResolvedValue([
      {
        id: "company_1",
        isActive: true,
        taxRateDefault: "0.120000",
      },
    ]);
    db.query.products.findMany.mockResolvedValue([
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
          packagingCost: "2.75",
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
    ]);
    db.query.productCosts.findMany.mockResolvedValue([
      {
        amount: "40.00",
        costType: "base",
        createdAt: new Date("2026-06-17T10:00:00.000Z"),
        currency: "BRL",
        effectiveFrom: "2026-06-01",
        id: "cost_parent",
        notes: null,
        organizationId: "org_1",
        productId: "product_parent",
        updatedAt: new Date("2026-06-17T10:00:00.000Z"),
      },
      {
        amount: "21.50",
        costType: "base",
        createdAt: new Date("2026-06-17T10:00:00.000Z"),
        currency: "BRL",
        effectiveFrom: "2026-06-01",
        id: "cost_child_1",
        notes: null,
        organizationId: "org_1",
        productId: "product_child_1",
        updatedAt: new Date("2026-06-17T10:00:00.000Z"),
      },
    ]);
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
        productId: "product_parent",
        productName: "Produto Pai",
        referenceMonth: "2026-06-01",
        returnsQuantity: 0,
        salePrice: "100.00",
        salesQuantity: 1,
        shippingFee: "5.00",
        sku: "ML-001-PAI",
        unitCost: "15.00",
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
        packagingCost: "1.00",
        productId: "product_child_1",
        productName: "Produto Azul",
        referenceMonth: "2026-06-01",
        returnsQuantity: 0,
        salePrice: "110.00",
        salesQuantity: 2,
        shippingFee: "6.00",
        sku: "ML-001-AZ",
        unitCost: "11.00",
        updatedAt: new Date("2026-06-17T10:00:00.000Z"),
        userId: "user_1",
      },
    ]);
    financeService.buildFinanceSnapshot.mockResolvedValue({
      adCosts: [],
      manualExpenses: [],
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

    const { listSyncedProductsReadModel } =
      await import("@/modules/integrations/synced-products.read-model");
    vi.mocked(listSyncedProductsReadModel).mockImplementation(async () => [
      {
        externalProductId: "MLB123",
        fixedFee: "3.00",
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
        marketplaceCommission: "12.00",
        netMarketplaceTake: "0.00",
        orderCount: 0,
        provider: "mercadolivre",
        reviewStatus: "linked_to_existing_product",
        shippingCost: "0.00",
        sku: "ML-001-PAI",
        suggestedMatches: [],
        title: "Produto Pai",
        unitsSold: 1,
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
        marketplaceCommission: "12.00",
        netMarketplaceTake: "0.00",
        orderCount: 0,
        provider: "mercadolivre",
        reviewStatus: "linked_to_existing_product",
        shippingCost: "18.00",
        sku: "ML-001-AZ",
        suggestedMatches: [],
        title: "Cor: Azul",
        unitsSold: 2,
      },
    ]);

    const snapshot = await service.getAnalyticsSnapshot({
      organizationId: "org_1",
      userId: "user_1",
    });

    expect(snapshot.monthlyPerformanceRows).toEqual([
      expect.objectContaining({
        id: "perf_parent",
        packagingCost: "4.50",
        unitCost: "40.00",
      }),
      expect.objectContaining({
        id: "perf_child_1",
        packagingCost: "2.75",
        unitCost: "21.50",
      }),
    ]);
    expect(snapshot.performanceRows).toEqual([
      expect.objectContaining({
        fixedFeeUnit: "1.00",
        id: "perf_parent",
        marketplaceCommissionUnit: "8.00",
        packagingCost: "4.50",
        shippingOrFixedFeeSource: "shipping",
        shippingOrFixedFeeUnit: "5.67",
        shippingUnit: "5.67",
        unitCost: "40.00",
      }),
      expect.objectContaining({
        fixedFeeUnit: "0.00",
        id: "perf_child_1",
        marketplaceCommissionUnit: "6.00",
        packagingCost: "2.75",
        shippingOrFixedFeeSource: "shipping",
        shippingOrFixedFeeUnit: "6.00",
        shippingUnit: "6.00",
        unitCost: "21.50",
      }),
    ]);
  });

  it("keeps monthly performance cost and packaging when there is no catalog match", async () => {
    const { db, financeService, service, syncService } = createService();
    const { listSyncedProductsReadModel } =
      await import("@/modules/integrations/synced-products.read-model");

    db.query.companies.findMany.mockResolvedValue([
      {
        id: "company_1",
        isActive: true,
        taxRateDefault: "0.090000",
      },
    ]);
    db.query.products.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    db.query.productCosts.findMany.mockResolvedValue([]);
    db.query.adCosts.findMany.mockResolvedValue([]);
    db.query.manualExpenses.findMany.mockResolvedValue([]);
    db.query.productMonthlyPerformance.findMany.mockResolvedValue([
      {
        advertisingCost: "10.00",
        channel: "mercadolivre",
        commissionRate: "0.100000",
        companyId: "company_1",
        createdAt: new Date("2026-05-01T10:00:00.000Z"),
        id: "perf_1",
        notes: null,
        organizationId: "org_1",
        packagingCost: "2.25",
        productId: null,
        productName: "Sem Match",
        referenceMonth: "2026-05-01",
        returnsQuantity: 0,
        salePrice: "100.00",
        salesQuantity: 1,
        shippingFee: "6.00",
        sku: "NO-MATCH",
        unitCost: "19.90",
        updatedAt: new Date("2026-05-01T10:00:00.000Z"),
        userId: "user_1",
      },
    ]);
    financeService.buildFinanceSnapshot.mockResolvedValue({
      adCosts: [],
      manualExpenses: [],
      orders: [],
      products: [],
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

    const snapshot = await service.getAnalyticsSnapshot({
      organizationId: "org_1",
      userId: "user_1",
    });

    expect(snapshot.monthlyPerformanceRows).toEqual([
      expect.objectContaining({
        packagingCost: "2.25",
        unitCost: "19.90",
      }),
    ]);
    expect(snapshot.performanceRows).toEqual([
      expect.objectContaining({
        packagingCost: "2.25",
        unitCost: "19.90",
      }),
    ]);
  });

  it("matches MELI imported fallback sku to synced fee composition when seller_sku is unavailable", async () => {
    const { db, financeService, service, syncService } = createService();
    const { listSyncedProductsReadModel } =
      await import("@/modules/integrations/synced-products.read-model");

    db.query.companies.findMany.mockResolvedValue([
      {
        id: "company_1",
        isActive: true,
        taxRateDefault: "0.000000",
      },
    ]);
    db.query.products.findMany.mockResolvedValue([]);
    db.query.productCosts.findMany.mockResolvedValue([]);
    db.query.adCosts.findMany.mockResolvedValue([]);
    db.query.manualExpenses.findMany.mockResolvedValue([]);
    db.query.productMonthlyPerformance.findMany.mockResolvedValue([
      {
        advertisingCost: "0.00",
        channel: "mercadolivre",
        commissionRate: "0.130000",
        companyId: "company_1",
        createdAt: new Date("2026-05-01T10:00:00.000Z"),
        id: "perf_1",
        notes: null,
        organizationId: "org_1",
        packagingCost: "0.00",
        productId: null,
        productName: "Cor: Transparente",
        referenceMonth: "2026-05-01",
        returnsQuantity: 0,
        salePrice: "29.90",
        salesQuantity: 1,
        shippingFee: "0.00",
        sku: "ML-MLB4797573777-19683084422",
        unitCost: "0.00",
        updatedAt: new Date("2026-05-01T10:00:00.000Z"),
        userId: "user_1",
      },
    ]);
    financeService.buildFinanceSnapshot.mockResolvedValue({
      adCosts: [],
      manualExpenses: [],
      orders: [],
      products: [],
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
    vi.mocked(listSyncedProductsReadModel).mockResolvedValue([
      {
        externalProductId: "MLB4797573777:19683084422",
        fixedFee: "6.65",
        grossRevenue: "29.90",
        id: "external_1",
        lastOrderedAt: "2026-05-01T11:00:00.000Z",
        latestUnitPrice: "29.90",
        linkedProduct: null,
        marketplaceCommission: "3.89",
        metadata: {
          itemId: "MLB4797573777",
          source: "mercadolivre-order-item",
          variationId: "19683084422",
        },
        netMarketplaceTake: "10.54",
        orderCount: 1,
        provider: "mercadolivre",
        reviewStatus: "unreviewed",
        sku: null,
        shippingCost: "0.00",
        suggestedMatches: [],
        title: "Cor: Transparente",
        unitsSold: 1,
      },
    ]);

    const snapshot = await service.getAnalyticsSnapshot({
      organizationId: "org_1",
      userId: "user_1",
    });

    expect(snapshot.monthlyPerformanceRows).toEqual([
      expect.objectContaining({
        fixedFeeUnit: "6.65",
        marketplaceCommissionUnit: "3.89",
        shippingOrFixedFeeSource: "fixed_fee",
        shippingOrFixedFeeUnit: "6.65",
        shippingUnit: "0.00",
      }),
    ]);
    expect(snapshot.performanceRows).toEqual([
      expect.objectContaining({
        fixedFeeUnit: "6.65",
        marketplaceCommissionUnit: "3.89",
        shippingOrFixedFeeSource: "fixed_fee",
        shippingOrFixedFeeUnit: "6.65",
      }),
    ]);
  });

  it("prefers linked internal sku over raw monthly performance sku in performance rows", async () => {
    const { db, financeService, service, syncService } = createService();

    vi.mocked(listSyncedProductsReadModel).mockResolvedValue([]);

    db.query.companies.findMany.mockResolvedValue([
      {
        id: "company_1",
        isActive: true,
        taxRateDefault: "0.000000",
      },
    ]);
    db.query.products.findMany
      .mockResolvedValueOnce([
        buildCatalogProductRow({
          companyId: "company_1",
          id: "product_1",
          name: "Calcado Preto",
          sku: "CALCAPRETA39",
        }),
      ])
      .mockResolvedValueOnce([
        {
          companyId: "company_1",
          createdAt: new Date("2026-05-01T10:00:00.000Z"),
          id: "product_1",
          images: [],
          isActive: true,
          name: "Calcado Preto",
          organizationId: "org_1",
          sellingPrice: "120.00",
          sku: "CALCAPRETA39",
          updatedAt: new Date("2026-05-01T10:00:00.000Z"),
        },
      ]);
    db.query.productCosts.findMany.mockResolvedValue([]);
    db.query.adCosts.findMany.mockResolvedValue([]);
    db.query.manualExpenses.findMany.mockResolvedValue([]);
    db.query.productMonthlyPerformance.findMany.mockResolvedValue([
      {
        advertisingCost: "0.00",
        channel: "mercadolivre",
        commissionRate: "0.100000",
        companyId: "company_1",
        createdAt: new Date("2026-05-01T10:00:00.000Z"),
        id: "perf_1",
        notes: null,
        organizationId: "org_1",
        packagingCost: "0.00",
        productId: "product_1",
        productName: "Calcado Preto",
        referenceMonth: "2026-05-01",
        returnsQuantity: 0,
        salePrice: "120.00",
        salesQuantity: 1,
        shippingFee: "0.00",
        sku: "ML-9238238958323",
        unitCost: "0.00",
        updatedAt: new Date("2026-05-01T10:00:00.000Z"),
        userId: "user_1",
      },
    ]);
    db.query.externalOrders.findMany.mockResolvedValue([]);
    financeService.buildFinanceSnapshot.mockResolvedValue({
      adCosts: [],
      manualExpenses: [],
      orders: [],
      products: [],
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

    const response = await service.listPerformanceRows(
      {
        organizationId: "org_1",
        userId: "user_1",
      },
      {
        page: 1,
        pageSize: 10,
        referenceMonth: "2026-05-01",
      },
    );

    expect(response.items).toEqual([
      expect.objectContaining({
        productId: "product_1",
        sku: "CALCAPRETA39",
      }),
    ]);
  });

  it("calculates contribution margin using the resolved fixed fee and global tax rate", async () => {
    const { db, financeService, service, syncService } = createService();
    const { listSyncedProductsReadModel } =
      await import("@/modules/integrations/synced-products.read-model");

    db.query.companies.findMany.mockResolvedValue([
      {
        id: "company_1",
        isActive: true,
        taxRateDefault: "0.100000",
      },
    ]);
    db.query.products.findMany.mockResolvedValue([]);
    db.query.productCosts.findMany.mockResolvedValue([]);
    db.query.adCosts.findMany.mockResolvedValue([]);
    db.query.manualExpenses.findMany.mockResolvedValue([]);
    db.query.productMonthlyPerformance.findMany.mockResolvedValue([
      {
        advertisingCost: "0.00",
        channel: "mercadolivre",
        commissionRate: "0.135000",
        companyId: "company_1",
        createdAt: new Date("2026-05-01T10:00:00.000Z"),
        id: "perf_1",
        notes: null,
        organizationId: "org_1",
        packagingCost: "1.50",
        productId: null,
        productName: "Produto Exemplo",
        referenceMonth: "2026-05-01",
        returnsQuantity: 0,
        salePrice: "200.00",
        salesQuantity: 1,
        shippingFee: "0.00",
        sku: "SKU-1",
        unitCost: "50.00",
        updatedAt: new Date("2026-05-01T10:00:00.000Z"),
        userId: "user_1",
      },
    ]);
    financeService.buildFinanceSnapshot.mockResolvedValue({
      adCosts: [],
      manualExpenses: [],
      orders: [],
      products: [],
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
    vi.mocked(listSyncedProductsReadModel).mockResolvedValue([
      {
        externalProductId: "MLB-1",
        fixedFee: "24.65",
        grossRevenue: "200.00",
        id: "external_1",
        lastOrderedAt: "2026-05-01T11:00:00.000Z",
        latestUnitPrice: "200.00",
        linkedProduct: null,
        marketplaceCommission: "27.00",
        metadata: {
          itemId: "MLB-1",
          source: "mercadolivre-order-item",
          variationId: "VAR-1",
        },
        netMarketplaceTake: "51.65",
        orderCount: 1,
        provider: "mercadolivre",
        reviewStatus: "unreviewed",
        sku: "SKU-1",
        shippingCost: "0.00",
        suggestedMatches: [],
        title: "Produto Exemplo",
        unitsSold: 1,
      },
    ]);

    const response = await service.listPerformanceRows(
      {
        organizationId: "org_1",
        userId: "user_1",
      },
      {
        page: 1,
        pageSize: 10,
        referenceMonth: "2026-05-01",
      },
    );

    expect(response.items).toEqual([
      expect.objectContaining({
        contributionMarginRatio: expect.any(Number),
        marketplaceCommissionUnit: 27,
        minimumRoas: expect.any(Number),
        shippingOrFixedFeeSource: "fixed_fee",
        shippingOrFixedFeeUnit: 24.65,
        totalProfit: 76.85,
      }),
    ]);
    expect(response.items[0].contributionMarginRatio).toBeCloseTo(38.425, 6);
    expect(response.items[0].minimumRoas).toBeCloseTo(2.602472, 6);
  });

  it("deduplicates repeated monthly performance rows for the same product and channel", async () => {
    const { db, financeService, service, syncService } = createService();

    vi.mocked(listSyncedProductsReadModel).mockResolvedValue([]);

    db.query.companies.findMany.mockResolvedValue([
      {
        id: "company_1",
        isActive: true,
        taxRateDefault: "0.100000",
      },
    ]);
    db.query.products.findMany
      .mockResolvedValueOnce([
        buildCatalogProductRow({
          companyId: "company_1",
          financeDefaults: {
            advertisingCost: "0.00",
            createdAt: new Date("2026-05-01T10:00:00.000Z"),
            id: "defaults_1",
            packagingCost: "2.00",
            productId: "product_1",
            updatedAt: new Date("2026-05-01T10:00:00.000Z"),
          },
          id: "product_1",
          name: "Produto Exemplo",
          sku: "SKU-1",
        }),
      ])
      .mockResolvedValueOnce([
        {
          companyId: "company_1",
          createdAt: new Date("2026-05-01T10:00:00.000Z"),
          id: "product_1",
          images: [],
          isActive: true,
          name: "Produto Exemplo",
          organizationId: "org_1",
          sellingPrice: "120.00",
          sku: "SKU-1",
          updatedAt: new Date("2026-05-01T10:00:00.000Z"),
        },
      ]);
    db.query.productCosts.findMany.mockResolvedValue([
      {
        amount: "30.00",
        companyId: "company_1",
        costType: "base",
        createdAt: new Date("2026-05-01T10:00:00.000Z"),
        currency: "BRL",
        effectiveFrom: null,
        id: "cost_1",
        notes: null,
        organizationId: "org_1",
        productId: "product_1",
        updatedAt: new Date("2026-05-01T10:00:00.000Z"),
      },
    ]);
    db.query.adCosts.findMany.mockResolvedValue([]);
    db.query.manualExpenses.findMany.mockResolvedValue([]);
    db.query.productMonthlyPerformance.findMany.mockResolvedValue([
      {
        advertisingCost: "5.00",
        channel: "mercadolivre",
        commissionRate: "0.100000",
        companyId: "company_1",
        createdAt: new Date("2026-05-01T09:00:00.000Z"),
        id: "perf_older",
        notes: null,
        organizationId: "org_1",
        packagingCost: "2.00",
        productId: "product_1",
        productName: "Produto Exemplo",
        referenceMonth: "2026-05-01",
        returnsQuantity: 0,
        salePrice: "100.00",
        salesQuantity: 1,
        shippingFee: "10.00",
        sku: "SKU-1",
        unitCost: "30.00",
        updatedAt: new Date("2026-05-01T09:00:00.000Z"),
        userId: "user_1",
      },
      {
        advertisingCost: "7.00",
        channel: "mercadolivre",
        commissionRate: "0.200000",
        companyId: "company_1",
        createdAt: new Date("2026-05-01T11:00:00.000Z"),
        id: "perf_newer",
        notes: null,
        organizationId: "org_1",
        packagingCost: "2.00",
        productId: "product_1",
        productName: "Produto Exemplo",
        referenceMonth: "2026-05-01",
        returnsQuantity: 1,
        salePrice: "200.00",
        salesQuantity: 2,
        shippingFee: "20.00",
        sku: "SKU-1",
        unitCost: "30.00",
        updatedAt: new Date("2026-05-01T11:00:00.000Z"),
        userId: "user_1",
      },
      {
        advertisingCost: "3.00",
        channel: "shopee",
        commissionRate: "0.150000",
        companyId: "company_1",
        createdAt: new Date("2026-05-01T12:00:00.000Z"),
        id: "perf_other_channel",
        notes: null,
        organizationId: "org_1",
        packagingCost: "2.00",
        productId: "product_1",
        productName: "Produto Exemplo",
        referenceMonth: "2026-05-01",
        returnsQuantity: 0,
        salePrice: "90.00",
        salesQuantity: 1,
        shippingFee: "8.00",
        sku: "SKU-1",
        unitCost: "30.00",
        updatedAt: new Date("2026-05-01T12:00:00.000Z"),
        userId: "user_1",
      },
    ]);
    db.query.externalOrders.findMany.mockResolvedValue([
      {
        id: "order_1",
        items: [{ id: "raw_item_1" }],
        metadata: { paid: true },
        orderedAt: new Date("2026-05-15T12:00:00.000Z"),
        status: "paid",
      },
      {
        id: "order_2",
        items: [{ id: "raw_item_2" }],
        metadata: { paid: true },
        orderedAt: new Date("2026-05-16T12:00:00.000Z"),
        status: "paid",
      },
    ]);
    financeService.buildFinanceSnapshot.mockResolvedValue({
      adCosts: [],
      manualExpenses: [],
      orders: [
        {
          discountAmount: "0.00",
          fees: [],
          id: "order_1",
          items: [
            {
              id: "item_1",
              productId: "product_1",
              quantity: 2,
              sku: "SKU-1",
              totalPrice: "400.00",
              unitPrice: "200.00",
            },
          ],
          orderedAt: "2026-05-15T12:00:00.000Z",
          provider: "mercadolivre",
          refundAmount: "0.00",
          totalAmount: "400.00",
        },
        {
          discountAmount: "0.00",
          fees: [],
          id: "order_2",
          items: [
            {
              id: "item_2",
              productId: "product_1",
              quantity: 1,
              sku: "SKU-1",
              totalPrice: "90.00",
              unitPrice: "90.00",
            },
          ],
          orderedAt: "2026-05-16T12:00:00.000Z",
          provider: "shopee",
          refundAmount: "0.00",
          totalAmount: "90.00",
        },
      ],
      products: [
        {
          id: "product_1",
          isActive: true,
          name: "Produto Exemplo",
          sellingPrice: "120.00",
          sku: "SKU-1",
          unitCost: "30.00",
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

    const response = await service.listPerformanceRows(
      {
        organizationId: "org_1",
        userId: "user_1",
      },
      {
        page: 1,
        pageSize: 10,
        referenceMonth: "2026-05-01",
      },
    );

    expect(response.totalItems).toBe(2);
    expect(response.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          channelLabel: "mercadolivre",
          performanceId: "perf_newer",
          returns: 1,
          sales: 2,
          shipping: 15,
          sellingPrice: 150,
        }),
        expect.objectContaining({
          channelLabel: "shopee",
          performanceId: "perf_other_channel",
          sales: 1,
        }),
      ]),
    );
    expect(
      response.items.find((item) => item.channelLabel === "mercadolivre")?.commissionPct,
    ).toBeCloseTo(16.666667, 5);
    expect(
      response.items.find((item) => item.channelLabel === "mercadolivre")?.advertisingCost,
    ).toBe(12);
  });

  it("counts one sale per order even when order item quantity is greater than one", async () => {
    const { db, financeService, service, syncService } = createService();

    vi.mocked(listSyncedProductsReadModel).mockResolvedValue([]);

    db.query.companies.findMany.mockResolvedValue([
      {
        id: "company_1",
        isActive: true,
        taxRateDefault: "0.100000",
      },
    ]);
    db.query.products.findMany
      .mockResolvedValueOnce([
        buildCatalogProductRow({
          companyId: "company_1",
          financeDefaults: {
            advertisingCost: "0.00",
            createdAt: new Date("2026-05-01T10:00:00.000Z"),
            id: "defaults_1",
            packagingCost: "2.00",
            productId: "product_1",
            updatedAt: new Date("2026-05-01T10:00:00.000Z"),
          },
          id: "product_1",
          name: "Produto Exemplo",
          sku: "SKU-1",
        }),
      ])
      .mockResolvedValueOnce([
        {
          companyId: "company_1",
          createdAt: new Date("2026-05-01T10:00:00.000Z"),
          id: "product_1",
          images: [],
          isActive: true,
          name: "Produto Exemplo",
          organizationId: "org_1",
          sellingPrice: "120.00",
          sku: "SKU-1",
          updatedAt: new Date("2026-05-01T10:00:00.000Z"),
        },
      ]);
    db.query.productCosts.findMany.mockResolvedValue([
      {
        amount: "30.00",
        companyId: "company_1",
        costType: "base",
        createdAt: new Date("2026-05-01T10:00:00.000Z"),
        currency: "BRL",
        effectiveFrom: null,
        id: "cost_1",
        notes: null,
        organizationId: "org_1",
        productId: "product_1",
        updatedAt: new Date("2026-05-01T10:00:00.000Z"),
      },
    ]);
    db.query.adCosts.findMany.mockResolvedValue([]);
    db.query.manualExpenses.findMany.mockResolvedValue([]);
    db.query.productMonthlyPerformance.findMany.mockResolvedValue([
      {
        advertisingCost: "0.00",
        channel: "mercadolivre",
        commissionRate: "0.100000",
        companyId: "company_1",
        createdAt: new Date("2026-05-01T09:00:00.000Z"),
        id: "perf_1",
        notes: null,
        organizationId: "org_1",
        packagingCost: "2.00",
        productId: "product_1",
        productName: "Produto Exemplo",
        referenceMonth: "2026-05-01",
        returnsQuantity: 0,
        salePrice: "100.00",
        salesQuantity: 2,
        shippingFee: "10.00",
        sku: "SKU-1",
        unitCost: "30.00",
        updatedAt: new Date("2026-05-01T09:00:00.000Z"),
        userId: "user_1",
      },
    ]);
    db.query.externalOrders.findMany.mockResolvedValue([
      {
        id: "order_1",
        items: [{ id: "raw_item_1" }],
        metadata: { paid: true },
        orderedAt: new Date("2026-05-15T12:00:00.000Z"),
        status: "paid",
      },
    ]);
    financeService.buildFinanceSnapshot.mockResolvedValue({
      adCosts: [],
      manualExpenses: [],
      orders: [
        {
          discountAmount: "0.00",
          fees: [],
          id: "order_1",
          items: [
            {
              id: "item_1",
              productId: "product_1",
              quantity: 2,
              sku: "SKU-1",
              totalPrice: "200.00",
              unitPrice: "100.00",
            },
          ],
          orderedAt: "2026-05-15T12:00:00.000Z",
          provider: "mercadolivre",
          refundAmount: "0.00",
          totalAmount: "200.00",
        },
      ],
      products: [
        {
          id: "product_1",
          isActive: true,
          name: "Produto Exemplo",
          sellingPrice: "120.00",
          sku: "SKU-1",
          unitCost: "30.00",
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

    const response = await service.listPerformanceRows(
      {
        organizationId: "org_1",
        userId: "user_1",
      },
      {
        page: 1,
        pageSize: 10,
        referenceMonth: "2026-05-01",
      },
    );

    expect(response.items).toEqual([
      expect.objectContaining({
        channelLabel: "mercadolivre",
        netLiquidSales: 2,
        returns: 0,
        sales: 2,
      }),
    ]);
  });

  it("keeps order count when monthly row has partial returns", async () => {
    const { db, financeService, service, syncService } = createService();

    vi.mocked(listSyncedProductsReadModel).mockResolvedValue([]);

    db.query.companies.findMany.mockResolvedValue([
      {
        id: "company_1",
        isActive: true,
        taxRateDefault: "0.100000",
      },
    ]);
    db.query.products.findMany
      .mockResolvedValueOnce([
        buildCatalogProductRow({
          companyId: "company_1",
          financeDefaults: {
            advertisingCost: "0.00",
            createdAt: new Date("2026-05-01T10:00:00.000Z"),
            id: "defaults_1",
            packagingCost: "2.00",
            productId: "product_1",
            updatedAt: new Date("2026-05-01T10:00:00.000Z"),
          },
          id: "product_1",
          name: "Produto Exemplo",
          sku: "SKU-1",
        }),
      ])
      .mockResolvedValueOnce([
        {
          companyId: "company_1",
          createdAt: new Date("2026-05-01T10:00:00.000Z"),
          id: "product_1",
          images: [],
          isActive: true,
          name: "Produto Exemplo",
          organizationId: "org_1",
          sellingPrice: "120.00",
          sku: "SKU-1",
          updatedAt: new Date("2026-05-01T10:00:00.000Z"),
        },
      ]);
    db.query.productCosts.findMany.mockResolvedValue([
      {
        amount: "30.00",
        companyId: "company_1",
        costType: "base",
        createdAt: new Date("2026-05-01T10:00:00.000Z"),
        currency: "BRL",
        effectiveFrom: null,
        id: "cost_1",
        notes: null,
        organizationId: "org_1",
        productId: "product_1",
        updatedAt: new Date("2026-05-01T10:00:00.000Z"),
      },
    ]);
    db.query.adCosts.findMany.mockResolvedValue([]);
    db.query.manualExpenses.findMany.mockResolvedValue([]);
    db.query.productMonthlyPerformance.findMany.mockResolvedValue([
      {
        advertisingCost: "0.00",
        channel: "mercadolivre",
        commissionRate: "0.100000",
        companyId: "company_1",
        createdAt: new Date("2026-05-01T09:00:00.000Z"),
        id: "perf_1",
        notes: null,
        organizationId: "org_1",
        packagingCost: "2.00",
        productId: "product_1",
        productName: "Produto Exemplo",
        referenceMonth: "2026-05-01",
        returnsQuantity: 1,
        salePrice: "100.00",
        salesQuantity: 2,
        shippingFee: "10.00",
        sku: "SKU-1",
        unitCost: "30.00",
        updatedAt: new Date("2026-05-01T09:00:00.000Z"),
        userId: "user_1",
      },
    ]);
    db.query.externalOrders.findMany.mockResolvedValue([
      {
        id: "order_1",
        items: [{ id: "raw_item_1" }],
        metadata: { paid: true },
        orderedAt: new Date("2026-05-15T12:00:00.000Z"),
        status: "paid",
      },
    ]);
    financeService.buildFinanceSnapshot.mockResolvedValue({
      adCosts: [],
      manualExpenses: [],
      orders: [
        {
          discountAmount: "0.00",
          fees: [],
          id: "order_1",
          items: [
            {
              id: "item_1",
              productId: "product_1",
              quantity: 2,
              sku: "SKU-1",
              totalPrice: "200.00",
              unitPrice: "100.00",
            },
          ],
          orderedAt: "2026-05-15T12:00:00.000Z",
          provider: "mercadolivre",
          refundAmount: "0.00",
          totalAmount: "200.00",
        },
      ],
      products: [
        {
          id: "product_1",
          isActive: true,
          name: "Produto Exemplo",
          sellingPrice: "120.00",
          sku: "SKU-1",
          unitCost: "30.00",
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

    const response = await service.listPerformanceRows(
      {
        organizationId: "org_1",
        userId: "user_1",
      },
      {
        page: 1,
        pageSize: 10,
        referenceMonth: "2026-05-01",
      },
    );

    expect(response.items).toEqual([
      expect.objectContaining({
        channelLabel: "mercadolivre",
        netLiquidSales: 1,
        returns: 1,
        sales: 2,
      }),
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
        message:
          "Connect this marketplace account before running the first sync.",
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
        message:
          "Connect this marketplace account before running the first sync.",
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
