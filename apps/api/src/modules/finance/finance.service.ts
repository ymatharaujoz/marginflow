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
  items: Array<
    ExternalOrderItem & {
      externalProduct: ExternalProduct | null;
    }
  >;
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

@Injectable()
export class FinanceService {
  constructor(
    @Inject(DATABASE_CLIENT)
    private readonly db: DatabaseClient,
  ) {}

  async buildFinanceSnapshot(organizationId: string): Promise<FinanceSnapshot> {
    const [productRows, orderRows, adCostRows, expenseRows] = await Promise.all([
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
          items: {
            with: {
              externalProduct: true,
            },
          },
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
    ]);

    const products = productRows.map((row) => this.toFinancialProduct(row));
    const productIdsBySku = new Map(
      products
        .map((product) => [normalizeSku(product.sku), product.id] as const)
        .filter((entry): entry is readonly [string, string] => entry[0] !== null),
    );
    const orders = orderRows.map((row) => this.toFinancialOrder(row, productIdsBySku));
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
        productId: metric.productId,
        productName: metric.productName,
        sku: metric.sku,
        summary: metric.summary,
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
  ): FinancialOrderInput {
    return {
      discountAmount: "0.00",
      fees: row.fees.map((fee: ExternalFee) => ({
        amount: String(fee.amount),
        feeType: fee.feeType,
      })),
      id: row.id,
      items: row.items.map((item: SnapshotOrderRow["items"][number]) => {
        const normalizedSku = normalizeSku(item.externalProduct?.sku);

        return {
          id: item.id,
          productId: normalizedSku ? productIdsBySku.get(normalizedSku) ?? null : null,
          quantity: item.quantity,
          sku: item.externalProduct?.sku ?? null,
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
