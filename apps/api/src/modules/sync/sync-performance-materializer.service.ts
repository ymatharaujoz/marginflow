import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { divideMoney, parseMoney } from "@lucreii/domain";
import {
  productMonthlyPerformance,
  type Company,
  type DatabaseClient,
  type ExternalFee,
  type ExternalOrder,
  type ExternalOrderItem,
  type ExternalProduct,
  type Product,
  type ProductCost,
  type ProductFinanceDefaults,
} from "@lucreii/database";
import { and, eq } from "drizzle-orm";
import { DATABASE_CLIENT } from "@/common/tokens";
import { normalizeSku, selectLatestProductCost } from "@/modules/finance/finance.service";

type ProductRowWithFinance = Product & {
  financeDefaults: ProductFinanceDefaults | null;
  productCosts: ProductCost[];
};

type ExternalOrderRow = ExternalOrder & {
  fees: ExternalFee[];
  items: Array<
    ExternalOrderItem & {
      externalProduct: Pick<ExternalProduct, "linkedProductId" | "sku"> | null;
      metadata?: Record<string, unknown>;
    }
  >;
};

type ProductAggregate = {
  commissionTotal: bigint;
  product: ProductRowWithFinance;
  returnsQuantity: number;
  revenueTotal: bigint;
  salesQuantity: number;
  shippingTotal: bigint;
};

function createAggregate(product: ProductRowWithFinance): ProductAggregate {
  return {
    commissionTotal: 0n,
    product,
    returnsQuantity: 0,
    revenueTotal: 0n,
    salesQuantity: 0,
    shippingTotal: 0n,
  };
}

function firstDayOfMonth(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  const iso = value instanceof Date ? value.toISOString() : value;
  return `${iso.slice(0, 7)}-01`;
}

function allocateProportionally(total: bigint, weights: bigint[]) {
  if (total === 0n || weights.length === 0) {
    return weights.map(() => 0n);
  }

  const weightTotal = weights.reduce((sum, value) => sum + value, 0n);

  if (weightTotal === 0n) {
    return weights.map(() => 0n);
  }

  const allocations: bigint[] = [];
  let remaining = total;

  for (let index = 0; index < weights.length; index += 1) {
    if (index === weights.length - 1) {
      allocations.push(remaining);
      break;
    }

    const allocation = (total * weights[index]) / weightTotal;
    allocations.push(allocation);
    remaining -= allocation;
  }

  return allocations;
}

function divideMoneyAcrossCount(totalCents: bigint, count: number) {
  if (count <= 0) {
    return "0.00";
  }

  const divisor = BigInt(count);
  const quotient = totalCents / divisor;
  const remainder = totalCents % divisor;
  const rounded = remainder * 2n >= divisor ? quotient + 1n : quotient;

  return `${rounded / 100n}.${(rounded % 100n).toString().padStart(2, "0")}`;
}

function isExplicitReturnMarker(order: Pick<ExternalOrder, "status" | "metadata">) {
  const status = order.status.trim().toLowerCase();

  if (
    status.includes("cancel") ||
    status.includes("refund") ||
    status.includes("return")
  ) {
    return true;
  }

  const tags =
    order.metadata &&
    typeof order.metadata === "object" &&
    "tags" in order.metadata &&
    Array.isArray(order.metadata.tags)
      ? order.metadata.tags
      : [];

  return tags.some((tag) => {
    if (typeof tag !== "string") {
      return false;
    }

    const normalized = tag.trim().toLowerCase();

    return (
      normalized.includes("cancel") ||
      normalized.includes("refund") ||
      normalized.includes("return")
    );
  });
}

function isExplicitlyUnpaid(order: Pick<ExternalOrder, "status" | "metadata">) {
  if (
    order.metadata &&
    typeof order.metadata === "object" &&
    "paid" in order.metadata &&
    order.metadata.paid === false
  ) {
    return true;
  }

  return order.status.trim().toLowerCase() === "unpaid";
}

function sumFeeAmounts(fees: ExternalFee[], feeType: string) {
  return fees.reduce((sum, fee) => {
    if (fee.feeType !== feeType) {
      return sum;
    }

  return sum + parseMoney(String(fee.amount));
  }, 0n);
}

