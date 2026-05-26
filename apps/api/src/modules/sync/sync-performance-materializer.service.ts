import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { divideMoney, parseMoney } from "@marginflow/domain";
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
} from "@marginflow/database";
import { and, eq } from "drizzle-orm";
import { DATABASE_CLIENT } from "@/common/tokens";
import { normalizeSku, selectLatestProductCost } from "@/modules/finance/finance.service";

type TenantContext = {
  organizationId: string;
  userId: string;
};

type ProductRowWithFinance = Product & {
  financeDefaults: ProductFinanceDefaults | null;
  productCosts: ProductCost[];
};

type ExternalOrderRow = ExternalOrder & {
  fees: ExternalFee[];
  items: Array<
    ExternalOrderItem & {
      externalProduct: Pick<ExternalProduct, "sku"> | null;
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

function sumFeeAmounts(fees: ExternalFee[], feeType: string) {
  return fees.reduce((sum, fee) => {
    if (fee.feeType !== feeType) {
      return sum;
    }

    return sum + parseMoney(String(fee.amount));
  }, 0n);
}

@Injectable()
export class SyncPerformanceMaterializerService {
  constructor(
    @Inject(DATABASE_CLIENT)
    private readonly db: DatabaseClient,
  ) {}

  async materializeForSync(input: {
    organizationId: string;
    providerSlug: string;
    syncRunId: string;
    userId: string;
  }) {
    const context = {
      organizationId: input.organizationId,
      userId: input.userId,
    } satisfies TenantContext;
    const activeCompany = await this.resolveActiveCompany(context);
    const [orders, productsList] = await Promise.all([
      this.readOrdersForProvider(input.organizationId, input.providerSlug),
      this.readProductsForOrganization(input.organizationId),
    ]);
    const productsBySku = new Map(
      productsList
        .map((product) => [normalizeSku(product.sku), product] as const)
        .filter((entry): entry is readonly [string, ProductRowWithFinance] => entry[0] !== null),
    );
    const aggregates = new Map<string, ProductAggregate>();

    for (const order of orders) {
      const referenceMonth = firstDayOfMonth(order.orderedAt);

      if (!referenceMonth || order.items.length === 0) {
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
        const normalizedSku = normalizeSku(item.externalProduct?.sku);

        if (!normalizedSku) {
          continue;
        }

        const matchedProduct = productsBySku.get(normalizedSku);

        if (!matchedProduct) {
          continue;
        }

        const key = [
          referenceMonth,
          input.providerSlug,
          normalizeSku(matchedProduct.sku) ?? matchedProduct.id,
        ].join("::");
        const aggregate = aggregates.get(key) ?? createAggregate(matchedProduct);
        aggregates.set(key, aggregate);
        aggregate.salesQuantity += item.quantity;

        if (isReturnLike) {
          aggregate.returnsQuantity += item.quantity;
          continue;
        }

        aggregate.revenueTotal += parseMoney(String(item.totalPrice));
        aggregate.commissionTotal += commissionAllocations[index] ?? 0n;
        aggregate.shippingTotal += shippingAllocations[index] ?? 0n;
      }
    }

    if (aggregates.size === 0) {
      return;
    }

    await this.db.transaction(async (tx) => {
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
            companyId: activeCompany.id,
            notes: null,
            organizationId: input.organizationId,
            packagingCost: aggregate.product.financeDefaults?.packagingCost ?? "0",
            productName: aggregate.product.name,
            referenceMonth,
            returnsQuantity: aggregate.returnsQuantity,
            salePrice,
            salesQuantity: aggregate.salesQuantity,
            shippingFee,
            sku: normalizeSku(aggregate.product.sku) ?? aggregate.product.id,
            taxRate: aggregate.product.financeDefaults?.taxRate ?? "0",
            unitCost: selectLatestProductCost(
              aggregate.product.productCosts.map((cost) => ({
                amount: String(cost.amount),
                createdAt: cost.createdAt,
                effectiveFrom: cost.effectiveFrom,
              })),
            ),
            userId: input.userId,
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
            target: [
              productMonthlyPerformance.organizationId,
              productMonthlyPerformance.companyId,
              productMonthlyPerformance.referenceMonth,
              productMonthlyPerformance.channel,
              productMonthlyPerformance.sku,
            ],
          });
      }
    });
  }

  private async resolveActiveCompany(context: TenantContext): Promise<Company> {
    const activeCompanies = await this.db.query.companies.findMany({
      orderBy: (table) => [table.createdAt],
      where: (table) =>
        and(
          eq(table.organizationId, context.organizationId),
          eq(table.userId, context.userId),
          eq(table.isActive, true),
        ),
    });

    if (activeCompanies.length !== 1) {
      throw new BadRequestException(
        activeCompanies.length === 0
          ? "Sync performance materialization requires exactly one active company for the authenticated user."
          : "Sync performance materialization could not resolve a single active company for the authenticated user.",
      );
    }

    return activeCompanies[0];
  }

  private async readOrdersForProvider(
    organizationId: string,
    providerSlug: string,
  ): Promise<ExternalOrderRow[]> {
    return this.db.query.externalOrders.findMany({
      where: (table) =>
        and(
          eq(table.organizationId, organizationId),
          eq(table.provider, providerSlug),
        ),
      with: {
        fees: true,
        items: {
          with: {
            externalProduct: {
              columns: {
                sku: true,
              },
            },
          },
        },
      },
    });
  }

  private async readProductsForOrganization(
    organizationId: string,
  ): Promise<ProductRowWithFinance[]> {
    return this.db.query.products.findMany({
      where: (table) => eq(table.organizationId, organizationId),
      with: {
        financeDefaults: true,
        productCosts: {
          orderBy: (table) => [table.effectiveFrom, table.createdAt],
        },
      },
    });
  }
}
