import { Inject, Injectable } from "@nestjs/common";
import {
  buildFinanceOverview,
  buildProductProfitabilityMetrics,
  type FinanceSnapshot,
  type FinancialAdCostInput,
  type FinancialManualExpenseInput,
  type FinancialOrderInput,
  type FinancialProductInput,
} from "@marginflow/domain";
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
} from "@marginflow/database";
import type {
  DashboardChannelProfitabilityRow,
  DashboardDailyMetricPoint,
  DashboardProductMetricRow,
  DashboardProductProfitabilityRow,
  DashboardReadModel,
  DashboardSummaryMetrics,
} from "@marginflow/types";
import { desc, eq } from "drizzle-orm";
import { DATABASE_CLIENT } from "@/common/tokens";

type ProductCostRow = Pick<ProductCost, "amount" | "createdAt" | "effectiveFrom">;
type SnapshotProductRow = Product & {
  productCosts: ProductCost[];
};
type SnapshotOrderRow = ExternalOrder & {
  fees: ExternalFee[];
  items: ExternalOrderItem[];
};
type SnapshotExternalProductRow = Pick<ExternalProduct, "id" | "linkedProductId" | "sku">;

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

@Injectable()
export class FinanceService {
  constructor(
    @Inject(DATABASE_CLIENT)
    private readonly db: DatabaseClient,
  ) {}

  async buildFinanceSnapshot(organizationId: string): Promise<FinanceSnapshot> {
    const [productRows, orderRows, adCostRows, expenseRows, externalProductRows] = await Promise.all([
      this.db.query.products.findMany({
        orderBy: (table) => [desc(table.createdAt)],
        where: (table) => eq(table.organizationId, organizationId),
        with: {
          productCosts: {
            orderBy: (table) => [desc(table.effectiveFrom), desc(table.createdAt)],
          },
        },
      }),
      this.db.query.externalOrders.findMany({
        orderBy: (table) => [desc(table.orderedAt), desc(table.createdAt)],
        where: (table) => eq(table.organizationId, organizationId),
        with: {
          fees: true,
          items: true,
        },
      }),
      this.db.query.adCosts.findMany({
        orderBy: (table) => [desc(table.spentAt), desc(table.createdAt)],
        where: (table) => eq(table.organizationId, organizationId),
      }),
      this.db.query.manualExpenses.findMany({
        orderBy: (table) => [desc(table.incurredAt), desc(table.createdAt)],
        where: (table) => eq(table.organizationId, organizationId),
      }),
      this.readExternalProductsForFinance(organizationId),
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
    const manualExpenses = expenseRows.map<FinancialManualExpenseInput>((row) => ({
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

  async buildDashboardReadModel(organizationId: string): Promise<DashboardReadModel> {
    const snapshot = await this.buildFinanceSnapshot(organizationId);
    const overview = buildFinanceOverview(snapshot);
    const productProfitability = buildProductProfitabilityMetrics(snapshot);

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
        grossProfit: metric.grossProfit,
        margin: metric.margin,
        marketplaceCommission: metric.marketplaceCommission,
        netSales: metric.netSales,
        packagingCost: metric.packagingCost,
        productCost: metric.productCost,
        productId: metric.productId,
        productName: metric.productName,
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

  async readSummaryMetrics(organizationId: string): Promise<DashboardSummaryMetrics> {
    return (await this.buildDashboardReadModel(organizationId)).summary;
  }

  async readDailyMetrics(organizationId: string): Promise<DashboardDailyMetricPoint[]> {
    return (await this.buildDashboardReadModel(organizationId)).daily;
  }

  async readProductProfitability(
    organizationId: string,
  ): Promise<DashboardProductProfitabilityRow[]> {
    return (await this.buildDashboardReadModel(organizationId)).productProfitability;
  }

  async readChannelProfitability(
    organizationId: string,
  ): Promise<DashboardChannelProfitabilityRow[]> {
    return (await this.buildDashboardReadModel(organizationId)).channels;
  }

  async materializeOrganizationMetrics(organizationId: string): Promise<DashboardReadModel> {
    const readModel = await this.buildDashboardReadModel(organizationId);

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
  ): Promise<SnapshotExternalProductRow[]> {
    try {
      return await this.db
        .select({
          id: externalProducts.id,
          linkedProductId: externalProducts.linkedProductId,
          sku: externalProducts.sku,
        })
        .from(externalProducts)
        .where(eq(externalProducts.organizationId, organizationId));
    } catch (error) {
      if (!isMissingExternalProductReviewColumns(error)) {
        throw error;
      }

      const legacyRows = await this.db
        .select({
          id: externalProducts.id,
          sku: externalProducts.sku,
        })
        .from(externalProducts)
        .where(eq(externalProducts.organizationId, organizationId));

      return legacyRows.map((row) => ({
        ...row,
        linkedProductId: null,
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