function readItemReturnQuantity(
  order: Pick<ExternalOrder, "metadata">,
  item: Pick<ExternalOrderItem, "quantity"> & {
    externalProduct: Pick<ExternalProduct, "linkedProductId" | "sku"> | null;
    metadata?: Record<string, unknown>;
  },
) {
  const directReturnQuantity =
    item.metadata &&
    typeof item.metadata === "object" &&
    "returnQuantity" in item.metadata &&
    typeof item.metadata.returnQuantity === "number" &&
    Number.isFinite(item.metadata.returnQuantity)
      ? Math.max(0, Math.min(item.quantity, Math.trunc(item.metadata.returnQuantity)))
      : 0;

  if (directReturnQuantity > 0) {
    return directReturnQuantity;
  }

  if (!order.metadata || typeof order.metadata !== "object") {
    return 0;
  }

  const normalizedSku = normalizeSku(item.externalProduct?.sku);

  if (!normalizedSku) {
    return 0;
  }

  const rawMap =
    "returnQuantityBySku" in order.metadata &&
    order.metadata.returnQuantityBySku &&
    typeof order.metadata.returnQuantityBySku === "object"
      ? order.metadata.returnQuantityBySku
      : null;

  if (!rawMap) {
    return 0;
  }

  const matchedEntry = Object.entries(rawMap).find(
    ([sku]) => normalizeSku(sku) === normalizedSku,
  );

  if (!matchedEntry) {
    return 0;
  }

  const [, rawQuantity] = matchedEntry;

  if (typeof rawQuantity !== "number" || !Number.isFinite(rawQuantity)) {
    return 0;
  }

  return Math.max(0, Math.min(item.quantity, Math.trunc(rawQuantity)));
}

function resolveMatchedProduct(input: {
  item: Pick<ExternalOrderItem, "quantity"> & {
    externalProduct: Pick<ExternalProduct, "linkedProductId" | "sku"> | null;
  };
  productsById: Map<string, ProductRowWithFinance>;
  productsBySku: Map<string, ProductRowWithFinance>;
}) {
  const linkedProductId = input.item.externalProduct?.linkedProductId ?? null;

  if (linkedProductId) {
    const linkedProduct = input.productsById.get(linkedProductId);

    if (linkedProduct) {
      return linkedProduct;
    }
  }

  const normalizedSku = normalizeSku(input.item.externalProduct?.sku);

  if (!normalizedSku) {
    return null;
  }

  return input.productsBySku.get(normalizedSku) ?? null;
}

function buildAggregateKey(input: {
  matchedProduct: ProductRowWithFinance;
  providerSlug: string;
  referenceMonth: string;
  item: Pick<ExternalOrderItem, "quantity"> & {
    externalProduct: Pick<ExternalProduct, "linkedProductId" | "sku"> | null;
  };
}) {
  const linkedProductId = input.item.externalProduct?.linkedProductId ?? null;

  if (linkedProductId) {
    return [
      input.referenceMonth,
      input.providerSlug,
      "product",
      linkedProductId,
    ].join("::");
  }

  return [
    input.referenceMonth,
    input.providerSlug,
    "sku",
    normalizeSku(input.matchedProduct.sku) ?? input.matchedProduct.id,
  ].join("::");
}

function buildPerformanceConflictTarget(productId: string | null) {
  if (productId) {
    return {
      target: [
        productMonthlyPerformance.organizationId,
        productMonthlyPerformance.companyId,
        productMonthlyPerformance.referenceMonth,
        productMonthlyPerformance.channel,
        productMonthlyPerformance.productId,
      ],
    };
  }

  return {
    target: [
      productMonthlyPerformance.organizationId,
      productMonthlyPerformance.companyId,
      productMonthlyPerformance.referenceMonth,
      productMonthlyPerformance.channel,
      productMonthlyPerformance.sku,
    ],
  };
}

@Injectable()
export class SyncPerformanceMaterializerService {
  constructor(
    @Inject(DATABASE_CLIENT)
    private readonly db: DatabaseClient,
  ) {}

