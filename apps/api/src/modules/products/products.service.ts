import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";
import type {
  AdCost,
  DatabaseClient,
  ManualExpense,
  Product,
  ProductCost,
} from "@marginflow/database";
import { adCosts, manualExpenses, productCosts, products } from "@marginflow/database";
import type {
  AdCostFormValues,
  AdCostRecord,
  ManualExpenseFormValues,
  ManualExpenseRecord,
  ProductCatalogSnapshot,
  ProductCostFormValues,
  ProductCostRecord,
  ProductFormValues,
  ProductListItem,
  ProductRecord,
} from "@marginflow/types";
import { DATABASE_CLIENT } from "@/common/tokens";

type ProductUpdateInput = Partial<ProductFormValues>;
type ProductCostUpdateInput = Partial<ProductCostFormValues>;
type AdCostUpdateInput = Partial<AdCostFormValues>;
type ManualExpenseUpdateInput = Partial<ManualExpenseFormValues>;

@Injectable()
export class ProductsService {
  constructor(
    @Inject(DATABASE_CLIENT)
    private readonly db: DatabaseClient,
  ) {}

  async listProducts(organizationId: string): Promise<ProductListItem[]> {
    const [productRows, productCostRows] = await Promise.all([
      this.db.query.products.findMany({
        orderBy: (table) => [desc(table.createdAt)],
        where: (table) => eq(table.organizationId, organizationId),
      }),
      this.db.query.productCosts.findMany({
        orderBy: (table) => [desc(table.effectiveFrom), desc(table.createdAt)],
        where: (table) => eq(table.organizationId, organizationId),
      }),
    ]);

    const latestCosts = new Map<string, ProductCostRecord>();

    for (const costRow of productCostRows) {
      if (!latestCosts.has(costRow.productId)) {
        latestCosts.set(costRow.productId, this.toProductCostRecord(costRow));
      }
    }

    return productRows.map((productRow) => ({
      ...this.toProductRecord(productRow),
      latestCost: latestCosts.get(productRow.id) ?? null,
    }));
  }

  async createProduct(organizationId: string, input: ProductFormValues): Promise<ProductRecord> {
    const [created] = await this.db
      .insert(products)
      .values({
        isActive: input.isActive,
        name: input.name,
        organizationId,
        sellingPrice: input.sellingPrice,
        sku: input.sku,
      })
      .returning();

    return this.toProductRecord(created);
  }

  async updateProduct(
    organizationId: string,
    productId: string,
    input: ProductUpdateInput,
  ): Promise<ProductRecord> {
    await this.ensureProductAccess(organizationId, productId);
    const [updated] = await this.db
      .update(products)
      .set({
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.sellingPrice !== undefined ? { sellingPrice: input.sellingPrice } : {}),
        ...(input.sku !== undefined ? { sku: input.sku } : {}),
      })
      .where(and(eq(products.id, productId), eq(products.organizationId, organizationId)))
      .returning();

