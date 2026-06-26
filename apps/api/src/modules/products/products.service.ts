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
import { read, utils, write } from "xlsx";
import type {
  ProductCatalogExportQueryInput,
  ProductCatalogFinanceUpdateInput,
  ProductSpreadsheetUpdateRowInput,
} from "@lucreii/validation";
import {
  productCatalogExportQuerySchema,
  productImportRowSchema,
  productSpreadsheetUpdateRowSchema,
} from "@lucreii/validation";
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
  ProductSpreadsheetImportResult,
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

type ProductCatalogExportRow = {
  ID: string;
  CANAL: string;
  PRODUTO: string;
  SKU: string;
  PDV: number;
  "CUSTO UNITÁRIO": number | "";
  EMBALAGEM: number | "";
  STATUS: "Ativo" | "Arquivado";
  "CRIADO EM": string;
};

type FlattenedCatalogExportProduct = {
  exportName: string;
  product: ProductListItem;
};

type PerformanceCatalogLookup = {
  byId: Map<string, ProductListItem>;
  bySku: Map<string, ProductListItem>;
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
  parentProductId: string | null;
  parentSku: string | null;
  parentSyntheticId: string | null;
  parentTitle: string | null;
  representativeProductId: string | null;
  variationLabelByProductId: Map<string, string | null>;
};

type WeightedPerformanceAccumulator = {
  advertisingCostTotal: number;
  fixedFeeTotal: number;
  marketplaceCommissionTotal: number;
  netSalesTotal: number;
  packagingCostTotal: number;
  returnsQuantity: number;
  revenueTotal: number;
  salesQuantity: number;
  shippingFeeTotal: number;
  shippingOrFixedFeeTotal: number;
  unitCostTotal: number;
};

type CompositionFeeSource = "shipping" | "fixed_fee" | "none";

type ProductCompositionUnits = {
  fixedFeeUnit: string;
  marketplaceCommissionUnit: string;
  shippingOrFixedFeeSource: CompositionFeeSource;
  shippingOrFixedFeeUnit: string;
  shippingUnit: string;
};

type SyncedProductUnitCompositionLookup = {
  byProductId: Map<string, ProductCompositionUnits>;
  bySku: Map<string, ProductCompositionUnits>;
};

function toCatalogGroupKey(itemId: string) {
  return `mercadolivre:${itemId}`;
}

function buildSyntheticCatalogParentId(groupKey: string) {
  return `synthetic-parent:${groupKey}`;
}

function extractMercadoLivreItemId(externalProductId: string) {
  const [itemId] = externalProductId.split(":");
  return itemId?.trim() ? itemId.trim() : null;
}

function readMercadoLivreSyncMetadata(
  syncedProduct: Pick<SyncedProductRecord, "metadata">,
): {
  itemId: string | null;
  variationId: string | null;
} {
  const metadata = syncedProduct.metadata;
  if (!metadata || typeof metadata !== "object") {
    return {
      itemId: null,
      variationId: null,
    };
  }

  const itemId =
    "itemId" in metadata && typeof metadata.itemId === "string" && metadata.itemId.trim().length > 0
      ? metadata.itemId.trim()
      : null;
  const variationId =
    "variationId" in metadata &&
    typeof metadata.variationId === "string" &&
    metadata.variationId.trim().length > 0
      ? metadata.variationId.trim()
      : null;

  return {
    itemId,
    variationId,
  };
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

function formatCatalogSpreadsheetDate(dateIso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date(dateIso));
}

function toCatalogChannelLabel(provider: string | null) {
  if (provider === "mercadolivre") {
    return "MELI";
  }

  if (provider === "shopee") {
    return "Shopee";
  }

  if (provider === "shein") {
    return "Shein";
  }

  return "Manual";
}

const SPREADSHEET_FIELD_LABELS: Record<string, string> = {
  EMBALAGEM: "Embalagem",
  ID: "ID",
  "CUSTO UNITÁRIO": "Custo unitário",
  "PREÇO DE VENDA": "Preço de venda",
  PRODUTO: "Produto",
  SKU: "SKU",
  STATUS: "Status",
};

function formatSpreadsheetRawValue(value: unknown): string {
  if (value === undefined || value === null) {
    return "vazio";
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length === 0 ? "vazio" : `"${trimmed}"`;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return `"${String(value)}"`;
}

function formatSpreadsheetIssueMessage(
  fieldName: string,
  issue: { code: string; message: string },
  rawValue: unknown,
) {
  const label = SPREADSHEET_FIELD_LABELS[fieldName] ?? fieldName;
  const valueLabel = formatSpreadsheetRawValue(rawValue);

  if (issue.code === "invalid_type" && fieldName === "STATUS") {
    return `${label}: o valor ${valueLabel} deve ser 0 (inativo) ou 1 (ativo).`;
  }

  if (issue.code === "invalid_type" && fieldName === "ID") {
    return `${label}: informe um identificador válido.`;
  }

  if (issue.code === "invalid_type" && (fieldName === "SKU" || fieldName === "PRODUTO")) {
    return `${label}: campo obrigatório.`;
  }

  if (
    issue.code === "invalid_type" ||
    issue.message.toLowerCase().includes("número válido")
  ) {
    return `${label}: o valor ${valueLabel} não é um número válido. Use ponto como separador decimal (ex.: 12.50).`;
  }

  if (issue.message.toLowerCase().includes("maior ou igual a zero")) {
    if (fieldName === "STATUS") {
      return `${label}: o valor ${valueLabel} deve ser 0 (inativo) ou 1 (ativo).`;
    }
    return `${label}: o valor ${valueLabel} deve ser maior ou igual a zero.`;
  }

  if (fieldName === "ID" && issue.message.toLowerCase().includes("identificador")) {
    return `${label}: o valor ${valueLabel} não é um identificador válido.`;
  }

  if (fieldName === "STATUS") {
    return `${label}: o valor ${valueLabel} deve ser 0 (inativo) ou 1 (ativo).`;
  }

  if (issue.code === "too_small" || issue.code === "too_big") {
    return `${label}: ${issue.message}`;
  }

  return `${label}: valor ${valueLabel} é inválido (${issue.message}).`;
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
    fixedFeeTotal: 0,
    marketplaceCommissionTotal: 0,
    netSalesTotal: 0,
    packagingCostTotal: 0,
    returnsQuantity: 0,
    revenueTotal: 0,
    salesQuantity: 0,
    shippingFeeTotal: 0,
    shippingOrFixedFeeTotal: 0,
    unitCostTotal: 0,
  };
}

