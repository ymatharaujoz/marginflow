import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  companies,
  fixedCosts,
  productMonthlyPerformance,
  type Company as CompanyRow,
  type DatabaseClient,
  type FixedCost as FixedCostDbRow,
  type ProductMonthlyPerformance as PerformanceDbRow,
} from "@marginflow/database";
import type {
  Company,
  CreateCompanyInput,
  FixedCostInput,
  FixedCostRow,
  ProductMonthlyPerformanceInput,
  ProductMonthlyPerformanceRow,
  UpdateCompanyInput,
  UpdateFixedCostInput,
  UpdateProductMonthlyPerformanceInput,
} from "@marginflow/types";
import { and, desc, eq } from "drizzle-orm";
import { DATABASE_CLIENT } from "@/common/tokens";

type TenantContext = {
  organizationId: string;
  userId: string;
};

type PerformanceFilters = {
  companyId: string;
  referenceMonth: string;
  channel?: string;
  sku?: string;
};

type FixedCostFilters = {
  companyId: string;
  referenceMonth: string;
};

@Injectable()
export class FinanceInputsService {
  constructor(
    @Inject(DATABASE_CLIENT)
    private readonly db: DatabaseClient,
  ) {}

  async listCompanies(context: TenantContext): Promise<Company[]> {
    const rows = await this.db.query.companies.findMany({
      orderBy: (table) => [table.name],
      where: (table) =>
        and(eq(table.organizationId, context.organizationId), eq(table.userId, context.userId)),
    });

    return rows.map((row) => this.toCompanyRecord(row));
  }

  async createCompany(context: TenantContext, input: CreateCompanyInput): Promise<Company> {
    const [created] = await this.db
      .insert(companies)
      .values({
        code: input.code.trim().toUpperCase(),
        isActive: input.isActive ?? true,
        name: input.name.trim(),
        organizationId: context.organizationId,
        userId: context.userId,
      })
      .returning();

    return this.toCompanyRecord(created);
  }