    return this.toProductRecord(updated);
  }

  async listProductCosts(organizationId: string): Promise<ProductCostRecord[]> {
    const rows = await this.db.query.productCosts.findMany({
      orderBy: (table) => [desc(table.effectiveFrom), desc(table.createdAt)],
      where: (table) => eq(table.organizationId, organizationId),
    });

    return rows.map((row) => this.toProductCostRecord(row));
  }

  async createProductCost(
    organizationId: string,
    input: ProductCostFormValues,
  ): Promise<ProductCostRecord> {
    await this.ensureProductAccess(organizationId, input.productId);

    const [created] = await this.db
      .insert(productCosts)
      .values({
        amount: input.amount,
        costType: input.costType,
        currency: input.currency,
        effectiveFrom: input.effectiveFrom,
        notes: input.notes,
        organizationId,
        productId: input.productId,
      })
      .returning();

    return this.toProductCostRecord(created);
  }

  async updateProductCost(
    organizationId: string,
    costId: string,
    input: ProductCostUpdateInput,
  ): Promise<ProductCostRecord> {
    const existing = await this.ensureProductCostAccess(organizationId, costId);

    if (input.productId) {
      await this.ensureProductAccess(organizationId, input.productId);
    }

    const [updated] = await this.db
      .update(productCosts)
      .set({
        ...(input.amount !== undefined ? { amount: input.amount } : {}),
        ...(input.costType !== undefined ? { costType: input.costType } : {}),
        ...(input.currency !== undefined ? { currency: input.currency } : {}),
        ...(input.effectiveFrom !== undefined ? { effectiveFrom: input.effectiveFrom } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.productId !== undefined ? { productId: input.productId } : {}),
      })
      .where(and(eq(productCosts.id, existing.id), eq(productCosts.organizationId, organizationId)))
      .returning();

    return this.toProductCostRecord(updated);
  }

  async listAdCosts(organizationId: string): Promise<AdCostRecord[]> {
    const rows = await this.db.query.adCosts.findMany({
      orderBy: (table) => [desc(table.spentAt), desc(table.createdAt)],
      where: (table) => eq(table.organizationId, organizationId),
    });

    return rows.map((row) => this.toAdCostRecord(row));
  }

  async createAdCost(organizationId: string, input: AdCostFormValues): Promise<AdCostRecord> {
    if (input.productId) {
      await this.ensureProductAccess(organizationId, input.productId);
    }

    const [created] = await this.db
      .insert(adCosts)
      .values({
        amount: input.amount,
        channel: input.channel,
        currency: input.currency,
        notes: input.notes,
        organizationId,
        productId: input.productId,
        spentAt: input.spentAt,
      })
      .returning();

    return this.toAdCostRecord(created);
  }

  async updateAdCost(
    organizationId: string,
    adCostId: string,
    input: AdCostUpdateInput,
  ): Promise<AdCostRecord> {
    const existing = await this.ensureAdCostAccess(organizationId, adCostId);

    if (input.productId) {
      await this.ensureProductAccess(organizationId, input.productId);
    }

    const [updated] = await this.db
      .update(adCosts)
      .set({
        ...(input.amount !== undefined ? { amount: input.amount } : {}),
        ...(input.channel !== undefined ? { channel: input.channel } : {}),
        ...(input.currency !== undefined ? { currency: input.currency } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.productId !== undefined ? { productId: input.productId } : {}),
        ...(input.spentAt !== undefined ? { spentAt: input.spentAt } : {}),
      })
      .where(and(eq(adCosts.id, existing.id), eq(adCosts.organizationId, organizationId)))
      .returning();

    return this.toAdCostRecord(updated);
  }

  async listManualExpenses(organizationId: string): Promise<ManualExpenseRecord[]> {
    const rows = await this.db.query.manualExpenses.findMany({
      orderBy: (table) => [desc(table.incurredAt), desc(table.createdAt)],
      where: (table) => eq(table.organizationId, organizationId),
    });

    return rows.map((row) => this.toManualExpenseRecord(row));
  }

  async createManualExpense(
    organizationId: string,
    input: ManualExpenseFormValues,
  ): Promise<ManualExpenseRecord> {
    const [created] = await this.db
      .insert(manualExpenses)
      .values({
        amount: input.amount,
        category: input.category,
        currency: input.currency,
        incurredAt: input.incurredAt,
        notes: input.notes,
        organizationId,
      })
      .returning();

    return this.toManualExpenseRecord(created);
  }

  async updateManualExpense(
    organizationId: string,
    expenseId: string,
    input: ManualExpenseUpdateInput,
  ): Promise<ManualExpenseRecord> {
    const existing = await this.ensureManualExpenseAccess(organizationId, expenseId);

    const [updated] = await this.db
      .update(manualExpenses)
      .set({
        ...(input.amount !== undefined ? { amount: input.amount } : {}),
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.currency !== undefined ? { currency: input.currency } : {}),
        ...(input.incurredAt !== undefined ? { incurredAt: input.incurredAt } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      })
      .where(and(eq(manualExpenses.id, existing.id), eq(manualExpenses.organizationId, organizationId)))
      .returning();

    return this.toManualExpenseRecord(updated);
  }

  async getCatalogSnapshot(organizationId: string): Promise<ProductCatalogSnapshot> {
    const [productsList, costRows, adCostRows, expenseRows] = await Promise.all([
      this.listProducts(organizationId),
      this.listProductCosts(organizationId),
      this.listAdCosts(organizationId),
      this.listManualExpenses(organizationId),
    ]);

    return {
      adCosts: adCostRows,
      manualExpenses: expenseRows,
      productCosts: costRows,
      products: productsList,
    };
  }

  private async ensureProductAccess(organizationId: string, productId: string) {
    const product = await this.db.query.products.findFirst({
      where: (table) => eq(table.id, productId),
    });

    if (!product) {
      throw new NotFoundException("Product not found.");
    }

    if (product.organizationId !== organizationId) {
      throw new ForbiddenException("You cannot access products from another organization.");
    }

    return product;
  }

  private async ensureProductCostAccess(organizationId: string, costId: string) {
    const cost = await this.db.query.productCosts.findFirst({
      where: (table) => eq(table.id, costId),
    });

    if (!cost) {
      throw new NotFoundException("Product cost not found.");
    }

    if (cost.organizationId !== organizationId) {
      throw new ForbiddenException("You cannot access product costs from another organization.");
    }

    return cost;
  }

  private async ensureAdCostAccess(organizationId: string, adCostId: string) {
    const adCost = await this.db.query.adCosts.findFirst({
      where: (table) => eq(table.id, adCostId),
    });

    if (!adCost) {
      throw new NotFoundException("Ad cost not found.");
    }

    if (adCost.organizationId !== organizationId) {
      throw new ForbiddenException("You cannot access ad costs from another organization.");
    }

    return adCost;
  }

  private async ensureManualExpenseAccess(organizationId: string, expenseId: string) {
    const expense = await this.db.query.manualExpenses.findFirst({
      where: (table) => eq(table.id, expenseId),
    });

    if (!expense) {
      throw new NotFoundException("Manual expense not found.");
    }

    if (expense.organizationId !== organizationId) {
      throw new ForbiddenException("You cannot access expenses from another organization.");
    }

    return expense;
  }

  private toProductRecord(row: Product): ProductRecord {
    return {
      createdAt: row.createdAt.toISOString(),
      id: row.id,
      isActive: row.isActive,
      name: row.name,
      organizationId: row.organizationId,
      sellingPrice: String(row.sellingPrice),
      sku: row.sku,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toProductCostRecord(row: ProductCost): ProductCostRecord {
    return {
      amount: String(row.amount),
      costType: row.costType,
      createdAt: row.createdAt.toISOString(),
      currency: row.currency,
      effectiveFrom: row.effectiveFrom,
      id: row.id,
      notes: row.notes,
      organizationId: row.organizationId,
      productId: row.productId,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toAdCostRecord(row: AdCost): AdCostRecord {
    return {
      amount: String(row.amount),
      channel: row.channel,
      createdAt: row.createdAt.toISOString(),
      currency: row.currency,
      id: row.id,
      notes: row.notes,
      organizationId: row.organizationId,
      productId: row.productId,
      spentAt: row.spentAt,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toManualExpenseRecord(row: ManualExpense): ManualExpenseRecord {
    return {
      amount: String(row.amount),
      category: row.category,
      createdAt: row.createdAt.toISOString(),
      currency: row.currency,
      id: row.id,
      incurredAt: row.incurredAt,
      notes: row.notes,
      organizationId: row.organizationId,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
