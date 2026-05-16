import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { buildProductAnalyticsMetrics, type FinancialMonthlyPerformanceInput } from "@marginflow/domain";
import { and, desc, eq } from "drizzle-orm";
import type {
  AdCost,
  Company,
  DatabaseClient,
  ManualExpense,
  Product,
  ProductCost,
  ProductMonthlyPerformance,
} from "@marginflow/database";
import {
  adCosts,
  companies,
  manualExpenses,
  productCosts,
  productMonthlyPerformance,
  products,
} from "@marginflow/database";
import type {
  AdCostFormValues,
  AdCostRecord,
  ManualExpenseFormValues,
  ManualExpenseRecord,
  ProductAnalyticsScope,
  ProductAnalyticsCatalogStats,
  ProductAnalyticsDataGap,
  ProductAnalyticsSnapshot,
  ProductCatalogSnapshot,
  ProductCostFormValues,
  ProductCostRecord,
  ProductFormValues,
  ProductManualCreateFormValues,
  ProductManualCreateResult,
  ProductListItem,
  ProductMonthlyPerformanceDisplayRow,
  ProductRecord,
} from "@marginflow/types";
import { DATABASE_CLIENT } from "@/common/tokens";
import { FinanceService } from "@/modules/finance/finance.service";
import { listSyncedProductsReadModel } from "@/modules/integrations/synced-products.read-model";
import { SyncService } from "@/modules/sync/sync.service";

type ProductUpdateInput = Partial<ProductFormValues>;
type ProductCostUpdateInput = Partial<ProductCostFormValues>;
type AdCostUpdateInput = Partial<AdCostFormValues>;
type ManualExpenseUpdateInput = Partial<ManualExpenseFormValues>;
type TenantContext = {
  organizationId: string;
  userId: string;
};
type AnalyticsQueryInput = {
  companyId?: string;
  referenceMonth?: string;
};

function getSaoPauloCurrentReferenceMonth(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;

  if (!year || !month) {
    return now.toISOString().slice(0, 7) + "-01";
  }

  return `${year}-${month}-01`;
}

function normalizeComparableSku(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  return normalized.length > 0 ? normalized : null;
}

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

