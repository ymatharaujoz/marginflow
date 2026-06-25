import { Inject, Injectable } from "@nestjs/common";
import {
  buildFinanceOverview,
  buildProductProfitabilityMetrics,
  type FinanceSnapshot,
  type FinancialAdCostInput,
  type FinancialManualExpenseInput,
  type FinancialOrderInput,
  type FinancialProductInput,
} from "@lucreii/domain";
import {
  dailyMetrics,
  externalProducts,
  productMetrics,
  type DatabaseClient,
  type ExternalFee,
  type ExternalOrder,
  type ExternalOrderItem,
  type ExternalProduct,
  type Product,
  type ProductCost,
  type ProductImage,
} from "@lucreii/database";
import type {
  DashboardChannelProfitabilityRow,
  DashboardDailyMetricPoint,
  DashboardProductMetricRow,
  DashboardProductProfitabilityRow,
  DashboardReadModel,
  DashboardSummaryMetrics,
} from "@lucreii/types";
import type { IntegrationProviderSlug } from "@lucreii/types";
import { and, desc, eq } from "drizzle-orm";
import { DATABASE_CLIENT } from "@/common/tokens";

type ProductCostRow = Pick<ProductCost, "amount" | "createdAt" | "effectiveFrom">;
type SnapshotProductRow = Product & {
  images: ProductImage[];
  productCosts: ProductCost[];
};
type SnapshotOrderRow = ExternalOrder & {
  fees: ExternalFee[];
  items: ExternalOrderItem[];
};
type SnapshotExternalProductRow = Pick<
  ExternalProduct,
  "externalProductId" | "id" | "linkedProductId" | "metadata" | "provider" | "sku" | "title"
>;
type ProductPresentation = {
  coverImageUrl: string | null;
  productName: string;
};
type ProductPresentationRow = Product & {
  images: ProductImage[];
};

export function normalizeSku(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  return normalized.length > 0 ? normalized : null;
}

export function selectLatestProductCost(costs: ProductCostRow[]) {
  if (costs.length === 0) {
    return "0.00";
  }

  return [...costs]
    .sort((left, right) => {
      const effectiveComparison = (right.effectiveFrom ?? "").localeCompare(left.effectiveFrom ?? "");

      if (effectiveComparison !== 0) {
        return effectiveComparison;
      }

      return right.createdAt.getTime() - left.createdAt.getTime();
    })[0].amount;
}

export function toMetricDate(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return value.slice(0, 10);
}

function isMissingExternalProductReviewColumns(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = "code" in error && typeof error.code === "string" ? error.code : null;
  const message =
    "message" in error && typeof error.message === "string" ? error.message : null;

  if (code === "42703") {
    return true;
  }

  return Boolean(
    message &&
      (message.includes("linked_product_id") || message.includes("review_status")),
  );
}

function getPrimaryImageUrl(images: ProductImage[]) {
  return (
    [...images]
      .sort((left, right) => left.position - right.position)[0]?.url ?? null
  );
}

function toCatalogGroupKey(itemId: string) {
  return `mercadolivre:${itemId}`;
}

function extractMercadoLivreItemId(externalProductId: string) {
  const [itemId] = externalProductId.split(":");
  return itemId?.trim() ? itemId.trim() : null;
}

function readMercadoLivreSyncMetadata(
  metadata: Record<string, unknown> | null | undefined,
) {
  if (!metadata || typeof metadata !== "object") {
    return {
      itemId: null,
      variationId: null,
    };
  }

  const itemId =
    typeof metadata.itemId === "string" && metadata.itemId.trim().length > 0
      ? metadata.itemId.trim()
      : null;
  const variationId =
    typeof metadata.variationId === "string" &&
    metadata.variationId.trim().length > 0
      ? metadata.variationId.trim()
      : null;

  return {
    itemId,
    variationId,
  };
}