function buildMercadoLivreFallbackSku(input: {
  externalProductId: string;
  metadata: SyncedProductRecord["metadata"];
}) {
  const metadata = readMercadoLivreSyncMetadata({ metadata: input.metadata });
  const itemId = metadata.itemId ?? extractMercadoLivreItemId(input.externalProductId);

  if (!itemId) {
    return null;
  }

  return metadata.variationId ? `ML-${itemId}-${metadata.variationId}` : `ML-${itemId}`;
}

function toResolvedShippingOrFixedFee(
  shippingUnit: number,
  fixedFeeUnit: number,
): {
  source: CompositionFeeSource;
  value: number;
} {
  if (shippingUnit > 0) {
    return {
      source: "shipping",
      value: shippingUnit,
    };
  }

  if (fixedFeeUnit > 0) {
    return {
      source: "fixed_fee",
      value: fixedFeeUnit,
    };
  }

  return {
    source: "none",
    value: 0,
  };
}

function buildSyncedProductUnitCompositionLookup(
  syncedProducts: SyncedProductRecord[],
): SyncedProductUnitCompositionLookup {
  const byProductId = new Map<string, ProductCompositionUnits>();
  const bySku = new Map<string, ProductCompositionUnits>();

  for (const syncedProduct of syncedProducts) {
    if (syncedProduct.provider !== "mercadolivre") {
      continue;
    }

    const unitsSold = Math.max(0, syncedProduct.unitsSold);
    const marketplaceCommissionUnit =
      unitsSold > 0 ? toNumber(syncedProduct.marketplaceCommission) / unitsSold : 0;
    const fixedFeeUnit =
      unitsSold > 0 ? toNumber(syncedProduct.fixedFee) / unitsSold : 0;
    const shippingUnit =
      unitsSold > 0 ? toNumber(syncedProduct.shippingCost) / unitsSold : 0;
    const resolvedShippingOrFixedFee = toResolvedShippingOrFixedFee(
      shippingUnit,
      fixedFeeUnit,
    );
    const compositionUnits: ProductCompositionUnits = {
      fixedFeeUnit: toDecimalString(fixedFeeUnit),
      marketplaceCommissionUnit: toDecimalString(marketplaceCommissionUnit),
      shippingOrFixedFeeSource: resolvedShippingOrFixedFee.source,
      shippingOrFixedFeeUnit: toDecimalString(resolvedShippingOrFixedFee.value),
      shippingUnit: toDecimalString(shippingUnit),
    };

    if (syncedProduct.linkedProduct?.id) {
      byProductId.set(syncedProduct.linkedProduct.id, compositionUnits);
    }

    const normalizedSku = normalizeComparableSku(syncedProduct.sku);
    if (normalizedSku) {
      bySku.set(normalizedSku, compositionUnits);
    }

    const normalizedFallbackSku = normalizeComparableSku(
      buildMercadoLivreFallbackSku({
        externalProductId: syncedProduct.externalProductId,
        metadata: syncedProduct.metadata,
      }),
    );
    if (normalizedFallbackSku) {
      bySku.set(normalizedFallbackSku, compositionUnits);
    }
  }

  return {
    byProductId,
    bySku,
  };
}