  async materializeForSync(input: {
    companyId?: string;
    organizationId: string;
    providerSlug: string;
    syncRunId: string;
    userId: string | null;
  }) {
    await this.materializeProviderMetrics({
      companyId: input.companyId,
      organizationId: input.organizationId,
      providerSlug: input.providerSlug,
      replaceExisting: false,
      userId: input.userId,
    });
  }

  async rematerializeProviderMetrics(input: {
    companyId: string;
    organizationId: string;
    providerSlug: string;
    userId: string | null;
  }) {
    await this.materializeProviderMetrics({
      companyId: input.companyId,
      organizationId: input.organizationId,
      providerSlug: input.providerSlug,
      replaceExisting: true,
      userId: input.userId,
    });
  }

  private async materializeProviderMetrics(input: {
    companyId?: string;
    organizationId: string;
    providerSlug: string;
    replaceExisting: boolean;
    userId: string | null;
  }) {
    const targetCompany =
      input.companyId
        ? await this.requireCompany(input.organizationId, input.companyId)
        : await this.resolveActiveCompany({
            organizationId: input.organizationId,
            userId: input.userId,
          });
    const materializationUserId = input.userId ?? targetCompany.userId;
    const [orders, productsList] = await Promise.all([
      this.readOrdersForProvider(input.organizationId, targetCompany.id, input.providerSlug),
      this.readProductsForCompany(input.organizationId, targetCompany.id),
    ]);
    const productsById = new Map(productsList.map((product) => [product.id, product] as const));
    const productsBySku = new Map(
      productsList
        .map((product) => [normalizeSku(product.sku), product] as const)
        .filter((entry): entry is readonly [string, ProductRowWithFinance] => entry[0] !== null),
    );
    const aggregates = new Map<string, ProductAggregate>();

    for (const order of orders) {
      const referenceMonth = firstDayOfMonth(order.orderedAt);

      if (!referenceMonth || order.items.length === 0 || isExplicitlyUnpaid(order)) {
        continue;
      }

      const itemWeights = order.items.map((item) => parseMoney(String(item.totalPrice)));
      const commissionAllocations = allocateProportionally(
        sumFeeAmounts(order.fees, "marketplace_commission"),
        itemWeights,
      );
      const shippingAllocations = allocateProportionally(
        sumFeeAmounts(order.fees, "shipping_cost"),
        itemWeights,
      );
      const isReturnLike = isExplicitReturnMarker(order);

      for (let index = 0; index < order.items.length; index += 1) {
        const item = order.items[index];
        const matchedProduct = resolveMatchedProduct({
          item,
          productsById,
          productsBySku,
        });

        if (!matchedProduct) {
          continue;
        }

        const key = buildAggregateKey({
          item,
          matchedProduct,
          providerSlug: input.providerSlug,
          referenceMonth,
        });
        const aggregate = aggregates.get(key) ?? createAggregate(matchedProduct);
        aggregates.set(key, aggregate);
        aggregate.salesQuantity += item.quantity;

        const itemReturnQuantity = readItemReturnQuantity(order, item);

        if (itemReturnQuantity > 0) {
          aggregate.returnsQuantity += itemReturnQuantity;
        } else if (isReturnLike) {
          aggregate.returnsQuantity += item.quantity;
        }

        if (itemReturnQuantity > 0 || isReturnLike) {
          continue;
        }

        aggregate.revenueTotal += parseMoney(String(item.totalPrice));
        aggregate.commissionTotal += commissionAllocations[index] ?? 0n;
        aggregate.shippingTotal += shippingAllocations[index] ?? 0n;
      }
    }

    await this.db.transaction(async (tx) => {
      if (input.replaceExisting) {
        await tx
          .delete(productMonthlyPerformance)
          .where(
            and(
              eq(productMonthlyPerformance.organizationId, input.organizationId),
              eq(productMonthlyPerformance.companyId, targetCompany.id),
              eq(productMonthlyPerformance.channel, input.providerSlug),
            ),
          );
      }

      if (aggregates.size === 0) {
        return;
      }

      for (const [key, aggregate] of aggregates) {
        const [referenceMonth, channel] = key.split("::");
        const netSales = Math.max(0, aggregate.salesQuantity - aggregate.returnsQuantity);
        const salePrice =
          netSales > 0
            ? divideMoneyAcrossCount(aggregate.revenueTotal, netSales)
            : aggregate.product.sellingPrice;
        const commissionRate =
          aggregate.revenueTotal > 0n
            ? divideMoney(aggregate.commissionTotal, aggregate.revenueTotal, 6)
            : "0";
        const shippingFee =
          netSales > 0
            ? divideMoneyAcrossCount(aggregate.shippingTotal, netSales)
            : "0.00";

        await tx
          .insert(productMonthlyPerformance)
          .values({
            advertisingCost: aggregate.product.financeDefaults?.advertisingCost ?? "0",
            channel,
            commissionRate,
            companyId: targetCompany.id,
            notes: null,
            organizationId: input.organizationId,
            packagingCost: aggregate.product.financeDefaults?.packagingCost ?? "0",
            productId: aggregate.product.id,
            productName: aggregate.product.name,
            referenceMonth,
            returnsQuantity: aggregate.returnsQuantity,
            salePrice,
            salesQuantity: aggregate.salesQuantity,
            shippingFee,
            sku: normalizeSku(aggregate.product.sku) ?? aggregate.product.id,
            unitCost: selectLatestProductCost(
              aggregate.product.productCosts.map((cost) => ({
                amount: String(cost.amount),
                createdAt: cost.createdAt,
                effectiveFrom: cost.effectiveFrom,
              })),
            ),
            userId: materializationUserId,
          })
          .onConflictDoUpdate({
            set: {
              commissionRate,
              productName: aggregate.product.name,
              returnsQuantity: aggregate.returnsQuantity,
              salePrice,
              salesQuantity: aggregate.salesQuantity,
              shippingFee,
              updatedAt: new Date(),
            },
            ...buildPerformanceConflictTarget(aggregate.product.id),
          });
      }
    });
  }