function isMercadoLivreVariationProduct(externalProduct: SnapshotExternalProductRow) {
  if (externalProduct.provider !== "mercadolivre") {
    return false;
  }

  const metadata = readMercadoLivreSyncMetadata(
    (externalProduct.metadata ?? {}) as Record<string, unknown>,
  );

  return (
    metadata.variationId !== null ||
    externalProduct.externalProductId.includes(":")
  );
}

function selectPreferredExternalProduct(
  externalProducts: SnapshotExternalProductRow[],
) {
  return (
    externalProducts.find((externalProduct) =>
      isMercadoLivreVariationProduct(externalProduct),
    ) ?? externalProducts[0] ?? null
  );
}

function buildProductPresentationMap(
  products: ProductPresentationRow[],
  externalProductRows: SnapshotExternalProductRow[],
) {
  const productById = new Map(products.map((product) => [product.id, product] as const));
  const parentTitleByGroupKey = new Map<string, string>();
  const externalProductsByLinkedProductId = new Map<string, SnapshotExternalProductRow[]>();

  for (const externalProduct of externalProductRows) {
    if (externalProduct.linkedProductId) {
      externalProductsByLinkedProductId.set(externalProduct.linkedProductId, [
        ...(externalProductsByLinkedProductId.get(externalProduct.linkedProductId) ?? []),
        externalProduct,
      ]);
    }

    if (externalProduct.provider !== "mercadolivre") {
      continue;
    }

    const metadata = readMercadoLivreSyncMetadata(
      (externalProduct.metadata ?? {}) as Record<string, unknown>,
    );
    const itemId =
      metadata.itemId ?? extractMercadoLivreItemId(externalProduct.externalProductId);
    const isVariation =
      metadata.variationId !== null ||
      externalProduct.externalProductId.includes(":");
    const trimmedTitle = externalProduct.title?.trim() || null;

    if (!itemId || isVariation || !trimmedTitle) {
      continue;
    }

    parentTitleByGroupKey.set(toCatalogGroupKey(itemId), trimmedTitle);
  }

  const presentations = new Map<string, ProductPresentation>();

  for (const product of products) {
    const linkedExternalProducts = externalProductsByLinkedProductId.get(product.id) ?? [];
    const primaryExternalProduct = selectPreferredExternalProduct(linkedExternalProducts);
    const coverImageUrl = getPrimaryImageUrl(product.images);
    let productName = product.name;

    if (primaryExternalProduct?.provider === "mercadolivre") {
      const metadata = readMercadoLivreSyncMetadata(
        (primaryExternalProduct.metadata ?? {}) as Record<string, unknown>,
      );
      const itemId =
        metadata.itemId ?? extractMercadoLivreItemId(primaryExternalProduct.externalProductId);
      const isVariation =
        metadata.variationId !== null ||
        primaryExternalProduct.externalProductId.includes(":");
      const variationTitle = primaryExternalProduct.title?.trim() || product.name;
      const parentTitle = itemId ? parentTitleByGroupKey.get(toCatalogGroupKey(itemId)) : null;

      if (isVariation && parentTitle && parentTitle !== variationTitle) {
        productName = `${parentTitle} | ${variationTitle}`;
      } else if (variationTitle) {
        productName = variationTitle;
      }
    } else if (primaryExternalProduct?.title?.trim()) {
      productName = primaryExternalProduct.title.trim();
    }

    presentations.set(product.id, {
      coverImageUrl,
      productName,
    });
  }

  for (const [productId, linkedRows] of externalProductsByLinkedProductId) {
    if (presentations.has(productId)) {
      continue;
    }

    const product = productById.get(productId);
    if (!product) {
      continue;
    }

    presentations.set(productId, {
      coverImageUrl: getPrimaryImageUrl(product.images),
      productName: linkedRows[0]?.title?.trim() || product.name,
    });
  }

  return presentations;
}

@Injectable()
export class FinanceService {
  constructor(
    @Inject(DATABASE_CLIENT)
    private readonly db: DatabaseClient,
  ) {}

