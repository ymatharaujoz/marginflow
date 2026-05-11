import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FinanceInputsService } from "./finance-inputs.service";

function createService() {
  const db = {
    delete: vi.fn(),
    insert: vi.fn(),
    query: {
      companies: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      fixedCosts: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      productMonthlyPerformance: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    },
    update: vi.fn(),
  };

  return {
    db,
    service: new FinanceInputsService(db as never),
  };
}

const context = {
  organizationId: "org_123",
  userId: "user_123",
};

describe("FinanceInputsService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns public company records without tenant internals", async () => {
    const { db, service } = createService();
    db.query.companies.findMany.mockResolvedValue([
      {
        code: "MELI",
        createdAt: new Date("2026-05-09T10:00:00.000Z"),
        id: "company_1",
        isActive: true,
        name: "Mercado Livre",
        organizationId: "org_123",
        updatedAt: new Date("2026-05-09T10:00:00.000Z"),
        userId: "user_123",
      },
    ]);

    const result = await service.listCompanies(context);

    expect(result).toEqual([
      {
        code: "MELI",
        createdAt: "2026-05-09T10:00:00.000Z",
        id: "company_1",
        isActive: true,
        name: "Mercado Livre",
        updatedAt: "2026-05-09T10:00:00.000Z",
      },
    ]);
    expect(result[0]).not.toHaveProperty("organizationId");
    expect(result[0]).not.toHaveProperty("userId");
  });

  it("returns public monthly performance records without tenant internals", async () => {
    const { db, service } = createService();
    db.query.companies.findFirst.mockResolvedValue({
      id: "company_1",
      organizationId: "org_123",
      userId: "user_123",
    });
    db.query.productMonthlyPerformance.findMany.mockResolvedValue([
      {
        advertisingCost: "20.00",
        channel: "mercado_livre",
        companyId: "company_1",
        commissionRate: "0.14",
        createdAt: new Date("2026-05-09T10:00:00.000Z"),
        id: "perf_1",
        notes: null,
        organizationId: "org_123",
        packagingCost: "2.00",
        productName: "Produto",
        referenceMonth: "2026-05-01",
        returnsQuantity: 1,
        salePrice: "100.00",
        salesQuantity: 10,
        shippingFee: "5.00",
        sku: "SKU-1",
        taxRate: "0.04",
        unitCost: "30.00",
        updatedAt: new Date("2026-05-09T10:00:00.000Z"),
        userId: "user_123",
      },
    ]);

    const result = await service.listPerformance(context, {
      companyId: "company_1",
      referenceMonth: "2026-05-01",
    });

    expect(result[0]).toEqual({
      advertisingCost: "20.00",
      channel: "mercado_livre",
      companyId: "company_1",
      commissionRate: "0.14",
      createdAt: "2026-05-09T10:00:00.000Z",
      id: "perf_1",
      notes: null,
      packagingCost: "2.00",
      productName: "Produto",
      referenceMonth: "2026-05-01",
      returnsQuantity: 1,
      salePrice: "100.00",
      salesQuantity: 10,
      shippingFee: "5.00",
      sku: "SKU-1",
      taxRate: "0.04",
      unitCost: "30.00",
      updatedAt: "2026-05-09T10:00:00.000Z",
    });
    expect(result[0]).not.toHaveProperty("organizationId");
    expect(result[0]).not.toHaveProperty("userId");
  });

  it("returns public fixed cost records without tenant internals", async () => {
    const { db, service } = createService();
    db.query.companies.findFirst.mockResolvedValue({
      id: "company_1",
      organizationId: "org_123",
      userId: "user_123",
    });
    db.query.fixedCosts.findMany.mockResolvedValue([
      {
        amount: "150.00",
        category: "general",
        companyId: "company_1",
        createdAt: new Date("2026-05-09T10:00:00.000Z"),
        id: "fixed_1",
        isRecurring: true,
        name: "Internet",
        notes: null,
        organizationId: "org_123",
        referenceMonth: "2026-05-01",
        updatedAt: new Date("2026-05-09T10:00:00.000Z"),
        userId: "user_123",
      },
    ]);

    const result = await service.listFixedCosts(context, {
      companyId: "company_1",
      referenceMonth: "2026-05-01",
    });

    expect(result[0]).toEqual({
      amount: "150.00",
      category: "general",
      companyId: "company_1",
      createdAt: "2026-05-09T10:00:00.000Z",
      id: "fixed_1",
      isRecurring: true,
      name: "Internet",
      notes: null,
      referenceMonth: "2026-05-01",
      updatedAt: "2026-05-09T10:00:00.000Z",
    });
    expect(result[0]).not.toHaveProperty("organizationId");
    expect(result[0]).not.toHaveProperty("userId");
  });

  it("rejects moving performance rows to another tenant company", async () => {
    const { db, service } = createService();
    db.query.productMonthlyPerformance.findFirst.mockResolvedValue({
      id: "perf_1",
      organizationId: "org_123",
      userId: "user_123",
    });
    db.query.companies.findFirst.mockResolvedValue(null);

    await expect(
      service.updatePerformance(context, "perf_1", {
        companyId: "company_other",
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("rejects access to companies outside the authenticated tenant", async () => {
    const { db, service } = createService();
    db.query.companies.findFirst.mockResolvedValue({
      id: "company_1",
      organizationId: "org_other",
      userId: "user_other",
    });

    await expect(
      service.listPerformance(context, {
        companyId: "company_1",
        referenceMonth: "2026-05-01",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