  async updateCompany(
    context: TenantContext,
    companyId: string,
    input: UpdateCompanyInput,
  ): Promise<Company> {
    await this.ensureCompanyAccess(context, companyId);

    const [updated] = await this.db
      .update(companies)
      .set({
        ...(input.code !== undefined ? { code: input.code.trim().toUpperCase() } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      })
      .where(
        and(
          eq(companies.id, companyId),
          eq(companies.organizationId, context.organizationId),
          eq(companies.userId, context.userId),
        ),
      )
      .returning();

    return this.toCompanyRecord(updated);
  }

  async listPerformance(
    context: TenantContext,
    filters: PerformanceFilters,
  ): Promise<ProductMonthlyPerformanceRow[]> {
    await this.ensureCompanyAccess(context, filters.companyId);

    const rows = await this.db.query.productMonthlyPerformance.findMany({
      orderBy: (table) => [desc(table.referenceMonth), table.channel, table.sku],
      where: (table) =>
        and(
          eq(table.organizationId, context.organizationId),
          eq(table.userId, context.userId),
          eq(table.companyId, filters.companyId),
          eq(table.referenceMonth, filters.referenceMonth),
          ...(filters.channel ? [eq(table.channel, filters.channel)] : []),
          ...(filters.sku ? [eq(table.sku, filters.sku)] : []),
        ),
    });

    return rows.map((row) => this.toPerformanceRecord(row));
  }

  async createPerformance(
    context: TenantContext,
    input: ProductMonthlyPerformanceInput,
  ): Promise<ProductMonthlyPerformanceRow> {
    await this.ensureCompanyAccess(context, input.companyId);

    const [created] = await this.db
      .insert(productMonthlyPerformance)
      .values({
        advertisingCost: input.advertisingCost,
        channel: input.channel.trim(),
        commissionRate: input.commissionRate,
        companyId: input.companyId,
        notes: input.notes ?? null,
        organizationId: context.organizationId,
        packagingCost: input.packagingCost,
        productName: input.productName.trim(),
        referenceMonth: input.referenceMonth,
        returnsQuantity: input.returnsQuantity,
        salePrice: input.salePrice,
        salesQuantity: input.salesQuantity,
        shippingFee: input.shippingFee,
        sku: input.sku.trim(),
        taxRate: input.taxRate,
        unitCost: input.unitCost,
        userId: context.userId,
      })
      .returning();

    return this.toPerformanceRecord(created);
  }

  async updatePerformance(
    context: TenantContext,
    performanceId: string,
    input: UpdateProductMonthlyPerformanceInput,
  ): Promise<ProductMonthlyPerformanceRow> {
    const existing = await this.ensurePerformanceAccess(context, performanceId);

    if (input.companyId) {
      await this.ensureCompanyAccess(context, input.companyId);
    }

    const [updated] = await this.db
      .update(productMonthlyPerformance)
      .set({
        ...(input.advertisingCost !== undefined ? { advertisingCost: input.advertisingCost } : {}),
        ...(input.channel !== undefined ? { channel: input.channel.trim() } : {}),
        ...(input.commissionRate !== undefined ? { commissionRate: input.commissionRate } : {}),
        ...(input.companyId !== undefined ? { companyId: input.companyId } : {}),
        ...(input.notes !== undefined ? { notes: input.notes ?? null } : {}),
        ...(input.packagingCost !== undefined ? { packagingCost: input.packagingCost } : {}),
        ...(input.productName !== undefined ? { productName: input.productName.trim() } : {}),
        ...(input.referenceMonth !== undefined ? { referenceMonth: input.referenceMonth } : {}),
        ...(input.returnsQuantity !== undefined ? { returnsQuantity: input.returnsQuantity } : {}),
        ...(input.salePrice !== undefined ? { salePrice: input.salePrice } : {}),
        ...(input.salesQuantity !== undefined ? { salesQuantity: input.salesQuantity } : {}),
        ...(input.shippingFee !== undefined ? { shippingFee: input.shippingFee } : {}),
        ...(input.sku !== undefined ? { sku: input.sku.trim() } : {}),
        ...(input.taxRate !== undefined ? { taxRate: input.taxRate } : {}),
        ...(input.unitCost !== undefined ? { unitCost: input.unitCost } : {}),
      })
      .where(
        and(
          eq(productMonthlyPerformance.id, existing.id),
          eq(productMonthlyPerformance.organizationId, context.organizationId),
          eq(productMonthlyPerformance.userId, context.userId),
        ),
      )
      .returning();

    return this.toPerformanceRecord(updated);
  }

  async deletePerformance(context: TenantContext, performanceId: string) {
    const existing = await this.ensurePerformanceAccess(context, performanceId);

    const [deleted] = await this.db
      .delete(productMonthlyPerformance)
      .where(
        and(
          eq(productMonthlyPerformance.id, existing.id),
          eq(productMonthlyPerformance.organizationId, context.organizationId),
          eq(productMonthlyPerformance.userId, context.userId),
        ),
      )
      .returning();

    return this.toPerformanceRecord(deleted);
  }

  async listFixedCosts(context: TenantContext, filters: FixedCostFilters): Promise<FixedCostRow[]> {
    await this.ensureCompanyAccess(context, filters.companyId);

    const rows = await this.db.query.fixedCosts.findMany({
      orderBy: (table) => [table.name],
      where: (table) =>
        and(
          eq(table.organizationId, context.organizationId),
          eq(table.userId, context.userId),
          eq(table.companyId, filters.companyId),
          eq(table.referenceMonth, filters.referenceMonth),
        ),
    });

    return rows.map((row) => this.toFixedCostRecord(row));
  }

  async createFixedCost(context: TenantContext, input: FixedCostInput): Promise<FixedCostRow> {
    await this.ensureCompanyAccess(context, input.companyId);

    const [created] = await this.db
      .insert(fixedCosts)
      .values({
        amount: input.amount,
        category: input.category.trim(),
        companyId: input.companyId,
        isRecurring: input.isRecurring ?? true,
        name: input.name.trim(),
        notes: input.notes ?? null,
        organizationId: context.organizationId,
        referenceMonth: input.referenceMonth,
        userId: context.userId,
      })
      .returning();

    return this.toFixedCostRecord(created);
  }

  async updateFixedCost(
    context: TenantContext,
    fixedCostId: string,
    input: UpdateFixedCostInput,
  ): Promise<FixedCostRow> {
    const existing = await this.ensureFixedCostAccess(context, fixedCostId);

    if (input.companyId) {
      await this.ensureCompanyAccess(context, input.companyId);
    }

    const [updated] = await this.db
      .update(fixedCosts)
      .set({
        ...(input.amount !== undefined ? { amount: input.amount } : {}),
        ...(input.category !== undefined ? { category: input.category.trim() } : {}),
        ...(input.companyId !== undefined ? { companyId: input.companyId } : {}),
        ...(input.isRecurring !== undefined ? { isRecurring: input.isRecurring } : {}),
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.notes !== undefined ? { notes: input.notes ?? null } : {}),
        ...(input.referenceMonth !== undefined ? { referenceMonth: input.referenceMonth } : {}),
      })
      .where(
        and(
          eq(fixedCosts.id, existing.id),
          eq(fixedCosts.organizationId, context.organizationId),
          eq(fixedCosts.userId, context.userId),
        ),
      )
      .returning();

    return this.toFixedCostRecord(updated);
  }