  async buildFinanceSnapshot(
    organizationId: string,
    companyId: string,
    provider?: IntegrationProviderSlug,
  ): Promise<FinanceSnapshot> {
    const [productRows, orderRows, adCostRows, expenseRows, externalProductRows] = await Promise.all([
      this.db.query.products.findMany({
        orderBy: (table) => [desc(table.createdAt)],
        where: (table) =>
          and(
            eq(table.organizationId, organizationId),
            eq(table.companyId, companyId),
          ),
        with: {
          images: true,
          productCosts: {
            orderBy: (table) => [desc(table.effectiveFrom), desc(table.createdAt)],
          },
        },
      }),
      this.db.query.externalOrders.findMany({
        orderBy: (table) => [desc(table.orderedAt), desc(table.createdAt)],
        where: (table) =>
          provider
            ? and(
                eq(table.organizationId, organizationId),
                eq(table.companyId, companyId),
                eq(table.provider, provider),
              )
            : and(
                eq(table.organizationId, organizationId),
                eq(table.companyId, companyId),
              ),
        with: {
          fees: true,
          items: true,
        },
      }),
      this.db.query.adCosts.findMany({
        orderBy: (table) => [desc(table.spentAt), desc(table.createdAt)],
        where: (table) =>
          provider
            ? and(
                eq(table.organizationId, organizationId),
                eq(table.companyId, companyId),
                eq(table.channel, provider),
              )
            : and(
                eq(table.organizationId, organizationId),
                eq(table.companyId, companyId),
              ),
      }),
      this.db.query.manualExpenses.findMany({
        orderBy: (table) => [desc(table.incurredAt), desc(table.createdAt)],
        where: (table) =>
          and(
            eq(table.organizationId, organizationId),
            eq(table.companyId, companyId),
          ),
      }),
      this.readExternalProductsForFinance(organizationId, companyId),
    ]);

    const products = productRows.map((row) => this.toFinancialProduct(row));
    const productIdsBySku = new Map(
      products
        .map((product) => [normalizeSku(product.sku), product.id] as const)
        .filter((entry): entry is readonly [string, string] => entry[0] !== null),
    );
    const externalProductsById = new Map(
      externalProductRows.map((product) => [product.id, product]),
    );
    const orders = orderRows.map((row) => this.toFinancialOrder(row, productIdsBySku, externalProductsById));
    const adCosts = adCostRows.map<FinancialAdCostInput>((row) => ({
      amount: String(row.amount),
      channel: row.channel.trim().toLowerCase(),
      id: row.id,
      productId: row.productId,
      spentAt: toMetricDate(row.spentAt),
    }));
    const manualExpenses = (provider ? [] : expenseRows).map<FinancialManualExpenseInput>((row) => ({
      amount: String(row.amount),
      category: row.category,
      id: row.id,
      incurredAt: toMetricDate(row.incurredAt),
    }));

    return {
      adCosts,
      manualExpenses,
      orders,
      products,
    };
  }

