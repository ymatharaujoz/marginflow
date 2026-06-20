import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  buildProductAnalyticsMetrics,
  type FinancialMonthlyPerformanceInput,
} from "@lucreii/domain";
import { and, desc, eq, inArray } from "drizzle-orm";
import { read, utils } from "xlsx";
import type { ProductCatalogFinanceUpdateInput } from "@lucreii/validation";
import { productImportRowSchema } from "@lucreii/validation";
import type {
  AdCost,
  Company,
  DatabaseClient,
  ManualExpense,
  Product,
  ProductImage,
  ProductCost,
  ProductFinanceDefaults,
  ProductMonthlyPerformance,
} from "@lucreii/database";
import {
  adCosts,
  manualExpenses,
  productCosts,
  productFinanceDefaults,
  products,
} from "@lucreii/database";
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
  ProductPerformanceRow,
  ProductRecord,
  SyncedProductRecord,
  SyncStatusResponse,
} from "@lucreii/types";
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
  selectedCompanyId?: string | null;
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

const PRODUCT_SKU_UNIQUE_INDEX = "products_company_normalized_sku_key";

type MercadoLivreCatalogGroup = {
  childProductIds: string[];
  groupKey: string;
  parentProductId: string;
  variationLabelByProductId: Map<string, string | null>;
};

type WeightedPerformanceAccumulator = {
  advertisingCostTotal: number;
  marketplaceCommissionTotal: number;
  netSalesTotal: number;
  packagingCostTotal: number;
  returnsQuantity: number;
  revenueTotal: number;
  salesQuantity: number;
  shippingFeeTotal: number;
  unitCostTotal: number;
};

function toCatalogGroupKey(itemId: string) {
  return `mercadolivre:${itemId}`;
}

function extractMercadoLivreItemId(externalProductId: string) {
  const [itemId] = externalProductId.split(":");
  return itemId?.trim() ? itemId.trim() : null;
}