  async deleteFixedCost(context: TenantContext, fixedCostId: string) {
    const existing = await this.ensureFixedCostAccess(context, fixedCostId);

    const [deleted] = await this.db
      .delete(fixedCosts)
      .where(
        and(
          eq(fixedCosts.id, existing.id),
          eq(fixedCosts.organizationId, context.organizationId),
          eq(fixedCosts.userId, context.userId),
        ),
      )
      .returning();

    return this.toFixedCostRecord(deleted);
  }

  private async ensureCompanyAccess(context: TenantContext, companyId: string) {
    const company = await this.db.query.companies.findFirst({
      where: (table) =>
        and(
          eq(table.id, companyId),
          eq(table.organizationId, context.organizationId),
          eq(table.userId, context.userId),
        ),
    });

    if (!company) {
      throw new NotFoundException("Company not found.");
    }

    if (company.organizationId !== context.organizationId || company.userId !== context.userId) {
      throw new ForbiddenException("Company does not belong to the authenticated tenant.");
    }

    return company;
  }

  private async ensurePerformanceAccess(context: TenantContext, performanceId: string) {
    const row = await this.db.query.productMonthlyPerformance.findFirst({
      where: (table) =>
        and(
          eq(table.id, performanceId),
          eq(table.organizationId, context.organizationId),
          eq(table.userId, context.userId),
        ),
    });

    if (!row) {
      throw new NotFoundException("Monthly performance row not found.");
    }

    return row;
  }

  private async ensureFixedCostAccess(context: TenantContext, fixedCostId: string) {
    const row = await this.db.query.fixedCosts.findFirst({
      where: (table) =>
        and(
          eq(table.id, fixedCostId),
          eq(table.organizationId, context.organizationId),
          eq(table.userId, context.userId),
        ),
    });

    if (!row) {
      throw new NotFoundException("Fixed cost not found.");
    }

    return row;
  }

  private toCompanyRecord(row: CompanyRow): Company {
    return {
      code: row.code,
      createdAt: row.createdAt.toISOString(),
      id: row.id,
      isActive: row.isActive,
      name: row.name,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toPerformanceRecord(row: PerformanceDbRow): ProductMonthlyPerformanceRow {
    return {
      advertisingCost: String(row.advertisingCost),
      channel: row.channel,
      companyId: row.companyId,
      commissionRate: String(row.commissionRate),
      createdAt: row.createdAt.toISOString(),
      id: row.id,
      notes: row.notes ?? null,
      packagingCost: String(row.packagingCost),
      productName: row.productName,
      referenceMonth: row.referenceMonth,
      returnsQuantity: row.returnsQuantity,
      salePrice: String(row.salePrice),
      salesQuantity: row.salesQuantity,
      shippingFee: String(row.shippingFee),
      sku: row.sku,
      taxRate: String(row.taxRate),
      unitCost: String(row.unitCost),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toFixedCostRecord(row: FixedCostDbRow): FixedCostRow {
    return {
      amount: String(row.amount),
      category: row.category,
      companyId: row.companyId,
      createdAt: row.createdAt.toISOString(),
      id: row.id,
      isRecurring: row.isRecurring,
      name: row.name,
      notes: row.notes ?? null,
      referenceMonth: row.referenceMonth,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