  async buildDashboardReadModel(
    organizationId: string,
    companyId: string,
    provider?: IntegrationProviderSlug,
  ): Promise<DashboardReadModel> {
    const snapshot = await this.buildFinanceSnapshot(
      organizationId,
      companyId,
      provider,
    );
    const overview = buildFinanceOverview(snapshot);
    const productProfitability = buildProductProfitabilityMetrics(snapshot);
    const productRows = await this.db.query.products.findMany({
      where: (table) =>
        and(
          eq(table.organizationId, organizationId),
          eq(table.companyId, companyId),
        ),
      with: {
        images: {
          orderBy: (table) => [table.position],
        },
      },
    });
    const productPresentationById = buildProductPresentationMap(
      productRows as ProductPresentationRow[],
      await this.readExternalProductsForFinance(organizationId, companyId),
    );

    return {
      channels: overview.channels.map<DashboardChannelProfitabilityRow>((channel) => ({
        channel: channel.channel,
        summary: channel.summary,
      })),
      daily: overview.daily.map<DashboardDailyMetricPoint>((metric) => ({
        metricDate: metric.metricDate,
        ordersCount: metric.ordersCount,
        summary: metric.summary,
      })),
      productProfitability: productProfitability.map<DashboardProductProfitabilityRow>((metric) => ({
        adSpend: metric.adSpend,
        channel: metric.channel,
        coverImageUrl: productPresentationById.get(metric.productId)?.coverImageUrl ?? null,
        grossProfit: metric.grossProfit,
        margin: metric.margin,
        marketplaceCommission: metric.marketplaceCommission,
        netSales: metric.netSales,
        packagingCost: metric.packagingCost,
        productCost: metric.productCost,
        productId: metric.productId,
        productName: productPresentationById.get(metric.productId)?.productName ?? metric.productName,
        returns: metric.returns,
        revenue: metric.revenue,
        roi: metric.roi,
        roas: metric.roas,
        salePrice: metric.salePrice,
        sales: metric.sales,
        shippingCost: metric.shippingCost,
        sku: metric.sku,
        summary: metric.summary,
        taxAmount: metric.taxAmount,
      })),
      products: overview.products.map<DashboardProductMetricRow>((metric) => ({
        metricDate: metric.metricDate,
        productId: metric.productId,
        productName: metric.productName,
        sku: metric.sku,
        summary: metric.summary,
      })),
      summary: overview.summary,
    };
  }

  async readSummaryMetrics(
    organizationId: string,
    companyId: string,
    provider?: IntegrationProviderSlug,
  ): Promise<DashboardSummaryMetrics> {
    return (await this.buildDashboardReadModel(organizationId, companyId, provider))
      .summary;
  }

  async readDailyMetrics(
    organizationId: string,
    companyId: string,
  ): Promise<DashboardDailyMetricPoint[]> {
    return (await this.buildDashboardReadModel(organizationId, companyId)).daily;
  }

  async readProductProfitability(
    organizationId: string,
    companyId: string,
  ): Promise<DashboardProductProfitabilityRow[]> {
    return (await this.buildDashboardReadModel(organizationId, companyId))
      .productProfitability;
  }

  async readChannelProfitability(
    organizationId: string,
    companyId: string,
  ): Promise<DashboardChannelProfitabilityRow[]> {
    return (await this.buildDashboardReadModel(organizationId, companyId)).channels;
  }

  async materializeOrganizationMetrics(
    organizationId: string,
    companyId: string,
  ): Promise<DashboardReadModel> {
    const readModel = await this.buildDashboardReadModel(organizationId, companyId);

    await this.db.transaction(async (tx) => {
      await tx.delete(dailyMetrics).where(eq(dailyMetrics.organizationId, organizationId));
      await tx.delete(productMetrics).where(eq(productMetrics.organizationId, organizationId));

      if (readModel.daily.length > 0) {
        await tx.insert(dailyMetrics).values(
          readModel.daily.map((metric) => ({
            grossRevenue: metric.summary.grossRevenue,
            metadata: {
              breakEvenRevenue: metric.summary.breakEvenRevenue,
              breakEvenUnits: metric.summary.breakEvenUnits,
              contributionMargin: metric.summary.contributionMargin,
              grossMarginPercent: metric.summary.grossMarginPercent,
              totalAdCosts: metric.summary.totalAdCosts,
              totalCogs: metric.summary.totalCogs,
              totalFees: metric.summary.totalFees,
              totalManualExpenses: metric.summary.totalManualExpenses,
              unitsSold: metric.summary.unitsSold,
            },
            metricDate: metric.metricDate,
            netProfit: metric.summary.netProfit,
            netRevenue: metric.summary.netRevenue,
            ordersCount: metric.summary.ordersCount,
            organizationId,
          })),
        );
      }

      if (readModel.products.length > 0) {
        await tx.insert(productMetrics).values(
          readModel.products.map((metric) => ({
            grossRevenue: metric.summary.grossRevenue,
            metadata: {
              contributionMargin: metric.summary.contributionMargin,
              grossMarginPercent: metric.summary.grossMarginPercent,
              productName: metric.productName,
              sku: metric.sku,
              totalAdCosts: metric.summary.totalAdCosts,
              totalCogs: metric.summary.totalCogs,
              totalFees: metric.summary.totalFees,
            },
            metricDate: metric.metricDate,
            netProfit: metric.summary.netProfit,
            organizationId,
            productId: metric.productId,
            unitsSold: metric.summary.unitsSold,
          })) as Array<(typeof productMetrics)["$inferInsert"]>,
        );
      }
    });

    return readModel;
  }