  private async requireCompany(organizationId: string, companyId: string): Promise<Company> {
    const company = await this.db.query.companies.findFirst({
      where: (table) =>
        and(
          eq(table.organizationId, organizationId),
          eq(table.id, companyId),
          eq(table.isActive, true),
        ),
    });

    if (!company) {
      throw new BadRequestException("Sync performance materialization requires a valid company.");
    }

    return company;
  }

  private async resolveActiveCompany(context: {
    organizationId: string;
    userId: string | null;
  }): Promise<Company> {
    const activeCompanies = await this.db.query.companies.findMany({
      orderBy: (table) => [table.createdAt],
      where: (table) =>
        and(
          eq(table.organizationId, context.organizationId),
          eq(table.isActive, true),
          ...(context.userId ? [eq(table.userId, context.userId)] : []),
        ),
    });

    if (activeCompanies.length !== 1) {
      throw new BadRequestException(
        activeCompanies.length === 0
          ? "Sync performance materialization requires exactly one active company."
          : "Sync performance materialization could not resolve a single active company.",
      );
    }

    return activeCompanies[0];
  }

  private async readOrdersForProvider(
    organizationId: string,
    companyId: string,
    providerSlug: string,
  ): Promise<ExternalOrderRow[]> {
    return this.db.query.externalOrders.findMany({
      where: (table) =>
        and(
          eq(table.organizationId, organizationId),
          eq(table.companyId, companyId),
          eq(table.provider, providerSlug),
        ),
      with: {
        fees: true,
        items: {
          with: {
            externalProduct: {
              columns: {
                linkedProductId: true,
                sku: true,
              },
            },
          },
        },
      },
    });
  }

  private async readProductsForCompany(
    organizationId: string,
    companyId: string,
  ): Promise<ProductRowWithFinance[]> {
    return this.db.query.products.findMany({
      where: (table) =>
        and(eq(table.organizationId, organizationId), eq(table.companyId, companyId)),
      with: {
        financeDefaults: true,
        productCosts: {
          orderBy: (table) => [table.effectiveFrom, table.createdAt],
        },
      },
    });
  }
}
