import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProductsService } from "./products.service";

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
    },
    update: vi.fn(),
  };

  return {
    db,
    service: new ProductsService(
      db as never,
      {
        buildFinanceSnapshot: vi.fn(),
      } as never,
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
});