@Injectable()
export class ProductsService {
  constructor(
    @Inject(DATABASE_CLIENT)
    private readonly db: DatabaseClient,
    @Inject(FinanceService)
    private readonly financeService: FinanceService,
    @Inject(SyncService)
    private readonly syncService: SyncService,
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

  async createManualProduct(
    context: TenantContext,
    input: ProductManualCreateFormValues,
  ): Promise<ProductManualCreateResult> {
    if (!input.scope.companyId || input.scope.companyId.trim().length === 0) {
      throw new BadRequestException(
        "Cadastre uma empresa ativa antes de salvar um produto manual com custos e impostos mensais.",
      );
    }

    if (!isUuidLike(input.scope.companyId)) {
      throw new BadRequestException("Manual product creation requires a valid company id.");
    }

    const normalizedSku = normalizeComparableSku(input.product.sku);

    if (!normalizedSku) {
      throw new BadRequestException("SKU is required for manual Mercado Livre product creation.");
    }

    const company = await this.ensureCompanyAccess(context, input.scope.companyId);

    if (!company.isActive) {
      throw new BadRequestException(
        "Manual product creation requires an active company for monthly costs and taxes.",
      );
    }

    const result = await this.db.transaction(async (tx) => {
      const [createdProduct] = await tx
        .insert(products)
        .values({
          isActive: input.product.isActive,
          name: input.product.name,
          organizationId: context.organizationId,
          sellingPrice: input.product.sellingPrice,
          sku: normalizedSku,
        })
        .returning();

      const [createdCost] = await tx
        .insert(productCosts)
        .values({
          amount: input.initialFinance.unitCost,
          costType: "base",
          currency: "BRL",
          effectiveFrom: input.scope.referenceMonth,
          notes: "Cadastro manual inicial",
          organizationId: context.organizationId,
          productId: createdProduct.id,
        })
        .returning();

      const existingPerformance = await tx.query.productMonthlyPerformance.findFirst({
        where: (table) =>
          and(
            eq(table.organizationId, context.organizationId),
            eq(table.userId, context.userId),
            eq(table.companyId, input.scope.companyId),
            eq(table.referenceMonth, input.scope.referenceMonth),
            eq(table.channel, input.scope.channel),
            eq(table.sku, normalizedSku),
          ),
      });

      const persistedPerformance = existingPerformance
        ? (
            await tx
              .update(productMonthlyPerformance)
              .set({
                advertisingCost: input.initialFinance.advertisingCost,
                packagingCost: input.initialFinance.packagingCost,
                productName: input.product.name,
                salePrice: input.product.sellingPrice,
                taxRate: input.initialFinance.taxRate,
                unitCost: input.initialFinance.unitCost,
              })
              .where(eq(productMonthlyPerformance.id, existingPerformance.id))
              .returning()
          )[0]
        : (
            await tx
              .insert(productMonthlyPerformance)
              .values({
                advertisingCost: input.initialFinance.advertisingCost,
                channel: input.scope.channel,
                commissionRate: "0.000000",
                companyId: input.scope.companyId,
                notes: "Cadastro manual inicial",
                organizationId: context.organizationId,
                packagingCost: input.initialFinance.packagingCost,
                productName: input.product.name,
                referenceMonth: input.scope.referenceMonth,
                returnsQuantity: 0,
                salePrice: input.product.sellingPrice,
                salesQuantity: 0,
                shippingFee: "0.00",
                sku: normalizedSku,
                taxRate: input.initialFinance.taxRate,
                unitCost: input.initialFinance.unitCost,
                userId: context.userId,
              })
              .returning()
          )[0];

      return {
        performance: persistedPerformance,
        product: createdProduct,
        productCost: createdCost,
      };
    });

    await this.financeService.materializeOrganizationMetrics(context.organizationId);

    return {
      performance: this.toPerformanceRecord(result.performance),
      product: this.toProductRecord(result.product),
      productCost: this.toProductCostRecord(result.productCost),
    };
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
      syncedProducts: [],
    };
  }