function toNumber(value: string | undefined) {
  if (!value) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toDecimalString(value: number, fractionDigits = 2) {
  return value.toFixed(fractionDigits);
}

function resolveNetSales(
  row: Pick<ProductMonthlyPerformanceDisplayRow, "salesQuantity" | "returnsQuantity">,
) {
  return Math.max(
    0,
    row.salesQuantity - Math.min(row.returnsQuantity, row.salesQuantity),
  );
}

function createEmptyAccumulator(): WeightedPerformanceAccumulator {
  return {
    advertisingCostTotal: 0,
    marketplaceCommissionTotal: 0,
    netSalesTotal: 0,
    packagingCostTotal: 0,
    returnsQuantity: 0,
    revenueTotal: 0,
    salesQuantity: 0,
    shippingFeeTotal: 0,
    unitCostTotal: 0,
  };
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

  private isTenantContext(
    value: TenantContext | string,
  ): value is TenantContext {
    return typeof value !== "string";
  }

  private async requireScopedCompanyContext(context: TenantContext) {
    const companyRows =
      await this.db.query.companies.findMany({
      columns: {
        id: true,
        isActive: true,
      },
      where: (table) =>
        context.userId
          ? and(
              eq(table.organizationId, context.organizationId),
              eq(table.userId, context.userId),
            )
          : eq(table.organizationId, context.organizationId),
    });
    const companyId = context.selectedCompanyId?.trim();

    if (companyId) {
      if (!companyRows) {
        return {
          ...context,
          companyId,
        };
      }

      const selectedCompany = companyRows.find(
        (row) => row.id === companyId && row.isActive,
      );

      if (!selectedCompany) {
        throw new NotFoundException("Company not found.");
      }

      return {
        ...context,
        companyId: selectedCompany.id,
      };
    }

    if (!companyRows) {
      return {
        ...context,
        companyId: "legacy-company-scope",
      };
    }

    const activeCompany = companyRows.find((row) => row.isActive);

    if (!activeCompany) {
      throw new BadRequestException(
        "Cadastre uma empresa ativa em /app antes de criar ou importar produtos.",
      );
    }

    return {
      ...context,
      companyId: activeCompany.id,
    };
  }

  async listProducts(
    contextOrOrganizationId: TenantContext | string,
  ): Promise<ProductListItem[]> {
    const scopedContext = this.isTenantContext(contextOrOrganizationId)
      ? await this.requireScopedCompanyContext(contextOrOrganizationId)
      : null;
    const organizationId = this.isTenantContext(contextOrOrganizationId)
      ? contextOrOrganizationId.organizationId
      : contextOrOrganizationId;
    const [productRows, productCostRows, externalProductRows] = await Promise.all([
      this.db.query.products.findMany({
        orderBy: (table) => [desc(table.createdAt)],
        where: (table) =>
          scopedContext
            ? and(
                eq(table.organizationId, organizationId),
                eq(table.companyId, scopedContext.companyId),
              )
            : eq(table.organizationId, organizationId),
        with: {
          financeDefaults: true,
          images: {
            orderBy: (table) => [table.position],
          },
        },
      }),
      this.db.query.productCosts.findMany({
        orderBy: (table) => [desc(table.effectiveFrom), desc(table.createdAt)],
        where: (table) =>
          scopedContext
            ? and(
                eq(table.organizationId, organizationId),
                eq(table.companyId, scopedContext.companyId),
              )
            : eq(table.organizationId, organizationId),
      }),
      this.db.query.externalProducts.findMany({
        where: (table) =>
          scopedContext
            ? and(
                eq(table.organizationId, organizationId),
                eq(table.companyId, scopedContext.companyId),
              )
            : eq(table.organizationId, organizationId),
      }),
    ]);

    const latestCosts = new Map<string, ProductCostRecord>();

    for (const costRow of productCostRows) {
      if (!latestCosts.has(costRow.productId)) {
        latestCosts.set(costRow.productId, this.toProductCostRecord(costRow));
      }
    }

    const providerByProductId = new Map<string, "mercadolivre">();

    for (const externalProduct of externalProductRows) {
      if (externalProduct.linkedProductId && !providerByProductId.has(externalProduct.linkedProductId)) {
        providerByProductId.set(externalProduct.linkedProductId, externalProduct.provider as "mercadolivre");
      }
    }

    return productRows.map((productRow) => ({
      catalogGroupKey: null,
      catalogRole: "standalone",
      children: [],
      derivedFromProvider: providerByProductId.get(productRow.id) ?? null,
      ...this.toProductRecord(productRow, productRow.images),
      latestCost: latestCosts.get(productRow.id) ?? null,
      financeDefaults: productRow.financeDefaults
        ? this.toProductFinanceDefaultsRecord(productRow.financeDefaults)
        : null,
      parentProductId: null,
      variationLabel: null,
    }));
  }

  async createProduct(
    contextOrOrganizationId: TenantContext | string,
    input: ProductFormValues,
  ): Promise<ProductRecord> {
    if (!this.isTenantContext(contextOrOrganizationId)) {
      const context = await this.requireScopedCompanyContext({
        organizationId: contextOrOrganizationId,
        userId: "",
      });
      const normalizedSku = await this.assertSkuIsUnique(
        context.companyId,
        input.sku,
      );
      const [created] = await this.withSkuConflictHandling(
        normalizedSku,
        async () =>
          this.db
            .insert(products)
            .values({
              companyId: context.companyId,
              isActive: input.isActive,
              name: input.name,
              organizationId: contextOrOrganizationId,
              sellingPrice: input.sellingPrice,
              sku: normalizedSku,
            })
            .returning(),
      );

      return this.toProductRecord(created, []);
    }

    const context = await this.requireScopedCompanyContext(contextOrOrganizationId);
    const normalizedSku = await this.assertSkuIsUnique(context.companyId, input.sku);
    const [created] = await this.withSkuConflictHandling(
      normalizedSku,
      async () =>
        this.db
          .insert(products)
          .values({
            companyId: context.companyId,
            isActive: input.isActive,
            name: input.name,
            organizationId: context.organizationId,
            sellingPrice: input.sellingPrice,
            sku: normalizedSku,
          })
          .returning(),
    );

    return this.toProductRecord(created, []);
  }

  async createManualProduct(
    context: TenantContext,
    input: ProductManualCreateFormValues,
  ): Promise<ProductManualCreateResult> {
    const normalizedSku = normalizeComparableSku(input.product.sku);

    if (!normalizedSku) {
      throw new BadRequestException(
        "SKU is required for manual product creation.",
      );
    }
    const scopedContext = await this.requireScopedCompanyContext(context);
    await this.assertSkuIsUnique(scopedContext.companyId, normalizedSku);

    const result = await this.withSkuConflictHandling(normalizedSku, () =>
      this.db.transaction(async (tx) => {
        const [createdProduct] = await tx
          .insert(products)
          .values({
            companyId: scopedContext.companyId,
            isActive: input.product.isActive,
            name: input.product.name,
            organizationId: scopedContext.organizationId,
            sellingPrice: input.product.sellingPrice,
            sku: normalizedSku,
          })
          .returning();

        const [createdCost] = await tx
          .insert(productCosts)
          .values({
            amount: input.initialFinance.unitCost,
            companyId: scopedContext.companyId,
            costType: "base",
            currency: "BRL",
            effectiveFrom: null,
            notes: "Cadastro manual inicial",
            organizationId: scopedContext.organizationId,
            productId: createdProduct.id,
          })
          .returning();

        const [createdDefaults] = await tx
          .insert(productFinanceDefaults)
          .values({
            packagingCost: input.initialFinance.packagingCost,
            productId: createdProduct.id,
          })
          .returning();

        return {
          financeDefaults: createdDefaults,
          product: createdProduct,
          productCost: createdCost,
        };
      }),
    );

    await this.financeService.materializeOrganizationMetrics(
      scopedContext.organizationId,
      scopedContext.companyId,
    );

    return {
      financeDefaults: this.toProductFinanceDefaultsRecord(
        result.financeDefaults,
      ),
      product: this.toProductRecord(result.product, []),
      productCost: this.toProductCostRecord(result.productCost),
    };
  }

  async importProducts(
    context: TenantContext,
    fileBuffer: Buffer,
  ): Promise<{
    imported: number;
    errors: Array<{ row: number; message: string }>;
  }> {
    const scopedContext = await this.requireScopedCompanyContext(context);
    const wb = read(fileBuffer, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];

    if (!ws) {
      throw new BadRequestException("Planilha vazia ou inválida.");
    }

    const rawRows = utils.sheet_to_json<Record<string, unknown>>(ws);

    if (rawRows.length === 0) {
      throw new BadRequestException("A planilha está vazia.");
    }

    if (rawRows.length > 50) {
      throw new BadRequestException(
        "A planilha pode ter no máximo 50 produtos",
      );
    }

    const requiredColumns = [
      "PRODUTO",
      "SKU",
      "PREÇO DE VENDA",
      "CUSTO UNITÁRIO",
      "EMBALAGEM",
      "STATUS",
    ];
    const normalizedRows = rawRows.map((row) => {
      const normalized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(row)) {
        normalized[key.trim().toUpperCase()] = value;
      }
      return normalized;
    });

    const missingColumns = requiredColumns.filter(
      (col) => !(col in normalizedRows[0]),
    );
    if (missingColumns.length > 0) {
      throw new BadRequestException(
        `Colunas obrigatórias não encontradas: ${missingColumns.join(", ")}`,
      );
    }
    const extraColumns = Object.keys(normalizedRows[0] ?? {}).filter(
      (col) => !requiredColumns.includes(col),
    );
    if (extraColumns.length > 0) {
      throw new BadRequestException(
        `Colunas extras não suportadas: ${extraColumns.join(", ")}`,
      );
    }

    const existingSkus = await this.getCompanyNormalizedSkuSet(
      scopedContext.companyId,
    );

    const errors: Array<{ row: number; message: string }> = [];
    const validRows: Array<{
      product: {
        name: string;
        sku: string;
        sellingPrice: string;
        isActive: boolean;
      };
      initialFinance: { unitCost: string; packagingCost: string };
    }> = [];
    const seenSkus = new Set<string>();

    for (let i = 0; i < normalizedRows.length; i++) {
      const rowNumber = i + 2;
      const parsed = productImportRowSchema.safeParse(normalizedRows[i]);

      if (!parsed.success) {
        const firstIssue = parsed.error.issues[0];
        const fieldName = firstIssue?.path.join(".") ?? "";
        const message = firstIssue?.message ?? "Dados inválidos";
        errors.push({
          row: rowNumber,
          message: fieldName ? `${fieldName}: ${message}` : message,
        });
        continue;
      }

      const data = parsed.data;
      const normalizedSku = normalizeComparableSku(data.SKU);

      if (!normalizedSku) {
        errors.push({
          row: rowNumber,
          message: "SKU invÃ¡lido",
        });
        continue;
      }

      if (existingSkus.has(normalizedSku)) {
        errors.push({
          row: rowNumber,
          message: `SKU "${data.SKU}" já existe no catálogo.`,
        });
        continue;
      }

      if (seenSkus.has(normalizedSku)) {
        errors.push({
          row: rowNumber,
          message: `SKU "${data.SKU}" duplicado na planilha`,
        });
        continue;
      }

      seenSkus.add(normalizedSku);
      validRows.push({
        initialFinance: {
          packagingCost: Number(data.EMBALAGEM).toFixed(2),
          unitCost: Number(data["CUSTO UNITÁRIO"]).toFixed(2),
        },
        product: {
          isActive: Number(data.STATUS) === 1,
          name: data.PRODUTO,
          sellingPrice: Number(data["PREÇO DE VENDA"]).toFixed(2),
          sku: normalizedSku,
        },
      });
    }

    for (const row of validRows) {
      await this.createManualProduct(scopedContext, row);
    }

    return { errors, imported: validRows.length };
  }

  private async resolveSingleActiveCompanyTaxRate(
    context: TenantContext,
  ): Promise<string> {
    const companyRows = await this.db.query.companies.findMany({
      columns: {
        id: true,
        isActive: true,
        taxRateDefault: true,
      },
      where: (table) =>
        and(
          eq(table.organizationId, context.organizationId),
          eq(table.userId, context.userId),
        ),
    });
    const activeCompanies = companyRows.filter((company) => company.isActive);

    if (activeCompanies.length === 0) {
      throw new BadRequestException(
        "Cadastre uma empresa ativa em /app antes de criar ou importar produtos.",
      );
    }

    if (context.selectedCompanyId) {
      const selectedCompany = activeCompanies.find(
        (company) => company.id === context.selectedCompanyId,
      );

      if (selectedCompany) {
        return String(selectedCompany.taxRateDefault ?? "0");
      }
    }

    return String(activeCompanies[0]?.taxRateDefault ?? "0");
  }

  private async listCompanyProductSkus(companyId: string) {
    return this.db.query.products.findMany({
      columns: {
        id: true,
        sku: true,
      },
      where: (table) => eq(table.companyId, companyId),
    });
  }

  private async getCompanyNormalizedSkuSet(companyId: string) {
    const productRows = await this.listCompanyProductSkus(companyId);

    return new Set(
      productRows
        .map((product) => normalizeComparableSku(product.sku))
        .filter((sku): sku is string => sku !== null),
    );
  }

  private async assertSkuIsUnique(
    companyId: string,
    sku: string | null | undefined,
    excludedProductId?: string,
  ) {
    const normalizedSku = normalizeComparableSku(sku);

    if (!normalizedSku) {
      return null;
    }

    const productRows = await this.listCompanyProductSkus(companyId);
    const conflictingProduct = productRows.find(
      (product) =>
        product.id !== excludedProductId &&
        normalizeComparableSku(product.sku) === normalizedSku,
    );

    if (conflictingProduct) {
      throw new ConflictException(this.buildDuplicateSkuMessage(normalizedSku));
    }

    return normalizedSku;
  }

  private buildDuplicateSkuMessage(normalizedSku: string) {
    return `SKU "${normalizedSku}" já existe no catálogo.`;
  }

  private isSkuUniqueConstraintViolation(error: unknown) {
    if (!error || typeof error !== "object") {
      return false;
    }

    const code =
      "code" in error && typeof error.code === "string" ? error.code : null;
    const constraint =
      "constraint" in error && typeof error.constraint === "string"
        ? error.constraint
        : null;
    const detail =
      "detail" in error && typeof error.detail === "string"
        ? error.detail
        : "";
    const message =
      "message" in error && typeof error.message === "string"
        ? error.message
        : "";

    if (code !== "23505") {
      return false;
    }

    return (
      constraint === PRODUCT_SKU_UNIQUE_INDEX ||
      detail.includes(PRODUCT_SKU_UNIQUE_INDEX) ||
      message.includes(PRODUCT_SKU_UNIQUE_INDEX)
    );
  }

  private async withSkuConflictHandling<T>(
    sku: string | null,
    operation: () => Promise<T>,
  ) {
    try {
      return await operation();
    } catch (error) {
      if (sku && this.isSkuUniqueConstraintViolation(error)) {
        throw new ConflictException(this.buildDuplicateSkuMessage(sku));
      }

      throw error;
    }
  }

  async updateProduct(
    contextOrOrganizationId: TenantContext | string,
    productId: string,
    input: ProductUpdateInput,
  ): Promise<ProductRecord> {
    const scopedContext = this.isTenantContext(contextOrOrganizationId)
      ? await this.requireScopedCompanyContext(contextOrOrganizationId)
      : null;
    const organizationId = this.isTenantContext(contextOrOrganizationId)
      ? contextOrOrganizationId.organizationId
      : contextOrOrganizationId;
    await this.ensureProductAccess(organizationId, productId, scopedContext?.companyId);
    const normalizedSku =
      input.sku !== undefined
        ? await this.assertSkuIsUnique(
            scopedContext?.companyId ?? "",
            input.sku,
            productId,
          )
        : undefined;
    const [updated] = await this.withSkuConflictHandling(
      normalizedSku ?? null,
      async () =>
        this.db
          .update(products)
          .set({
            ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.sellingPrice !== undefined
              ? { sellingPrice: input.sellingPrice }
              : {}),
            ...(input.sku !== undefined ? { sku: normalizedSku } : {}),
          })
          .where(
            and(
              eq(products.id, productId),
              eq(products.organizationId, organizationId),
              ...(scopedContext ? [eq(products.companyId, scopedContext.companyId)] : []),
            ),
          )
          .returning(),
    );

    return this.toProductRecord(updated, []);
  }

  async updateCatalogFinance(
    contextOrOrganizationId: TenantContext | string,
    productId: string,
    input: ProductCatalogFinanceUpdateInput,
  ): Promise<ProductListItem> {
    const scopedContext = this.isTenantContext(contextOrOrganizationId)
      ? await this.requireScopedCompanyContext(contextOrOrganizationId)
      : null;
    const organizationId = this.isTenantContext(contextOrOrganizationId)
      ? contextOrOrganizationId.organizationId
      : contextOrOrganizationId;
    await this.ensureProductAccess(organizationId, productId, scopedContext?.companyId);
    return this.updateCatalogFinanceForGroup(
      organizationId,
      scopedContext?.companyId,
      productId,
      input,
    );

    const [existingProduct, existingCost] = await Promise.all([
      this.db.query.products.findFirst({
        where: (table) =>
          and(eq(table.id, productId), eq(table.organizationId, organizationId)),
        with: {
          financeDefaults: true,
        },
      }),
      this.db.query.productCosts.findFirst({
        orderBy: (table) => [desc(table.effectiveFrom), desc(table.createdAt)],
        where: (table) =>
          and(
            eq(table.organizationId, organizationId),
            eq(table.productId, productId),
          ),
      }),
    ]);

    if (!existingProduct) {
      throw new NotFoundException("Product not found.");
    }
    const ensuredExistingProduct = existingProduct!;

    await this.db.transaction(async (tx) => {
      if (existingCost) {
        await tx
          .update(productCosts)
          .set({
            amount: input.unitCost,
            costType: existingCost.costType,
            currency: existingCost.currency,
            effectiveFrom: existingCost.effectiveFrom,
            notes: "Atualizado pelo catálogo",
          })
          .where(
            and(
              eq(productCosts.id, existingCost.id),
              eq(productCosts.organizationId, organizationId),
            ),
          )
          .returning();
      } else {
        await tx
          .insert(productCosts)
          .values({
            amount: input.unitCost,
            companyId: scopedContext?.companyId ?? organizationId,
            costType: "base",
            currency: "BRL",
            effectiveFrom: null,
            notes: "Atualizado pelo catálogo",
            organizationId,
            productId,
          })
          .returning();
      }

      if (ensuredExistingProduct.financeDefaults) {
        await tx
          .update(productFinanceDefaults)
          .set({
            packagingCost: input.packagingCost,
          })
          .where(
            eq(
              productFinanceDefaults.id,
              ensuredExistingProduct.financeDefaults.id,
            ),
          )
          .returning();
      } else {
        await tx
          .insert(productFinanceDefaults)
          .values({
            advertisingCost: "0",
            packagingCost: input.packagingCost,
            productId,
          })
          .returning();
      }
    });

    await this.financeService.materializeOrganizationMetrics(
      organizationId,
      ensuredExistingProduct.companyId,
    );

    return this.getProductListItem(
      organizationId,
      productId,
      ensuredExistingProduct.companyId,
    );
  }

  async deleteProduct(
    contextOrOrganizationId: TenantContext | string,
    productId: string,
  ): Promise<{ id: string }> {
    const scopedContext = this.isTenantContext(contextOrOrganizationId)
      ? await this.requireScopedCompanyContext(contextOrOrganizationId)
      : null;
    const organizationId = this.isTenantContext(contextOrOrganizationId)
      ? contextOrOrganizationId.organizationId
      : contextOrOrganizationId;
    await this.ensureProductAccess(organizationId, productId, scopedContext?.companyId);

    await this.db
      .delete(products)
      .where(
        and(
          eq(products.id, productId),
          eq(products.organizationId, organizationId),
          ...(scopedContext ? [eq(products.companyId, scopedContext.companyId)] : []),
        ),
      );

    if (scopedContext) {
      await this.financeService.materializeOrganizationMetrics(
        organizationId,
        scopedContext.companyId,
      );
    }

    return { id: productId };
  }

  async listProductCosts(
    contextOrOrganizationId: TenantContext | string,
  ): Promise<ProductCostRecord[]> {
    const scopedContext = this.isTenantContext(contextOrOrganizationId)
      ? await this.requireScopedCompanyContext(contextOrOrganizationId)
      : null;
    const organizationId = this.isTenantContext(contextOrOrganizationId)
      ? contextOrOrganizationId.organizationId
      : contextOrOrganizationId;
    const rows = await this.db.query.productCosts.findMany({
      orderBy: (table) => [desc(table.effectiveFrom), desc(table.createdAt)],
      where: (table) =>
        scopedContext
          ? and(
              eq(table.organizationId, organizationId),
              eq(table.companyId, scopedContext.companyId),
            )
          : eq(table.organizationId, organizationId),
    });

    return rows.map((row) => this.toProductCostRecord(row));
  }

  async createProductCost(
    contextOrOrganizationId: TenantContext | string,
    input: ProductCostFormValues,
  ): Promise<ProductCostRecord> {
    if (!this.isTenantContext(contextOrOrganizationId)) {
      const context = await this.requireScopedCompanyContext({
        organizationId: contextOrOrganizationId,
        userId: "",
      });
      await this.ensureProductAccess(
        context.organizationId,
        input.productId,
        context.companyId,
      );

      const [created] = await this.db
        .insert(productCosts)
        .values({
          amount: input.amount,
          companyId: context.companyId,
          costType: input.costType,
          currency: input.currency,
          effectiveFrom: input.effectiveFrom,
          notes: input.notes,
          organizationId: contextOrOrganizationId,
          productId: input.productId,
        })
        .returning();

      return this.toProductCostRecord(created);
    }
    const context = await this.requireScopedCompanyContext(contextOrOrganizationId);
    await this.ensureProductAccess(context.organizationId, input.productId, context.companyId);

    const [created] = await this.db
      .insert(productCosts)
      .values({
        amount: input.amount,
        companyId: context.companyId,
        costType: input.costType,
        currency: input.currency,
        effectiveFrom: input.effectiveFrom,
        notes: input.notes,
        organizationId: context.organizationId,
        productId: input.productId,
      })
      .returning();

    return this.toProductCostRecord(created);
  }

  async updateProductCost(
    contextOrOrganizationId: TenantContext | string,
    costId: string,
    input: ProductCostUpdateInput,
  ): Promise<ProductCostRecord> {
    const scopedContext = this.isTenantContext(contextOrOrganizationId)
      ? await this.requireScopedCompanyContext(contextOrOrganizationId)
      : null;
    const organizationId = this.isTenantContext(contextOrOrganizationId)
      ? contextOrOrganizationId.organizationId
      : contextOrOrganizationId;
    const existing = await this.ensureProductCostAccess(
      organizationId,
      costId,
      scopedContext?.companyId,
    );

    if (input.productId) {
      await this.ensureProductAccess(
        organizationId,
        input.productId,
        scopedContext?.companyId,
      );
    }

    const [updated] = await this.db
      .update(productCosts)
      .set({
        ...(input.amount !== undefined ? { amount: input.amount } : {}),
        ...(input.costType !== undefined ? { costType: input.costType } : {}),
        ...(input.currency !== undefined ? { currency: input.currency } : {}),
        ...(input.effectiveFrom !== undefined
          ? { effectiveFrom: input.effectiveFrom }
          : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.productId !== undefined
          ? { productId: input.productId }
          : {}),
      })
      .where(
        and(
          eq(productCosts.id, existing.id),
          eq(productCosts.organizationId, organizationId),
          ...(scopedContext ? [eq(productCosts.companyId, scopedContext.companyId)] : []),
        ),
      )
      .returning();

    return this.toProductCostRecord(updated);
  }

  async listAdCosts(
    contextOrOrganizationId: TenantContext | string,
  ): Promise<AdCostRecord[]> {
    const scopedContext = this.isTenantContext(contextOrOrganizationId)
      ? await this.requireScopedCompanyContext(contextOrOrganizationId)
      : null;
    const organizationId = this.isTenantContext(contextOrOrganizationId)
      ? contextOrOrganizationId.organizationId
      : contextOrOrganizationId;
    const rows = await this.db.query.adCosts.findMany({
      orderBy: (table) => [desc(table.spentAt), desc(table.createdAt)],
      where: (table) =>
        scopedContext
          ? and(
              eq(table.organizationId, organizationId),
              eq(table.companyId, scopedContext.companyId),
            )
          : eq(table.organizationId, organizationId),
    });

    return rows.map((row) => this.toAdCostRecord(row));
  }

  async createAdCost(
    contextOrOrganizationId: TenantContext | string,
    input: AdCostFormValues,
  ): Promise<AdCostRecord> {
    if (!this.isTenantContext(contextOrOrganizationId)) {
      throw new BadRequestException("Selected company required.");
    }
    const context = await this.requireScopedCompanyContext(contextOrOrganizationId);
    if (input.productId) {
      await this.ensureProductAccess(context.organizationId, input.productId, context.companyId);
    }

    const [created] = await this.db
      .insert(adCosts)
      .values({
        amount: input.amount,
        channel: input.channel,
        companyId: context.companyId,
        currency: input.currency,
        notes: input.notes,
        organizationId: context.organizationId,
        productId: input.productId,
        spentAt: input.spentAt,
      })
      .returning();

    return this.toAdCostRecord(created);
  }

  async updateAdCost(
    contextOrOrganizationId: TenantContext | string,
    adCostId: string,
    input: AdCostUpdateInput,
  ): Promise<AdCostRecord> {
    const scopedContext = this.isTenantContext(contextOrOrganizationId)
      ? await this.requireScopedCompanyContext(contextOrOrganizationId)
      : null;
    const organizationId = this.isTenantContext(contextOrOrganizationId)
      ? contextOrOrganizationId.organizationId
      : contextOrOrganizationId;
    const existing = await this.ensureAdCostAccess(
      organizationId,
      adCostId,
      scopedContext?.companyId,
    );

    if (input.productId) {
      await this.ensureProductAccess(
        organizationId,
        input.productId,
        scopedContext?.companyId,
      );
    }

    const [updated] = await this.db
      .update(adCosts)
      .set({
        ...(input.amount !== undefined ? { amount: input.amount } : {}),
        ...(input.channel !== undefined ? { channel: input.channel } : {}),
        ...(input.currency !== undefined ? { currency: input.currency } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.productId !== undefined
          ? { productId: input.productId }
          : {}),
        ...(input.spentAt !== undefined ? { spentAt: input.spentAt } : {}),
      })
      .where(
        and(
          eq(adCosts.id, existing.id),
          eq(adCosts.organizationId, organizationId),
          ...(scopedContext ? [eq(adCosts.companyId, scopedContext.companyId)] : []),
        ),
      )
      .returning();

    return this.toAdCostRecord(updated);
  }

  async listManualExpenses(
    contextOrOrganizationId: TenantContext | string,
  ): Promise<ManualExpenseRecord[]> {
    const scopedContext = this.isTenantContext(contextOrOrganizationId)
      ? await this.requireScopedCompanyContext(contextOrOrganizationId)
      : null;
    const organizationId = this.isTenantContext(contextOrOrganizationId)
      ? contextOrOrganizationId.organizationId
      : contextOrOrganizationId;
    const rows = await this.db.query.manualExpenses.findMany({
      orderBy: (table) => [desc(table.incurredAt), desc(table.createdAt)],
      where: (table) =>
        scopedContext
          ? and(
              eq(table.organizationId, organizationId),
              eq(table.companyId, scopedContext.companyId),
            )
          : eq(table.organizationId, organizationId),
    });

    return rows.map((row) => this.toManualExpenseRecord(row));
  }

  async createManualExpense(
    contextOrOrganizationId: TenantContext | string,
    input: ManualExpenseFormValues,
  ): Promise<ManualExpenseRecord> {
    if (!this.isTenantContext(contextOrOrganizationId)) {
      throw new BadRequestException("Selected company required.");
    }
    const context = await this.requireScopedCompanyContext(contextOrOrganizationId);
    const [created] = await this.db
      .insert(manualExpenses)
      .values({
        amount: input.amount,
        category: input.category,
        companyId: context.companyId,
        currency: input.currency,
        incurredAt: input.incurredAt,
        notes: input.notes,
        organizationId: context.organizationId,
      })
      .returning();

    return this.toManualExpenseRecord(created);
  }

  async updateManualExpense(
    contextOrOrganizationId: TenantContext | string,
    expenseId: string,
    input: ManualExpenseUpdateInput,
  ): Promise<ManualExpenseRecord> {
    const scopedContext = this.isTenantContext(contextOrOrganizationId)
      ? await this.requireScopedCompanyContext(contextOrOrganizationId)
      : null;
    const organizationId = this.isTenantContext(contextOrOrganizationId)
      ? contextOrOrganizationId.organizationId
      : contextOrOrganizationId;
    const existing = await this.ensureManualExpenseAccess(
      organizationId,
      expenseId,
      scopedContext?.companyId,
    );

    const [updated] = await this.db
      .update(manualExpenses)
      .set({
        ...(input.amount !== undefined ? { amount: input.amount } : {}),
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.currency !== undefined ? { currency: input.currency } : {}),
        ...(input.incurredAt !== undefined
          ? { incurredAt: input.incurredAt }
          : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      })
      .where(
        and(
          eq(manualExpenses.id, existing.id),
          eq(manualExpenses.organizationId, organizationId),
          ...(scopedContext ? [eq(manualExpenses.companyId, scopedContext.companyId)] : []),
        ),
      )
      .returning();

    return this.toManualExpenseRecord(updated);
  }

  async getCatalogSnapshot(
    contextOrOrganizationId: TenantContext | string,
  ): Promise<ProductCatalogSnapshot> {
    const context = this.isTenantContext(contextOrOrganizationId)
      ? contextOrOrganizationId
      : {
          organizationId: contextOrOrganizationId,
          userId: "",
        };
    const [productsList, costRows, adCostRows, expenseRows] = await Promise.all(
      [
        this.listProducts(context),
        this.listProductCosts(context),
        this.listAdCosts(context),
        this.listManualExpenses(context),
      ],
    );

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
    const scopedContext =
      scope.companyId !== null
        ? {
            ...context,
            selectedCompanyId: scope.companyId,
            companyId: scope.companyId,
          }
        : null;
    const [
      productsList,
      costRows,
      adCostRows,
      expenseRows,
      rawProductRows,
      financeSnapshot,
      mercadoLivreSyncStatus,
    ] = await Promise.all([
      this.listProducts(scopedContext ?? context.organizationId),
      this.listProductCosts(scopedContext ?? context.organizationId),
      this.listAdCosts(scopedContext ?? context.organizationId),
      this.listManualExpenses(scopedContext ?? context.organizationId),
      this.db.query.products.findMany({
        orderBy: (table) => [desc(table.createdAt)],
        where: (table) =>
          scopedContext
            ? and(
                eq(table.organizationId, context.organizationId),
                eq(table.companyId, scopedContext.companyId),
              )
            : eq(table.organizationId, context.organizationId),
      }),
      scopedContext
        ? this.financeService.buildFinanceSnapshot(
            context.organizationId,
            scopedContext.companyId,
          )
        : this.financeService.buildFinanceSnapshot(
            context.organizationId,
            context.organizationId,
          ),
      scopedContext
        ? this.syncService.getStatus(
            context.organizationId,
            scopedContext.companyId,
            "mercadolivre",
          )
        : Promise.resolve<SyncStatusResponse>({
            activeRun: null,
            availability: {
              canRun: false,
              currentWindowKey: null,
              currentWindowLabel: null,
              currentWindowSlot: null,
              lastSuccessfulSyncAt: null,
              message: "Selected company required.",
              nextAvailableAt: null,
              provider: "mercadolivre",
              reason: "provider_disconnected",
            },
            lastCompletedRun: null,
          }),
    ]);
    const monthlyPerformanceRows =
      await this.readMonthlyPerformanceForAnalytics(context, scope);
    const monthlyPerformanceDisplayRows = monthlyPerformanceRows.map((row) =>
      this.toMonthlyPerformanceDisplayRow(row),
    );
    const enrichedFinanceSnapshot = {
      ...financeSnapshot,
      monthlyPerformance: monthlyPerformanceRows.map((row) =>
        this.toFinancialMonthlyPerformance(
          row,
          rawProductRows,
          scope.taxRateDefault,
        ),
      ),
    };

    const syncedProducts = (
      await Promise.all(
        (["mercadolivre", "shopee"] as const).map((providerSlug) =>
          listSyncedProductsReadModel({
            companyId: scope.companyId ?? undefined,
            db: this.db,
            organizationId: context.organizationId,
            productsList: rawProductRows,
            providerSlug,
          }),
        ),
      )
    ).flat();
    const linkedMarketplaceSignalsByProductId = Object.fromEntries(
      syncedProducts
        .filter((product) => product.linkedProduct?.id)
        .map((product) => [product.linkedProduct!.id, true] as const),
    );
    const channelWhenUnknownByProductId: Record<string, string> = {};
    for (const sp of syncedProducts) {
      if (sp.linkedProduct?.id) {
        channelWhenUnknownByProductId[sp.linkedProduct.id] = sp.provider;
        continue;
      }
      for (const match of sp.suggestedMatches) {
        channelWhenUnknownByProductId[match.productId] = sp.provider;
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
    const catalogProducts = this.buildCatalogProducts(productsList, syncedProducts);
    const performanceRows = this.buildPerformanceRows(
      catalogProducts,
      monthlyPerformanceDisplayRows,
    );
    const catalogStats = this.buildAnalyticsCatalogStats({
      adCostRows,
      expenseRows,
      productRows: productsList,
      syncedProducts,
      costRows,
    });
    const financialState = this.determineAnalyticsFinancialState(
      productRows,
      productsList,
    );

    return {
      adCosts: adCostRows,
      catalogStats,
      dataGaps: this.buildAnalyticsDataGaps(),
      financialState,
      manualExpenses: expenseRows,
      mercadoLivreSyncStatus,
      monthlyPerformanceRows: monthlyPerformanceDisplayRows,
      performanceRows,
      productCosts: costRows,
      productRows,
      products: catalogProducts,
      scope,
      syncedProducts,
    };
  }

  async requireProductAccess(organizationId: string, productId: string) {
    return this.ensureProductAccess(organizationId, productId);
  }

  async assertCatalogImportAllowed(context: TenantContext) {
    await this.resolveSingleActiveCompanyTaxRate(context);
  }

  private buildAnalyticsCatalogStats(input: {
    productRows: ProductListItem[];
    costRows: ProductCostRecord[];
    adCostRows: AdCostRecord[];
    expenseRows: ManualExpenseRecord[];
    syncedProducts: ProductAnalyticsSnapshot["syncedProducts"];
  }): ProductAnalyticsCatalogStats {
    const activeProducts = input.productRows.filter(
      (product) => product.isActive,
    ).length;
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
    const referenceMonth =
      query.referenceMonth ?? getSaoPauloCurrentReferenceMonth();

    if (query.companyId) {
      const company = await this.ensureCompanyAccess(context, query.companyId);

      return {
        companyId: query.companyId,
        companyRequired: false,
        referenceMonth,
        taxRateDefault: String(company.taxRateDefault),
      };
    }

    const companies = await this.db.query.companies.findMany({
      where: (table) =>
        and(
          eq(table.organizationId, context.organizationId),
          eq(table.userId, context.userId),
        ),
    });
    const activeCompanyCount = companies.filter(
      (company) => company.isActive,
    ).length;
    const selectedCompany =
      (context.selectedCompanyId
        ? companies.find(
            (company) =>
              company.id === context.selectedCompanyId && company.isActive,
          )
        : null) ??
      companies.find((company) => company.isActive);

    return {
      companyId: selectedCompany?.id ?? null,
      companyRequired: activeCompanyCount === 0,
      referenceMonth,
      taxRateDefault: String(selectedCompany?.taxRateDefault ?? "0"),
    };
  }

  private async ensureCompanyAccess(
    context: TenantContext,
    companyId: string,
  ): Promise<Company> {
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
    taxRateDefault: string,
  ): FinancialMonthlyPerformanceInput {
    const matchedProduct =
      (row.productId
        ? productRows.find((product) => product.id === row.productId) ?? null
        : null) ??
      productRows.find(
        (product) =>
          normalizeComparableSku(product.sku) === normalizeComparableSku(row.sku),
      ) ??
      null;

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
      taxRateDefault,
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
      id: row.id,
      marketplaceCommission: (
        Number(row.commissionRate) * Number(row.salePrice)
      ).toFixed(2),
      packagingCost: String(row.packagingCost),
      productId: row.productId,
      productName: row.productName,
      referenceMonth: row.referenceMonth,
      returnsQuantity: row.returnsQuantity,
      salePrice: String(row.salePrice),
      salesQuantity: row.salesQuantity,
      shippingFee: String(row.shippingFee),
      sku: row.sku,
      unitCost: String(row.unitCost),
    };
  }

  private buildPerformanceRows(
    products: ProductListItem[],
    monthlyPerformanceRows: ProductMonthlyPerformanceDisplayRow[],
  ): ProductPerformanceRow[] {
    const monthlyPerformanceByProductId = new Map(
      monthlyPerformanceRows
        .filter((row): row is ProductMonthlyPerformanceDisplayRow & { productId: string } => row.productId !== null)
        .map((row) => [row.productId, row] as const),
    );
    const monthlyPerformanceBySku = new Map(
      monthlyPerformanceRows.map((row) => [row.sku, row] as const),
    );
    const matchedSkus = new Set<string>();
    const matchedPerformanceIds = new Set<string>();
    const rows: ProductPerformanceRow[] = [];
    const productById = new Map<string, ProductListItem>();
    const productBySku = new Map<string, ProductListItem>();

    const registerProduct = (product: ProductListItem) => {
      productById.set(product.id, product);
      if (product.sku) {
        productBySku.set(product.sku, product);
      }
      for (const child of product.children) {
        registerProduct(child);
      }
    };

    for (const product of products) {
      registerProduct(product);
    }

    for (const product of products) {
      if (product.catalogRole === "parent" && product.children.length > 0) {
        const ownRow =
          monthlyPerformanceByProductId.get(product.id) ??
          (product.sku ? monthlyPerformanceBySku.get(product.sku) ?? null : null);
        const childRows = product.children
          .map((child) => {
            const row =
              monthlyPerformanceByProductId.get(child.id) ??
              (child.sku ? monthlyPerformanceBySku.get(child.sku) ?? null : null);
            return row ? this.toPerformanceRow(row, child, []) : null;
          })
          .filter((row): row is ProductPerformanceRow => row !== null);

        if (!ownRow && childRows.length === 0) {
          continue;
        }

        if (ownRow?.sku) {
          matchedSkus.add(ownRow.sku);
          matchedPerformanceIds.add(ownRow.id);
        }
        for (const childRow of childRows) {
          matchedSkus.add(childRow.sku);
          matchedPerformanceIds.add(childRow.id);
        }

        rows.push(this.aggregatePerformanceGroup(product, ownRow, childRows));
        continue;
      }

      const ownRow =
        monthlyPerformanceByProductId.get(product.id) ??
        (product.sku ? monthlyPerformanceBySku.get(product.sku) ?? null : null);
      if (!ownRow) {
        continue;
      }

      matchedSkus.add(ownRow.sku);
      matchedPerformanceIds.add(ownRow.id);
      rows.push(this.toPerformanceRow(ownRow, product, []));
    }

    for (const row of monthlyPerformanceRows) {
      if (matchedPerformanceIds.has(row.id) || matchedSkus.has(row.sku)) {
        continue;
      }

      const product =
        (row.productId ? productById.get(row.productId) ?? null : null) ??
        productBySku.get(row.sku) ??
        null;
      rows.push(this.toPerformanceRow(row, product ?? null, []));
    }

    return rows;
  }

  private toPerformanceRow(
    row: ProductMonthlyPerformanceDisplayRow,
    product: ProductListItem | null,
    children: ProductPerformanceRow[],
  ): ProductPerformanceRow {
    return {
      ...row,
      catalogGroupKey: product?.catalogGroupKey ?? null,
      catalogRole: product?.catalogRole ?? "standalone",
      children,
      parentProductId: product?.parentProductId ?? null,
      productId: row.productId ?? product?.id ?? null,
      variationLabel: product?.variationLabel ?? null,
    };
  }

  private aggregatePerformanceGroup(
    parentProduct: ProductListItem,
    ownRow: ProductMonthlyPerformanceDisplayRow | null,
    childRows: ProductPerformanceRow[],
  ): ProductPerformanceRow {
    const sourceRows = [
      ...(ownRow ? [ownRow] : []),
      ...childRows,
    ];
    const firstRow = ownRow ?? childRows[0];
    const totals = sourceRows.reduce((accumulator, row) => {
      const netSales = resolveNetSales(row);
      accumulator.salesQuantity += row.salesQuantity;
      accumulator.returnsQuantity += row.returnsQuantity;
      accumulator.netSalesTotal += netSales;
      accumulator.revenueTotal += toNumber(row.salePrice) * netSales;
      accumulator.marketplaceCommissionTotal +=
        toNumber(row.marketplaceCommission) * netSales;
      accumulator.shippingFeeTotal += toNumber(row.shippingFee) * netSales;
      accumulator.packagingCostTotal += toNumber(row.packagingCost) * netSales;
      accumulator.unitCostTotal += toNumber(row.unitCost) * netSales;
      accumulator.advertisingCostTotal += toNumber(row.advertisingCost);
      return accumulator;
    }, createEmptyAccumulator());

    const netSalesTotal = totals.netSalesTotal;
    const weightedSalePrice =
      netSalesTotal > 0
        ? totals.revenueTotal / netSalesTotal
        : toNumber(firstRow?.salePrice);
    const weightedMarketplaceCommission =
      netSalesTotal > 0
        ? totals.marketplaceCommissionTotal / netSalesTotal
        : toNumber(firstRow?.marketplaceCommission);
    const weightedShippingFee =
      netSalesTotal > 0
        ? totals.shippingFeeTotal / netSalesTotal
        : toNumber(firstRow?.shippingFee);
    const weightedPackagingCost =
      netSalesTotal > 0
        ? totals.packagingCostTotal / netSalesTotal
        : toNumber(firstRow?.packagingCost);
    const weightedUnitCost =
      netSalesTotal > 0
        ? totals.unitCostTotal / netSalesTotal
        : toNumber(firstRow?.unitCost);
    const commissionRate =
      totals.revenueTotal > 0
        ? totals.marketplaceCommissionTotal / totals.revenueTotal
        : toNumber(firstRow?.commissionRate);

    return {
      advertisingCost: toDecimalString(totals.advertisingCostTotal),
      catalogGroupKey: parentProduct.catalogGroupKey,
      catalogRole: "parent",
      channel: firstRow?.channel ?? "mercadolivre",
      children: childRows,
      commissionRate: toDecimalString(commissionRate, 6),
      id: ownRow?.id ?? `${parentProduct.id}:${firstRow?.referenceMonth ?? "performance"}`,
      marketplaceCommission: toDecimalString(weightedMarketplaceCommission),
      packagingCost: toDecimalString(weightedPackagingCost),
      parentProductId: null,
      productId: parentProduct.id,
      productName: parentProduct.name,
      referenceMonth: firstRow?.referenceMonth ?? getSaoPauloCurrentReferenceMonth(),
      returnsQuantity: totals.returnsQuantity,
      salePrice: toDecimalString(weightedSalePrice),
      salesQuantity: totals.salesQuantity,
      shippingFee: toDecimalString(weightedShippingFee),
      sku: parentProduct.sku ?? firstRow?.sku ?? parentProduct.id,
      unitCost: toDecimalString(weightedUnitCost),
      variationLabel: null,
    };
  }

  private async updateCatalogFinanceForGroup(
    organizationId: string,
    companyId: string | undefined,
    productId: string,
    input: ProductCatalogFinanceUpdateInput,
  ): Promise<ProductListItem> {
    const rawProducts = await this.db.query.products.findMany({
      orderBy: (table) => [desc(table.createdAt)],
      where: (table) =>
        and(
          eq(table.organizationId, organizationId),
          ...(companyId ? [eq(table.companyId, companyId)] : []),
        ),
    });
    const syncedProducts = await listSyncedProductsReadModel({
      db: this.db,
      companyId,
      organizationId,
      productsList: rawProducts,
      providerSlug: "mercadolivre",
    });
    const catalogGroups = this.buildMercadoLivreCatalogGroups(syncedProducts);
    const targetGroup = [...catalogGroups.values()].find(
      (group) =>
        group.parentProductId === productId ||
        group.childProductIds.includes(productId),
    );
    if (!targetGroup) {
      const [existingProduct, existingCost] = await Promise.all([
        this.db.query.products.findFirst({
          where: (table) =>
            and(
              eq(table.id, productId),
              eq(table.organizationId, organizationId),
              ...(companyId ? [eq(table.companyId, companyId)] : []),
            ),
          with: {
            financeDefaults: true,
          },
        }),
        this.db.query.productCosts.findFirst({
          orderBy: (table) => [desc(table.effectiveFrom), desc(table.createdAt)],
          where: (table) =>
            and(
              eq(table.organizationId, organizationId),
              ...(companyId ? [eq(table.companyId, companyId)] : []),
              eq(table.productId, productId),
            ),
        }),
      ]);

      if (!existingProduct) {
        throw new NotFoundException("Product not found.");
      }

      await this.db.transaction(async (tx) => {
        if (existingCost) {
          await tx
            .update(productCosts)
            .set({
              amount: input.unitCost,
              costType: existingCost.costType,
              currency: existingCost.currency,
              effectiveFrom: existingCost.effectiveFrom,
              notes: "Atualizado pelo catálogo",
            })
            .where(
              and(
                eq(productCosts.id, existingCost.id),
                eq(productCosts.organizationId, organizationId),
                ...(companyId ? [eq(productCosts.companyId, companyId)] : []),
              ),
            )
            .returning();
        } else {
          await tx
            .insert(productCosts)
            .values({
              amount: input.unitCost,
              companyId: existingProduct.companyId,
              costType: "base",
              currency: "BRL",
              effectiveFrom: null,
              notes: "Atualizado pelo catálogo",
              organizationId,
              productId,
            })
            .returning();
        }

        if (existingProduct.financeDefaults) {
          await tx
            .update(productFinanceDefaults)
            .set({
              packagingCost: input.packagingCost,
            })
            .where(
              eq(productFinanceDefaults.id, existingProduct.financeDefaults.id),
            )
            .returning();
        } else {
          await tx
            .insert(productFinanceDefaults)
            .values({
              advertisingCost: "0",
              packagingCost: input.packagingCost,
              productId,
            })
            .returning();
        }
      });

      if (companyId) {
        await this.financeService.materializeOrganizationMetrics(
          organizationId,
          companyId,
        );
      }

      return this.getProductListItem(organizationId, productId, companyId);
    }
    const targetProductIds = Array.from(
      new Set([targetGroup.parentProductId, ...targetGroup.childProductIds]),
    );

    const [existingProducts, existingCosts] = await Promise.all([
      this.db.query.products.findMany({
        where: (table) =>
          and(
            eq(table.organizationId, organizationId),
            ...(companyId ? [eq(table.companyId, companyId)] : []),
            inArray(table.id, targetProductIds),
          ),
        with: {
          financeDefaults: true,
        },
      }),
      this.db.query.productCosts.findMany({
        orderBy: (table) => [desc(table.effectiveFrom), desc(table.createdAt)],
        where: (table) =>
          and(
            eq(table.organizationId, organizationId),
            ...(companyId ? [eq(table.companyId, companyId)] : []),
            inArray(table.productId, targetProductIds),
          ),
      }),
    ]);
    const existingProductById = new Map(
      (existingProducts ?? []).map((product) => [product.id, product] as const),
    );
    const existingCostByProductId = new Map<string, ProductCost>();

    for (const cost of existingCosts ?? []) {
      if (!existingCostByProductId.has(cost.productId)) {
        existingCostByProductId.set(cost.productId, cost);
      }
    }

    await this.db.transaction(async (tx) => {
      for (const targetId of targetProductIds) {
        const existingProduct = existingProductById.get(targetId);
        if (!existingProduct) {
          continue;
        }

        const existingCost = existingCostByProductId.get(targetId) ?? null;
        if (existingCost) {
          await tx
            .update(productCosts)
            .set({
              amount: input.unitCost,
              costType: existingCost.costType,
              currency: existingCost.currency,
              effectiveFrom: existingCost.effectiveFrom,
              notes: "Atualizado pelo catálogo",
            })
            .where(
              and(
                eq(productCosts.id, existingCost.id),
                eq(productCosts.organizationId, organizationId),
                ...(companyId ? [eq(productCosts.companyId, companyId)] : []),
              ),
            )
            .returning();
        } else {
          await tx
            .insert(productCosts)
            .values({
              amount: input.unitCost,
              companyId: existingProduct.companyId,
              costType: "base",
              currency: "BRL",
              effectiveFrom: null,
              notes: "Atualizado pelo catálogo",
              organizationId,
              productId: targetId,
            })
            .returning();
        }

        if (existingProduct.financeDefaults) {
          await tx
            .update(productFinanceDefaults)
            .set({
              packagingCost: input.packagingCost,
            })
            .where(
              eq(productFinanceDefaults.id, existingProduct.financeDefaults.id),
            )
            .returning();
        } else {
          await tx
            .insert(productFinanceDefaults)
            .values({
              advertisingCost: "0",
              packagingCost: input.packagingCost,
              productId: targetId,
            })
            .returning();
        }
      }
    });

    if (companyId) {
      await this.financeService.materializeOrganizationMetrics(
        organizationId,
        companyId,
      );
    }

    const updatedProducts = await this.listProducts(
      companyId
        ? {
            organizationId,
            selectedCompanyId: companyId,
            userId: "",
          }
        : organizationId,
    );
    const updatedRawProducts = await this.db.query.products.findMany({
      orderBy: (table) => [desc(table.createdAt)],
      where: (table) =>
        and(
          eq(table.organizationId, organizationId),
          ...(companyId ? [eq(table.companyId, companyId)] : []),
        ),
    });
    const updatedSyncedProducts = await listSyncedProductsReadModel({
      db: this.db,
      companyId,
      organizationId,
      productsList: updatedRawProducts,
      providerSlug: "mercadolivre",
    });
    const groupedProducts = this.buildCatalogProducts(
      updatedProducts,
      updatedSyncedProducts.length > 0 ? updatedSyncedProducts : syncedProducts,
    );
    const result = groupedProducts.find(
      (product) => product.id === (targetGroup?.parentProductId ?? productId),
    );

    if (!result) {
      throw new NotFoundException("Product not found.");
    }

    return result;
  }

  private buildMercadoLivreCatalogGroups(
    syncedProducts: SyncedProductRecord[],
  ): Map<string, MercadoLivreCatalogGroup> {
    const groupedEntries = new Map<
      string,
      Array<{
        externalProductId: string;
        productId: string;
        variationLabel: string | null;
      }>
    >();

    for (const syncedProduct of syncedProducts) {
      const productId = syncedProduct.linkedProduct?.id ?? null;
      if (syncedProduct.provider !== "mercadolivre" || !productId) {
        continue;
      }

      const itemId = extractMercadoLivreItemId(syncedProduct.externalProductId);
      if (!itemId) {
        continue;
      }

      const entries = groupedEntries.get(itemId) ?? [];
      entries.push({
        externalProductId: syncedProduct.externalProductId,
        productId,
        variationLabel: syncedProduct.externalProductId.includes(":")
          ? syncedProduct.title?.trim() || null
          : null,
      });
      groupedEntries.set(itemId, entries);
    }

    const groups = new Map<string, MercadoLivreCatalogGroup>();

    for (const [itemId, entries] of groupedEntries.entries()) {
      const dedupedEntries = entries.filter(
        (entry, index, allEntries) =>
          allEntries.findIndex(
            (candidate) => candidate.productId === entry.productId,
          ) === index,
      );

      if (dedupedEntries.length < 2) {
        continue;
      }

      const explicitParent =
        dedupedEntries.find((entry) => !entry.externalProductId.includes(":")) ??
        dedupedEntries[0];
      const childEntries = dedupedEntries.filter(
        (entry) => entry.productId !== explicitParent!.productId,
      );
      const variationLabelByProductId = new Map<string, string | null>();

      for (const entry of dedupedEntries) {
        variationLabelByProductId.set(entry.productId, entry.variationLabel);
      }

      groups.set(toCatalogGroupKey(itemId), {
        childProductIds: childEntries.map((entry) => entry.productId),
        groupKey: toCatalogGroupKey(itemId),
        parentProductId: explicitParent!.productId,
        variationLabelByProductId,
      });
    }

    return groups;
  }

  private toCatalogProductListItem(input: {
    base: ProductListItem;
    catalogGroupKey?: string | null;
    catalogRole: ProductListItem["catalogRole"];
    children?: ProductListItem[];
    derivedFromProvider?: ProductListItem["derivedFromProvider"];
    parentProductId?: string | null;
    variationLabel?: string | null;
  }): ProductListItem {
    return {
      ...input.base,
      catalogGroupKey: input.catalogGroupKey ?? null,
      catalogRole: input.catalogRole,
      children: input.children ?? [],
      derivedFromProvider: input.derivedFromProvider ?? null,
      parentProductId:
        input.parentProductId === undefined ? null : input.parentProductId,
      variationLabel:
        input.variationLabel === undefined ? null : input.variationLabel,
    };
  }

  private buildCatalogProducts(
    productsList: ProductListItem[],
    syncedProducts: SyncedProductRecord[],
  ): ProductListItem[] {
    const groups = this.buildMercadoLivreCatalogGroups(syncedProducts);
    const parentGroupByProductId = new Map<string, MercadoLivreCatalogGroup>();
    const groupedProductIds = new Set<string>();

    for (const group of groups.values()) {
      parentGroupByProductId.set(group.parentProductId, group);
      for (const childProductId of group.childProductIds) {
        groupedProductIds.add(childProductId);
      }
    }

    const productById = new Map(
      productsList.map((product) => [product.id, product] as const),
    );

    return productsList.flatMap((product) => {
      const group = parentGroupByProductId.get(product.id);

      if (group) {
        const children = group.childProductIds
          .map((childProductId) => productById.get(childProductId) ?? null)
          .filter((childProduct): childProduct is ProductListItem => childProduct !== null)
          .map((childProduct) =>
            this.toCatalogProductListItem({
              base: childProduct,
              catalogGroupKey: group.groupKey,
              catalogRole: "child",
              children: [],
              derivedFromProvider: "mercadolivre",
              parentProductId: group.parentProductId,
              variationLabel:
                group.variationLabelByProductId.get(childProduct.id) ?? null,
            }),
          );

        return [
          this.toCatalogProductListItem({
            base: product,
            catalogGroupKey: group.groupKey,
            catalogRole: "parent",
            children,
            derivedFromProvider: "mercadolivre",
            parentProductId: null,
            variationLabel: null,
          }),
        ];
      }

      if (groupedProductIds.has(product.id)) {
        return [];
      }

      return [
        this.toCatalogProductListItem({
          base: product,
          catalogRole: "standalone",
          children: [],
          derivedFromProvider: product.derivedFromProvider,
        }),
      ];
    });
  }

  private async ensureProductAccess(
    organizationId: string,
    productId: string,
    companyId?: string,
  ) {
    const product = await this.db.query.products.findFirst({
      where: (table) => eq(table.id, productId),
    });

    if (!product) {
      throw new NotFoundException("Product not found.");
    }

    if (
      product.organizationId !== organizationId ||
      (companyId && product.companyId !== companyId)
    ) {
      throw new ForbiddenException(
        "You cannot access products from another organization.",
      );
    }

    return product;
  }

  private async ensureProductCostAccess(
    organizationId: string,
    costId: string,
    companyId?: string,
  ) {
    const cost = await this.db.query.productCosts.findFirst({
      where: (table) => eq(table.id, costId),
    });

    if (!cost) {
      throw new NotFoundException("Product cost not found.");
    }

    if (
      cost.organizationId !== organizationId ||
      (companyId && cost.companyId !== companyId)
    ) {
      throw new ForbiddenException(
        "You cannot access product costs from another organization.",
      );
    }

    return cost;
  }

  private async ensureAdCostAccess(
    organizationId: string,
    adCostId: string,
    companyId?: string,
  ) {
    const adCost = await this.db.query.adCosts.findFirst({
      where: (table) => eq(table.id, adCostId),
    });

    if (!adCost) {
      throw new NotFoundException("Ad cost not found.");
    }

    if (
      adCost.organizationId !== organizationId ||
      (companyId && adCost.companyId !== companyId)
    ) {
      throw new ForbiddenException(
        "You cannot access ad costs from another organization.",
      );
    }

    return adCost;
  }

  private async ensureManualExpenseAccess(
    organizationId: string,
    expenseId: string,
    companyId?: string,
  ) {
    const expense = await this.db.query.manualExpenses.findFirst({
      where: (table) => eq(table.id, expenseId),
    });

    if (!expense) {
      throw new NotFoundException("Manual expense not found.");
    }

    if (
      expense.organizationId !== organizationId ||
      (companyId && expense.companyId !== companyId)
    ) {
      throw new ForbiddenException(
        "You cannot access expenses from another organization.",
      );
    }

    return expense;
  }

  private async getProductListItem(
    organizationId: string,
    productId: string,
    companyId?: string,
  ): Promise<ProductListItem> {
    const [productRow, productCostRows, externalProductRows] = await Promise.all([
      this.db.query.products.findFirst({
        where: (table) =>
          and(
            eq(table.id, productId),
            eq(table.organizationId, organizationId),
            ...(companyId ? [eq(table.companyId, companyId)] : []),
          ),
        with: {
          financeDefaults: true,
          images: {
            orderBy: (table) => [table.position],
          },
        },
      }),
      this.db.query.productCosts.findMany({
        orderBy: (table) => [desc(table.effectiveFrom), desc(table.createdAt)],
        where: (table) =>
          and(
            eq(table.organizationId, organizationId),
            ...(companyId ? [eq(table.companyId, companyId)] : []),
            eq(table.productId, productId),
          ),
      }),
      this.db.query.externalProducts.findMany({
        where: (table) =>
          and(
            eq(table.organizationId, organizationId),
            ...(companyId ? [eq(table.companyId, companyId)] : []),
            eq(table.linkedProductId, productId),
          ),
      }),
    ]);

    if (!productRow) {
      throw new NotFoundException("Product not found.");
    }

    const derivedFromProvider =
      externalProductRows.length > 0
        ? (externalProductRows[0].provider as "mercadolivre")
        : null;

    return {
      catalogGroupKey: null,
      catalogRole: "standalone",
      children: [],
      ...this.toProductRecord(productRow, productRow.images),
      derivedFromProvider,
      latestCost:
        productCostRows.length > 0
          ? this.toProductCostRecord(productCostRows[0]!)
          : null,
      financeDefaults: productRow.financeDefaults
        ? this.toProductFinanceDefaultsRecord(productRow.financeDefaults)
        : null,
      parentProductId: null,
      variationLabel: null,
    };
  }

  private toProductRecord(
    row: Product,
    imageRows: ProductImage[] = [],
  ): ProductRecord {
    const images = imageRows
      .slice()
      .sort((left, right) => left.position - right.position)
      .map((image) => ({
        externalIdentifier: image.externalIdentifier,
        id: image.id,
        position: image.position,
        productId: image.productId,
        source: image.source,
        url: image.url,
      }));

    return {
      coverImageUrl: images[0]?.url ?? null,
      createdAt: row.createdAt.toISOString(),
      id: row.id,
      images,
      companyId: row.companyId,
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
      companyId: row.companyId,
      id: row.id,
      notes: row.notes,
      organizationId: row.organizationId,
      productId: row.productId,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toProductFinanceDefaultsRecord(row: ProductFinanceDefaults) {
    return {
      advertisingCost: String(row.advertisingCost),
      createdAt: row.createdAt.toISOString(),
      id: row.id,
      packagingCost: String(row.packagingCost),
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
      companyId: row.companyId,
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
      companyId: row.companyId,
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