function buildPerformanceCatalogLookup(
  productsList: ProductListItem[],
): PerformanceCatalogLookup {
  const byId = new Map<string, ProductListItem>();
  const bySku = new Map<string, ProductListItem>();

  for (const product of productsList) {
    byId.set(product.id, product);
    const normalizedSku = normalizeComparableSku(product.sku);
    if (normalizedSku) {
      bySku.set(normalizedSku, product);
    }
  }

  return { byId, bySku };
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
      isSyntheticParent: false,
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

  async exportProductsSpreadsheet(
    context: TenantContext,
    filters: ProductCatalogExportQueryInput = {},
  ): Promise<Buffer> {
    const scopedContext = await this.requireScopedCompanyContext(context);
    const normalizedFilters = productCatalogExportQuerySchema.parse(filters);
    const productsList = await this.listProducts(scopedContext);
    const syncedProducts = await listSyncedProductsReadModel({
      companyId: scopedContext.companyId,
      db: this.db,
      organizationId: scopedContext.organizationId,
      productsList: productsList.map((product) => ({
        companyId: product.companyId,
        createdAt: new Date(product.createdAt),
        id: product.id,
        isActive: product.isActive,
        name: product.name,
        organizationId: product.organizationId,
        sellingPrice: product.sellingPrice,
        sku: product.sku,
        updatedAt: new Date(product.updatedAt),
      })),
      providerSlug: "mercadolivre",
    });
    const groupedProducts = this.buildCatalogProducts(productsList, syncedProducts);
    const flattenedProducts = this.flattenCatalogProductsForExport(
      groupedProducts,
    );
    const search = normalizedFilters.search?.toLowerCase().trim() ?? "";
    const marketplaces = normalizedFilters.marketplaces ?? [];

    const rows = flattenedProducts
      .filter(({ exportName, product }) => { 
        if (search.length > 0) {
          const matchesSearch =
            exportName.toLowerCase().includes(search) ||
            (product.sku?.toLowerCase().includes(search) ?? false);

          if (!matchesSearch) {
            return false;
          }
        }

        if (marketplaces.length > 0) {
          return marketplaces.includes(
            (product.derivedFromProvider ?? "") as
              | "mercadolivre"
              | "shopee"
              | "shein",
          );
        }

        return true;
      })
      .map((entry) => this.toProductCatalogExportRow(entry));

    const workbook = utils.book_new();
    const worksheet = utils.json_to_sheet(rows);
    utils.book_append_sheet(workbook, worksheet, "Catalogo");

    return Buffer.from(
      write(workbook, { bookType: "xlsx", type: "buffer" }),
    );
  }

  async importProducts(
    context: TenantContext,
    fileBuffer: Buffer,
  ): Promise<ProductSpreadsheetImportResult> {
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

    const normalizedRows = rawRows.map((row) => {
      const normalized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(row)) {
        normalized[key.trim().toUpperCase()] = value;
      }
      return normalized;
    });

    if ("ID" in (normalizedRows[0] ?? {})) {
      return this.importProductSpreadsheetUpdates(scopedContext, normalizedRows);
    }

    return this.importNewProductsFromSpreadsheet(scopedContext, normalizedRows);
  }

  private toProductCatalogExportRow(
    input: FlattenedCatalogExportProduct,
  ): ProductCatalogExportRow {
    const { exportName, product } = input;
    return {
      ID: product.id,
      CANAL: toCatalogChannelLabel(product.derivedFromProvider),
      PRODUTO: exportName,
      SKU: product.sku ?? "",
      PDV: Number(product.sellingPrice),
      "CUSTO UNITÁRIO": product.latestCost
        ? Number(product.latestCost.amount)
        : "",
      EMBALAGEM: product.financeDefaults
        ? Number(product.financeDefaults.packagingCost)
        : "",
      STATUS: product.isActive ? "Ativo" : "Arquivado",
      "CRIADO EM": formatCatalogSpreadsheetDate(product.createdAt),
    };
  }

  private flattenCatalogProductsForExport(
    products: ProductListItem[],
  ): FlattenedCatalogExportProduct[] {
    return products.flatMap((product) => {
      const rows: FlattenedCatalogExportProduct[] = [
        {
          exportName: product.name,
          product,
        },
      ];

      if (product.catalogRole === "parent" && product.children.length > 0) {
        for (const child of product.children) {
          rows.push({
            exportName: child.variationLabel
              ? `${product.name} | ${child.variationLabel}`
              : child.name,
            product: child,
          });
        }
      }

      return rows;
    });
  }

  private async importNewProductsFromSpreadsheet(
    scopedContext: Awaited<ReturnType<ProductsService["requireScopedCompanyContext"]>>,
    normalizedRows: Record<string, unknown>[],
  ): Promise<ProductSpreadsheetImportResult> {
    const requiredColumns = [
      "PRODUTO",
      "SKU",
      "PREÇO DE VENDA",
      "CUSTO UNITÁRIO",
      "EMBALAGEM",
      "STATUS",
    ];
    const missingColumns = requiredColumns.filter(
      (col) => !(col in normalizedRows[0]!),
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
      const rawRow = normalizedRows[i];
      const parsed = productImportRowSchema.safeParse(rawRow);

      if (!parsed.success) {
        const firstIssue = parsed.error.issues[0];
        const fieldName = firstIssue?.path.join(".") ?? "";
        const rawValue = fieldName ? rawRow?.[fieldName] : undefined;
        errors.push({
          row: rowNumber,
          message: firstIssue
            ? formatSpreadsheetIssueMessage(fieldName, firstIssue, rawValue)
            : "Dados inválidos na linha.",
        });
        continue;
      }

      const data = parsed.data;
      const normalizedSku = normalizeComparableSku(data.SKU);

      if (!normalizedSku) {
        errors.push({
          row: rowNumber,
          message: "SKU inválido",
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

    return {
      created: validRows.length,
      errors,
      imported: validRows.length,
      updated: 0,
    };
  }

  private async importProductSpreadsheetUpdates(
    scopedContext: Awaited<ReturnType<ProductsService["requireScopedCompanyContext"]>>,
    normalizedRows: Record<string, unknown>[],
  ): Promise<ProductSpreadsheetImportResult> {
    const requiredColumns = ["ID", "CUSTO UNITÁRIO", "EMBALAGEM"];
    const missingColumns = requiredColumns.filter(
      (col) => !(col in normalizedRows[0]!),
    );
    if (missingColumns.length > 0) {
      throw new BadRequestException(
        `Colunas obrigatórias não encontradas: ${missingColumns.join(", ")}`,
      );
    }

    const errors: Array<{ row: number; message: string }> = [];
    let updated = 0;

    for (let i = 0; i < normalizedRows.length; i++) {
      const rowNumber = i + 2;
      const rawRow = normalizedRows[i];
      const parsed = productSpreadsheetUpdateRowSchema.safeParse(rawRow);

      if (!parsed.success) {
        const firstIssue = parsed.error.issues[0];
        const fieldName = firstIssue?.path.join(".") ?? "";
        const rawValue = fieldName ? rawRow?.[fieldName] : undefined;
        errors.push({
          row: rowNumber,
          message: firstIssue
            ? formatSpreadsheetIssueMessage(fieldName, firstIssue, rawValue)
            : "Dados inválidos na linha.",
        });
        continue;
      }

      const data = parsed.data;

      if (
        data["CUSTO UNITÁRIO"] === undefined &&
        data.EMBALAGEM === undefined
      ) {
        errors.push({
          row: rowNumber,
          message: "Informe ao menos CUSTO UNITÁRIO ou EMBALAGEM.",
        });
        continue;
      }

      try {
        const changed = await this.updateSpreadsheetCatalogFinanceById(
          scopedContext.organizationId,
          scopedContext.companyId,
          data,
        );

        if (changed) {
          updated += 1;
        }
      } catch (error) {
        if (error instanceof NotFoundException) {
          errors.push({
            row: rowNumber,
            message: "Produto da planilha nao encontrado no catalogo.",
          });
          continue;
        }

        throw error;
      }
    }

    if (updated > 0) {
      await this.financeService.materializeOrganizationMetrics(
        scopedContext.organizationId,
        scopedContext.companyId,
      );
    }

    return {
      created: 0,
      errors,
      imported: updated,
      updated,
    };
  }

  private async updateSpreadsheetCatalogFinanceById(
    organizationId: string,
    companyId: string,
    input: ProductSpreadsheetUpdateRowInput,
  ): Promise<boolean> {
    const [productRow, existingCost] = await Promise.all([
      this.db.query.products.findFirst({
        where: (table) =>
          and(
            eq(table.id, input.ID),
            eq(table.organizationId, organizationId),
            eq(table.companyId, companyId),
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
            eq(table.companyId, companyId),
            eq(table.productId, input.ID),
          ),
      }),
    ]);

    if (!productRow) {
      throw new NotFoundException("Product not found.");
    }

    await this.db.transaction(async (tx) => {
      if (input["CUSTO UNITÁRIO"] !== undefined) {
        const nextUnitCost = Number(input["CUSTO UNITÁRIO"]).toFixed(2);

        if (existingCost) {
          await tx
            .update(productCosts)
            .set({
              amount: nextUnitCost,
              notes: "Atualizado via planilha",
            })
            .where(
              and(
                eq(productCosts.id, existingCost.id),
                eq(productCosts.organizationId, organizationId),
                eq(productCosts.companyId, companyId),
              ),
            )
            .returning();
        } else {
          await tx
            .insert(productCosts)
            .values({
              amount: nextUnitCost,
              companyId,
              costType: "base",
              currency: "BRL",
              effectiveFrom: null,
              notes: "Atualizado via planilha",
              organizationId,
              productId: input.ID,
            })
            .returning();
        }
      }

      if (input.EMBALAGEM !== undefined) {
        const nextPackagingCost = Number(input.EMBALAGEM).toFixed(2);

        if (productRow.financeDefaults) {
          await tx
            .update(productFinanceDefaults)
            .set({
              packagingCost: nextPackagingCost,
            })
            .where(eq(productFinanceDefaults.id, productRow.financeDefaults.id))
            .returning();
        } else {
          await tx
            .insert(productFinanceDefaults)
            .values({
              advertisingCost: "0",
              packagingCost: nextPackagingCost,
              productId: input.ID,
            })
            .returning();
        }
      }
    });

    return true;
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

    const productsList = await this.db.query.products.findMany({
      where: (table) =>
        and(
          eq(table.organizationId, organizationId),
          ...(scopedContext ? [eq(table.companyId, scopedContext.companyId)] : []),
        ),
    });
    const syncedProducts = await listSyncedProductsReadModel({
      companyId: scopedContext?.companyId,
      db: this.db,
      organizationId,
      productsList,
      providerSlug: "mercadolivre",
    });
    const catalogGroups = this.buildMercadoLivreCatalogGroups(syncedProducts);
    const targetGroup = [...catalogGroups.values()].find(
      (group) => group.parentProductId === productId,
    );
    const targetProductIds = Array.from(
      new Set(
        targetGroup
          ? [targetGroup.parentProductId, ...targetGroup.childProductIds]
          : [productId],
      ),
    ).filter((targetId): targetId is string => targetId !== null);

    await this.db.transaction(async (tx) => {
      for (const targetId of targetProductIds) {
        await tx
          .delete(products)
          .where(
            and(
              eq(products.id, targetId),
              eq(products.organizationId, organizationId),
              ...(scopedContext ? [eq(products.companyId, scopedContext.companyId)] : []),
            ),
          );
      }
    });

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
    const performanceCatalogLookup = buildPerformanceCatalogLookup(productsList);
    const syncedProducts = (
      await Promise.all(
        (["mercadolivre", "shopee", "shein"] as const).map((providerSlug) =>
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
    const syncedProductUnitLookup =
      buildSyncedProductUnitCompositionLookup(syncedProducts);
    const monthlyPerformanceDisplayRows = monthlyPerformanceRows.map((row) =>
      this.toMonthlyPerformanceDisplayRow(
        row,
        performanceCatalogLookup,
        syncedProductUnitLookup,
      ),
    );
    const enrichedFinanceSnapshot = {
      ...financeSnapshot,
      monthlyPerformance: monthlyPerformanceRows.map((row) =>
        this.toFinancialMonthlyPerformance(
          row,
          performanceCatalogLookup,
          scope.taxRateDefault,
        ),
      ),
    };
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
    const realProducts = input.productRows.filter((product) => !product.isSyntheticParent);
    const activeProducts = realProducts.filter(
      (product) => product.isActive,
    ).length;
    const productsWithCost = realProducts.filter(
      (product) => product.isActive && product.latestCost !== null,
    ).length;
    const pendingSyncProducts = input.syncedProducts.filter(
      (product) => product.reviewStatus === "unreviewed",
    ).length;

    return {
      activeProducts,
      archivedProducts: realProducts.length - activeProducts,
      pendingSyncProducts,
      productsWithCost,
      productsWithoutCost: activeProducts - productsWithCost,
      syncedProductsTotal: input.syncedProducts.length,
      totalAdCosts: input.adCostRows.length,
      totalManualExpenses: input.expenseRows.length,
      totalProductCosts: input.costRows.length,
      totalProducts: realProducts.length,
    };
  }

  private determineAnalyticsFinancialState(
    productRows: ProductAnalyticsSnapshot["productRows"],
    productsList: ProductListItem[],
  ): ProductAnalyticsSnapshot["financialState"] {
    const realProducts = productsList.filter((product) => !product.isSyntheticParent);

    if (realProducts.length === 0) {
      return "empty";
    }

    const activeProducts = realProducts.filter((product) => product.isActive);

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
    catalogLookup: PerformanceCatalogLookup,
    taxRateDefault: string,
  ): FinancialMonthlyPerformanceInput {
    const resolvedRow = this.resolveMonthlyPerformanceCatalogFinance(
      row,
      catalogLookup,
    );

    return {
      advertisingCost: resolvedRow.advertisingCost,
      channel: resolvedRow.channel,
      commissionRate: resolvedRow.commissionRate,
      id: resolvedRow.id,
      packagingCost: resolvedRow.packagingCost,
      productId: resolvedRow.productId,
      returnsQuantity: resolvedRow.returnsQuantity,
      salePrice: resolvedRow.salePrice,
      salesQuantity: resolvedRow.salesQuantity,
      shippingFee: resolvedRow.shippingFee,
      sku: resolvedRow.sku,
      taxRateDefault,
      unitCost: resolvedRow.unitCost,
    };
  }

  private toMonthlyPerformanceDisplayRow(
    row: ProductMonthlyPerformance,
    catalogLookup: PerformanceCatalogLookup,
    syncedProductUnitLookup: SyncedProductUnitCompositionLookup,
  ): ProductMonthlyPerformanceDisplayRow {
    const resolvedRow = this.resolveMonthlyPerformanceCatalogFinance(
      row,
      catalogLookup,
    );
    const compositionUnits = this.resolveCompositionUnits(
      resolvedRow,
      syncedProductUnitLookup,
    );

    return {
      advertisingCost: resolvedRow.advertisingCost,
      channel: resolvedRow.channel,
      commissionRate: resolvedRow.commissionRate,
      fixedFeeUnit: compositionUnits.fixedFeeUnit,
      id: resolvedRow.id,
      marketplaceCommission: (
        Number(resolvedRow.commissionRate) * Number(resolvedRow.salePrice)
      ).toFixed(2),
      marketplaceCommissionUnit: compositionUnits.marketplaceCommissionUnit,
      packagingCost: resolvedRow.packagingCost,
      productId: resolvedRow.productId,
      productName: resolvedRow.productName,
      referenceMonth: resolvedRow.referenceMonth,
      returnsQuantity: resolvedRow.returnsQuantity,
      salePrice: resolvedRow.salePrice,
      salesQuantity: resolvedRow.salesQuantity,
      shippingFee: resolvedRow.shippingFee,
      shippingOrFixedFeeSource: compositionUnits.shippingOrFixedFeeSource,
      shippingOrFixedFeeUnit: compositionUnits.shippingOrFixedFeeUnit,
      shippingUnit: compositionUnits.shippingUnit,
      sku: resolvedRow.sku,
      unitCost: resolvedRow.unitCost,
    };
  }

  private resolveMonthlyPerformanceCatalogFinance(
    row: ProductMonthlyPerformance,
    catalogLookup: PerformanceCatalogLookup,
  ) {
    const normalizedSku = normalizeComparableSku(row.sku);
    const matchedProduct =
      (row.productId ? catalogLookup.byId.get(row.productId) ?? null : null) ??
      (normalizedSku ? catalogLookup.bySku.get(normalizedSku) ?? null : null);

    return {
      advertisingCost: String(row.advertisingCost),
      channel: row.channel,
      commissionRate: String(row.commissionRate),
      id: row.id,
      packagingCost:
        matchedProduct?.financeDefaults?.packagingCost ?? String(row.packagingCost),
      productId: row.productId ?? matchedProduct?.id ?? null,
      productName: row.productName,
      referenceMonth: row.referenceMonth,
      returnsQuantity: row.returnsQuantity,
      salePrice: String(row.salePrice),
      salesQuantity: row.salesQuantity,
      shippingFee: String(row.shippingFee),
      sku: row.sku,
      unitCost: matchedProduct?.latestCost?.amount ?? String(row.unitCost),
    };
  }

  private resolveCompositionUnits(
    row: Pick<
      ProductMonthlyPerformanceDisplayRow,
      | "channel"
      | "commissionRate"
      | "marketplaceCommission"
      | "productId"
      | "returnsQuantity"
      | "salePrice"
      | "salesQuantity"
      | "shippingFee"
      | "sku"
    >,
    syncedProductUnitLookup: SyncedProductUnitCompositionLookup,
  ): ProductCompositionUnits {
    const normalizedChannel = row.channel.trim().toLowerCase();
    const netSales = resolveNetSales(row);
    const syncedUnits =
      (row.productId ? syncedProductUnitLookup.byProductId.get(row.productId) ?? null : null) ??
      (normalizeComparableSku(row.sku)
        ? syncedProductUnitLookup.bySku.get(normalizeComparableSku(row.sku)!) ?? null
        : null);

    const fallbackCommissionUnit =
      toNumber(row.marketplaceCommission) > 0
        ? toNumber(row.marketplaceCommission)
        : toNumber(row.commissionRate) * toNumber(row.salePrice);
    const marketplaceCommissionUnit =
      normalizedChannel === "mercadolivre"
        ? syncedUnits && toNumber(syncedUnits.marketplaceCommissionUnit) > 0
          ? toNumber(syncedUnits.marketplaceCommissionUnit)
          : fallbackCommissionUnit
        : fallbackCommissionUnit;
    const shippingUnit =
      toNumber(row.shippingFee) > 0
        ? toNumber(row.shippingFee)
        : syncedUnits
          ? toNumber(syncedUnits.shippingUnit)
          : 0;
    const fixedFeeUnit =
      normalizedChannel === "mercadolivre" && syncedUnits
        ? toNumber(syncedUnits.fixedFeeUnit)
        : 0;
    const resolvedShippingOrFixedFee = toResolvedShippingOrFixedFee(
      shippingUnit,
      fixedFeeUnit,
    );

    return {
      fixedFeeUnit: toDecimalString(fixedFeeUnit),
      marketplaceCommissionUnit: toDecimalString(
        netSales > 0 ? marketplaceCommissionUnit : 0,
      ),
      shippingOrFixedFeeSource: resolvedShippingOrFixedFee.source,
      shippingOrFixedFeeUnit: toDecimalString(
        netSales > 0 ? resolvedShippingOrFixedFee.value : 0,
      ),
      shippingUnit: toDecimalString(netSales > 0 ? shippingUnit : 0),
    };
  }

  private buildPerformanceRows(
    products: ProductListItem[],
    monthlyPerformanceRows: ProductMonthlyPerformanceDisplayRow[],
  ): ProductPerformanceRow[] {
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

    const performanceRows = monthlyPerformanceRows.map((row) => {
      const product =
        (row.productId ? productById.get(row.productId) ?? null : null) ??
        productBySku.get(row.sku) ??
        null;
      return this.toPerformanceRow(row, product ?? null, []);
    });

    const rowsByGroupKey = new Map<string, ProductPerformanceRow[]>();
    for (const row of performanceRows) {
      if (!row.catalogGroupKey) {
        continue;
      }

      const groupedRows = rowsByGroupKey.get(row.catalogGroupKey) ?? [];
      groupedRows.push(row);
      rowsByGroupKey.set(row.catalogGroupKey, groupedRows);
    }

    return performanceRows.map((row) => {
      if (row.catalogRole !== "parent" || !row.catalogGroupKey) {
        return row;
      }

      const groupedRows = rowsByGroupKey.get(row.catalogGroupKey) ?? [row];
      return this.applyWeightedCompositionUnitsToParentRow(row, groupedRows);
    });
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
      isSyntheticParent: product?.isSyntheticParent ?? false,
      parentProductId: product?.parentProductId ?? null,
      productId: row.productId ?? product?.id ?? null,
      variationLabel: product?.variationLabel ?? null,
    };
  }

  private applyWeightedCompositionUnitsToParentRow(
    row: ProductPerformanceRow,
    groupedRows: ProductPerformanceRow[],
  ): ProductPerformanceRow {
    const totals = groupedRows.reduce(
      (accumulator, currentRow) => {
        const netSales = resolveNetSales(currentRow);
        if (netSales <= 0) {
          return accumulator;
        }

        accumulator.fixedFeeTotal += toNumber(currentRow.fixedFeeUnit) * netSales;
        accumulator.marketplaceCommissionTotal +=
          toNumber(currentRow.marketplaceCommissionUnit) * netSales;
        accumulator.netSalesTotal += netSales;
        accumulator.shippingFeeTotal += toNumber(currentRow.shippingUnit) * netSales;
        accumulator.shippingOrFixedFeeTotal +=
          toNumber(currentRow.shippingOrFixedFeeUnit) * netSales;

        return accumulator;
      },
      createEmptyAccumulator(),
    );

    if (totals.netSalesTotal <= 0) {
      return row;
    }

    const weightedShippingUnit = totals.shippingFeeTotal / totals.netSalesTotal;
    const weightedFixedFeeUnit = totals.fixedFeeTotal / totals.netSalesTotal;
    const resolvedShippingOrFixedFee = toResolvedShippingOrFixedFee(
      weightedShippingUnit,
      weightedFixedFeeUnit,
    );

    return {
      ...row,
      fixedFeeUnit: toDecimalString(weightedFixedFeeUnit),
      marketplaceCommissionUnit: toDecimalString(
        totals.marketplaceCommissionTotal / totals.netSalesTotal,
      ),
      shippingOrFixedFeeSource: resolvedShippingOrFixedFee.source,
      shippingOrFixedFeeUnit: toDecimalString(resolvedShippingOrFixedFee.value),
      shippingUnit: toDecimalString(weightedShippingUnit),
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
      return this.updateCatalogFinanceForSingleProduct(
        organizationId,
        companyId,
        productId,
        input,
        false,
      );
    }

    if (targetGroup.parentProductId !== productId) {
      return this.updateCatalogFinanceForSingleProduct(
        organizationId,
        companyId,
        productId,
        input,
      );
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
        await this.persistCatalogFinanceForProduct({
          companyId,
          existingCost,
          existingProduct,
          input,
          organizationId,
          tx,
        });
      }
    });

    if (companyId) {
      await this.financeService.materializeOrganizationMetrics(
        organizationId,
        companyId,
      );
    }

    return this.getCatalogProductByIdForResponse(
      organizationId,
      companyId,
      targetGroup.parentProductId,
    );
  }

  private async updateCatalogFinanceForSingleProduct(
    organizationId: string,
    companyId: string | undefined,
    productId: string,
    input: ProductCatalogFinanceUpdateInput,
    groupedResponse = true,
  ): Promise<ProductListItem> {
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
      await this.persistCatalogFinanceForProduct({ 
        companyId, 
        existingCost: existingCost ?? null, 
        existingProduct, 
        input, 
        organizationId, 
        tx, 
      });
    });

    if (existingProduct.companyId) {
      await this.financeService.materializeOrganizationMetrics(
        organizationId,
        existingProduct.companyId,
      );
    }

    return groupedResponse
      ? this.getCatalogProductByIdForResponse(
          organizationId,
          companyId,
          productId,
        )
      : this.getProductListItem(organizationId, productId, companyId);
  }

  private async getCatalogProductByIdForResponse(
    organizationId: string,
    companyId: string | undefined,
    productId: string,
  ): Promise<ProductListItem> {
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
      updatedSyncedProducts,
    );
    const result = this.findCatalogProductById(groupedProducts, productId);

    if (!result) {
      throw new NotFoundException("Product not found.");
    }

    return result;
  }

  private findCatalogProductById(
    productsList: ProductListItem[],
    productId: string,
  ): ProductListItem | null {
    for (const product of productsList) {
      if (product.id === productId) {
        return product;
      }

      const childMatch = this.findCatalogProductById(product.children, productId);
      if (childMatch) {
        return childMatch;
      }
    }

    return null;
  }

  private async persistCatalogFinanceForProduct(input: { 
    companyId: string | undefined; 
    existingCost: ProductCost | null; 
    existingProduct: Product & { financeDefaults: ProductFinanceDefaults | null }; 
    input: ProductCatalogFinanceUpdateInput; 
    organizationId: string; 
    tx: Pick<DatabaseClient, "insert" | "update">; 
  }) { 
    if (input.existingCost) {
      await input.tx
        .update(productCosts)
        .set({
          amount: input.input.unitCost,
          costType: input.existingCost.costType,
          currency: input.existingCost.currency,
          effectiveFrom: input.existingCost.effectiveFrom,
          notes: "Atualizado pelo catálogo",
        })
        .where(
          and(
            eq(productCosts.id, input.existingCost.id),
            eq(productCosts.organizationId, input.organizationId),
            ...(input.companyId ? [eq(productCosts.companyId, input.companyId)] : []),
          ),
        )
        .returning();
    } else {
      await input.tx
        .insert(productCosts)
        .values({
          amount: input.input.unitCost,
          companyId: input.existingProduct.companyId,
          costType: "base",
          currency: "BRL",
          effectiveFrom: null,
          notes: "Atualizado pelo catálogo",
          organizationId: input.organizationId,
          productId: input.existingProduct.id,
        })
        .returning();
    }

    if (input.existingProduct.financeDefaults) {
      await input.tx
        .update(productFinanceDefaults)
        .set({
          packagingCost: input.input.packagingCost,
        })
        .where(
          eq(
            productFinanceDefaults.id,
            input.existingProduct.financeDefaults.id,
          ),
        )
        .returning();
    } else {
      await input.tx
        .insert(productFinanceDefaults)
        .values({
          advertisingCost: "0",
          packagingCost: input.input.packagingCost,
          productId: input.existingProduct.id,
        })
        .returning();
    }
  }

  private buildMercadoLivreCatalogGroups(
    syncedProducts: SyncedProductRecord[],
  ): Map<string, MercadoLivreCatalogGroup> {
    const groupedEntries = new Map<
      string,
      Array<{
        externalProductId: string;
        isVariation: boolean;
        productId: string | null;
        sku: string | null;
        title: string | null;
        variationLabel: string | null;
      }>
    >();

    for (const syncedProduct of syncedProducts) {
      const productId = syncedProduct.linkedProduct?.id ?? null;
      if (syncedProduct.provider !== "mercadolivre") {
        continue;
      }

      const metadata = readMercadoLivreSyncMetadata(syncedProduct);
      const itemId =
        metadata.itemId ?? extractMercadoLivreItemId(syncedProduct.externalProductId);
      if (!itemId) {
        continue;
      }

      const entries = groupedEntries.get(itemId) ?? [];
      const isVariation =
        metadata.variationId !== null || syncedProduct.externalProductId.includes(":");
      entries.push({
        externalProductId: syncedProduct.externalProductId,
        isVariation,
        productId,
        sku: syncedProduct.sku,
        title: syncedProduct.title?.trim() || null,
        variationLabel: isVariation ? syncedProduct.title?.trim() || null : null,
      });
      groupedEntries.set(itemId, entries);
    }

    const groups = new Map<string, MercadoLivreCatalogGroup>();

    for (const [itemId, entries] of groupedEntries.entries()) {
      const dedupedEntriesByProductId = new Map<string, (typeof entries)[number]>();

      for (const entry of entries) {
        if (!entry.productId) {
          continue;
        }

        const currentEntry = dedupedEntriesByProductId.get(entry.productId);
        if (!currentEntry) {
          dedupedEntriesByProductId.set(entry.productId, entry);
          continue;
        }

        if (currentEntry.isVariation && !entry.isVariation) {
          dedupedEntriesByProductId.set(entry.productId, entry);
        }
      }

      const dedupedEntries = [...dedupedEntriesByProductId.values()];
      const parentEntry = entries.find((entry) => !entry.isVariation) ?? null;

      if (dedupedEntries.length === 0) {
        continue;
      }

      const explicitParent = dedupedEntries.find((entry) => !entry.isVariation) ?? null;
      const childEntries = explicitParent
        ? dedupedEntries.filter((entry) => entry.productId !== explicitParent.productId)
        : dedupedEntries;

      if (childEntries.length === 0) {
        continue;
      }

      const variationLabelByProductId = new Map<string, string | null>();

      for (const entry of dedupedEntries) {
        if (entry.productId) {
          variationLabelByProductId.set(entry.productId, entry.variationLabel);
        }
      }

      const groupKey = toCatalogGroupKey(itemId);

      groups.set(groupKey, {
        childProductIds: childEntries
          .map((entry) => entry.productId)
          .filter((productId): productId is string => productId !== null),
        groupKey,
        parentProductId: explicitParent?.productId ?? null,
        parentSku: parentEntry?.sku ?? explicitParent?.sku ?? null,
        parentSyntheticId: explicitParent ? null : buildSyntheticCatalogParentId(groupKey),
        parentTitle: parentEntry?.title ?? explicitParent?.title ?? null,
        representativeProductId:
          explicitParent?.productId ?? childEntries[0]?.productId ?? null,
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
    isSyntheticParent?: boolean;
    parentProductId?: string | null;
    variationLabel?: string | null;
  }): ProductListItem {
    return {
      ...input.base,
      catalogGroupKey: input.catalogGroupKey ?? null,
      catalogRole: input.catalogRole,
      children: input.children ?? [],
      derivedFromProvider: input.derivedFromProvider ?? null,
      isSyntheticParent: input.isSyntheticParent ?? false,
      parentProductId:
        input.parentProductId === undefined ? null : input.parentProductId,
      variationLabel:
        input.variationLabel === undefined ? null : input.variationLabel,
    };
  }

  private buildSyntheticCatalogParent(
    baseProduct: ProductListItem,
    group: MercadoLivreCatalogGroup,
    children: ProductListItem[],
  ): ProductListItem {
    return {
      ...baseProduct,
      id: group.parentSyntheticId ?? buildSyntheticCatalogParentId(group.groupKey),
      name: group.parentTitle ?? baseProduct.name,
      sku: group.parentSku ?? baseProduct.sku,
      latestCost: null,
      financeDefaults: null,
      catalogGroupKey: group.groupKey,
      catalogRole: "parent",
      children,
      derivedFromProvider: "mercadolivre",
      isSyntheticParent: true,
      parentProductId: null,
      variationLabel: null,
    };
  }

  private buildCatalogProducts(
    productsList: ProductListItem[],
    syncedProducts: SyncedProductRecord[],
  ): ProductListItem[] {
    const groups = this.buildMercadoLivreCatalogGroups(syncedProducts);
    const parentGroupByProductId = new Map<string, MercadoLivreCatalogGroup>();
    const childGroupByProductId = new Map<string, MercadoLivreCatalogGroup>();
    const emittedSyntheticGroups = new Set<string>();

    for (const group of groups.values()) {
      if (group.parentProductId) {
        parentGroupByProductId.set(group.parentProductId, group);
      }
      for (const childProductId of group.childProductIds) {
        childGroupByProductId.set(childProductId, group);
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
              isSyntheticParent: false,
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
            isSyntheticParent: false,
            parentProductId: null,
            variationLabel: null,
          }),
        ];
      }

      const childGroup = childGroupByProductId.get(product.id);

      if (childGroup) {
        if (childGroup.parentProductId || emittedSyntheticGroups.has(childGroup.groupKey)) {
          return [];
        }

        emittedSyntheticGroups.add(childGroup.groupKey);
        const children = childGroup.childProductIds
          .map((childProductId) => productById.get(childProductId) ?? null)
          .filter((childProduct): childProduct is ProductListItem => childProduct !== null)
          .map((childProduct) =>
            this.toCatalogProductListItem({
              base: childProduct,
              catalogGroupKey: childGroup.groupKey,
              catalogRole: "child",
              children: [],
              derivedFromProvider: "mercadolivre",
              isSyntheticParent: false,
              parentProductId: childGroup.parentSyntheticId,
              variationLabel:
                childGroup.variationLabelByProductId.get(childProduct.id) ?? null,
            }),
          );
        const representativeProduct =
          (childGroup.representativeProductId
            ? productById.get(childGroup.representativeProductId) ?? null
            : null) ?? product;

        return [
          this.buildSyntheticCatalogParent(
            representativeProduct,
            childGroup,
            children,
          ),
        ];
      }

      if (childGroupByProductId.has(product.id)) {
        return [];
      }

      return [
        this.toCatalogProductListItem({
          base: product,
          catalogRole: "standalone",
          children: [],
          derivedFromProvider: product.derivedFromProvider,
          isSyntheticParent: false,
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
      isSyntheticParent: false,
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