  async getAnalyticsSnapshot(
    context: TenantContext,
    query: AnalyticsQueryInput = {},
  ): Promise<ProductAnalyticsSnapshot> {
    const scope = await this.resolveAnalyticsScope(context, query);
    const [
      productsList,
      costRows,
      adCostRows,
      expenseRows,
      rawProductRows,
      financeSnapshot,
      mercadoLivreSyncStatus,
    ] =
      await Promise.all([
        this.listProducts(context.organizationId),
        this.listProductCosts(context.organizationId),
        this.listAdCosts(context.organizationId),
        this.listManualExpenses(context.organizationId),
        this.db.query.products.findMany({
          orderBy: (table) => [desc(table.createdAt)],
          where: (table) => eq(table.organizationId, context.organizationId),
        }),
        this.financeService.buildFinanceSnapshot(context.organizationId),
        this.syncService.getStatus(context.organizationId, "mercadolivre"),
      ]);
    const monthlyPerformanceRows = await this.readMonthlyPerformanceForAnalytics(context, scope);
    const monthlyPerformanceDisplayRows = monthlyPerformanceRows.map((row) =>
      this.toMonthlyPerformanceDisplayRow(row),
    );
    const enrichedFinanceSnapshot = {
      ...financeSnapshot,
      monthlyPerformance: monthlyPerformanceRows.map((row) =>
        this.toFinancialMonthlyPerformance(row, rawProductRows),
      ),
    };

    const syncedProducts = await listSyncedProductsReadModel({
      db: this.db,
      organizationId: context.organizationId,
      productsList: rawProductRows,
      providerSlug: "mercadolivre",
    });
    const linkedMarketplaceSignalsByProductId = Object.fromEntries(
      syncedProducts
        .filter((product) => product.linkedProduct?.id)
        .map((product) => [product.linkedProduct!.id, true] as const),
    );
    const channelWhenUnknownByProductId: Record<string, string> = {};
    for (const sp of syncedProducts) {
      if (sp.linkedProduct?.id) {
        channelWhenUnknownByProductId[sp.linkedProduct.id] = "mercadolivre";
        continue;
      }
      for (const match of sp.suggestedMatches) {
        channelWhenUnknownByProductId[match.productId] = "mercadolivre";
      }
    }
    const productRows = buildProductAnalyticsMetrics(enrichedFinanceSnapshot, {
      channelWhenUnknownByProductId,
      linkedMarketplaceSignalsByProductId,
    }).map((row) => ({
      actualRoas: row.actualRoas,
      adSpend: row.adSpend,
      channel: row.channel,
      contributionMargin: row.contributionMargin,
      dataSource: row.dataSource,
      grossProfit: row.grossProfit,
      hasCost: row.hasCost,
      hasLinkedMarketplaceSignal: row.hasLinkedMarketplaceSignal,
      hasSalesSignal: row.hasSalesSignal,
      insufficientReasons: row.insufficientReasons,
      isActive: row.isActive,
      margin: row.margin,
      marketplaceCommission: row.marketplaceCommission,
      minimumRoas: row.minimumRoas,
      name: row.productName,
      netSales: row.netSales,
      packagingCost: row.packagingCost,
      productCost: row.productCost,
      productId: row.productId,
      revenue: row.revenue,
      returns: row.returns,
      roi: row.roi,
      salePrice: row.salePrice,
      sales: row.sales,
      shippingCost: row.shippingCost,
      sku: row.sku,
      taxAmount: row.taxAmount,
      totalProfit: row.totalProfit,
      unitProfit: row.unitProfit,
    }));
    const catalogStats = this.buildAnalyticsCatalogStats({
      adCostRows,
      expenseRows,
      productRows: productsList,
      syncedProducts,
      costRows,
    });
    const financialState = this.determineAnalyticsFinancialState(productRows, productsList);

    return {
      adCosts: adCostRows,
      catalogStats,
      dataGaps: this.buildAnalyticsDataGaps(),
      financialState,
      manualExpenses: expenseRows,
      mercadoLivreSyncStatus,
      monthlyPerformanceRows: monthlyPerformanceDisplayRows,
      productCosts: costRows,
      productRows,
      products: productsList,
      scope,
      syncedProducts,
    };
  }

  async requireProductAccess(organizationId: string, productId: string) {
    return this.ensureProductAccess(organizationId, productId);
  }

  private buildAnalyticsCatalogStats(input: {
    productRows: ProductListItem[];
    costRows: ProductCostRecord[];
    adCostRows: AdCostRecord[];
    expenseRows: ManualExpenseRecord[];
    syncedProducts: ProductAnalyticsSnapshot["syncedProducts"];
  }): ProductAnalyticsCatalogStats {
    const activeProducts = input.productRows.filter((product) => product.isActive).length;
    const productsWithCost = input.productRows.filter(
      (product) => product.isActive && product.latestCost !== null,
    ).length;
    const pendingSyncProducts = input.syncedProducts.filter(
      (product) => product.reviewStatus === "unreviewed",
    ).length;

    return {
      activeProducts,
      archivedProducts: input.productRows.length - activeProducts,
      pendingSyncProducts,
      productsWithCost,
      productsWithoutCost: activeProducts - productsWithCost,
      syncedProductsTotal: input.syncedProducts.length,
      totalAdCosts: input.adCostRows.length,
      totalManualExpenses: input.expenseRows.length,
      totalProductCosts: input.costRows.length,
      totalProducts: input.productRows.length,
    };
  }