  async readMaterializedDailyMetrics(organizationId: string) {
    return this.db.query.dailyMetrics.findMany({
      orderBy: (table) => [table.metricDate],
      where: (table) => eq(table.organizationId, organizationId),
    });
  }

  async readMaterializedProductMetrics(organizationId: string) {
    return this.db.query.productMetrics.findMany({
      orderBy: (table) => [table.metricDate],
      where: (table) => eq(table.organizationId, organizationId),
    });
  }

  private async readExternalProductsForFinance(
    organizationId: string,
    companyId: string,
  ): Promise<SnapshotExternalProductRow[]> {
    try {
      return await this.db
        .select({
          externalProductId: externalProducts.externalProductId,
          id: externalProducts.id,
          linkedProductId: externalProducts.linkedProductId,
          metadata: externalProducts.metadata,
          provider: externalProducts.provider,
          sku: externalProducts.sku,
          title: externalProducts.title,
        })
        .from(externalProducts)
        .where(
          and(
            eq(externalProducts.organizationId, organizationId),
            eq(externalProducts.companyId, companyId),
          ),
        );
    } catch (error) {
      if (!isMissingExternalProductReviewColumns(error)) {
        throw error;
      }

      const legacyRows = await this.db
        .select({
          externalProductId: externalProducts.externalProductId,
          id: externalProducts.id,
          sku: externalProducts.sku,
          title: externalProducts.title,
        })
        .from(externalProducts)
        .where(
          and(
            eq(externalProducts.organizationId, organizationId),
            eq(externalProducts.companyId, companyId),
          ),
        );

      return legacyRows.map((row) => ({
        ...row,
        linkedProductId: null,
        metadata: {},
        provider: "mercadolivre",
      }));
    }
  }

  private toFinancialProduct(row: SnapshotProductRow): FinancialProductInput {
    return {
      id: row.id,
      isActive: row.isActive,
      name: row.name,
      sellingPrice: String(row.sellingPrice),
      sku: row.sku,
      unitCost: selectLatestProductCost(
        row.productCosts.map((cost: ProductCostRow) => ({
          amount: String(cost.amount),
          createdAt: cost.createdAt,
          effectiveFrom: cost.effectiveFrom,
        })),
      ),
    };
  }

  private toFinancialOrder(
    row: SnapshotOrderRow,
    productIdsBySku: Map<string, string>,
    externalProductsById: Map<string, SnapshotExternalProductRow>,
  ): FinancialOrderInput {
    return {
      discountAmount: "0.00",
      fees: row.fees.map((fee: ExternalFee) => ({
        amount: String(fee.amount),
        feeType: fee.feeType,
      })),
      id: row.id,
      items: row.items.map((item: SnapshotOrderRow["items"][number]) => {
        const externalProduct = item.externalProductId ? externalProductsById.get(item.externalProductId) : null;
        const linkedProductId = externalProduct?.linkedProductId ?? null;
        const normalizedSku = normalizeSku(externalProduct?.sku);

        return {
          id: item.id,
          productId:
            linkedProductId ?? (normalizedSku ? productIdsBySku.get(normalizedSku) ?? null : null),
          quantity: item.quantity,
          sku: externalProduct?.sku ?? null,
          totalPrice: String(item.totalPrice),
          unitPrice: String(item.unitPrice),
        };
      }),
      orderedAt: toMetricDate(row.orderedAt),
      provider: row.provider.trim().toLowerCase(),
      refundAmount: "0.00",
      totalAmount: String(row.totalAmount),
    };
  }
}