  private determineAnalyticsFinancialState(
    productRows: ProductAnalyticsSnapshot["productRows"],
    productsList: ProductListItem[],
  ): ProductAnalyticsSnapshot["financialState"] {
    if (productsList.length === 0) {
      return "empty";
    }

    const activeProducts = productsList.filter((product) => product.isActive);

    if (activeProducts.length === 0) {
      return "insufficient";
    }

    const hasCost =
      activeProducts.some((product) => product.latestCost !== null) ||
      productRows.some((row) => row.hasCost);

    if (!hasCost) {
      return "no-costs";
    }

    const hasSalesSignal = productRows.some((row) => row.hasSalesSignal);

    return hasSalesSignal ? "ready" : "insufficient";
  }

  private buildAnalyticsDataGaps(): ProductAnalyticsDataGap[] {
    return [];
  }

  private async resolveAnalyticsScope(
    context: TenantContext,
    query: AnalyticsQueryInput,
  ): Promise<ProductAnalyticsScope> {
    const referenceMonth = query.referenceMonth ?? getSaoPauloCurrentReferenceMonth();

    if (query.companyId) {
      await this.ensureCompanyAccess(context, query.companyId);

      return {
        companyId: query.companyId,
        companyRequired: false,
        referenceMonth,
      };
    }

    const companies = await this.db.query.companies.findMany({
      where: (table) =>
        and(eq(table.organizationId, context.organizationId), eq(table.userId, context.userId)),
    });
    const activeCompanyCount = companies.filter((company) => company.isActive).length;

    return {
      companyId: null,
      companyRequired: activeCompanyCount === 0,
      referenceMonth,
    };
  }

  private async ensureCompanyAccess(context: TenantContext, companyId: string): Promise<Company> {
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

    return company;
  }

  private async readMonthlyPerformanceForAnalytics(
    context: TenantContext,
    scope: ProductAnalyticsScope,
  ): Promise<ProductMonthlyPerformance[]> {
    return this.db.query.productMonthlyPerformance.findMany({
      orderBy: (table) => [table.channel, table.productName, table.sku],
      where: scope.companyId
        ? (table) =>
            and(
              eq(table.organizationId, context.organizationId),
              eq(table.userId, context.userId),
              eq(table.companyId, scope.companyId!),
              eq(table.referenceMonth, scope.referenceMonth),
            )
        : (table) =>
            and(
              eq(table.organizationId, context.organizationId),
              eq(table.userId, context.userId),
              eq(table.referenceMonth, scope.referenceMonth),
            ),
    });
  }

  private toFinancialMonthlyPerformance(
    row: ProductMonthlyPerformance,
    productRows: Product[],
  ): FinancialMonthlyPerformanceInput {
    const matchedProduct = productRows.find(
      (product) => normalizeComparableSku(product.sku) === normalizeComparableSku(row.sku),
    );

    return {
      advertisingCost: String(row.advertisingCost),
      channel: row.channel,
      commissionRate: String(row.commissionRate),
      id: row.id,
      packagingCost: String(row.packagingCost),
      productId: matchedProduct?.id ?? null,
      returnsQuantity: row.returnsQuantity,
      salePrice: String(row.salePrice),
      salesQuantity: row.salesQuantity,
      shippingFee: String(row.shippingFee),
      sku: row.sku,
      taxRate: String(row.taxRate),
      unitCost: String(row.unitCost),
    };
  }

  private toMonthlyPerformanceDisplayRow(
    row: ProductMonthlyPerformance,
  ): ProductMonthlyPerformanceDisplayRow {
    return {
      advertisingCost: String(row.advertisingCost),
      channel: row.channel,
      commissionRate: String(row.commissionRate),
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
    };
  }

  private toPerformanceRecord(row: ProductMonthlyPerformance) {
    return {
      advertisingCost: String(row.advertisingCost),
      channel: row.channel,
      commissionRate: String(row.commissionRate),
      companyId: row.companyId,
      createdAt: row.createdAt.toISOString(),
      id: row.id,
      notes: row.notes,
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
