import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { DatabaseClient } from "@lucreii/database";
import type {
  ExternalFee,
  ExternalOrder,
  ExternalOrderItem,
  ExternalProduct,
  Product,
  ProductCost,
  ProductFinanceDefaults,
  ProductImage,
} from "@lucreii/database";
import type {
  OrderCanonicalStatus,
  OrderComposition,
  OrderDetails,
  OrderLineItem,
  OrderListFilters,
  OrderListItem,
  OrdersListSummary,
  OrdersListResponse,
  OrderStatusLabel,
  OrderStatusOption,
} from "@lucreii/types";
import { and, desc, eq, inArray } from "drizzle-orm";
import { DATABASE_CLIENT } from "@/common/tokens";

type TenantContext = {
  organizationId: string;
  selectedCompanyId: string | null | undefined;
  userId: string;
};

type LinkedProductRecord = Product & {
  financeDefaults: ProductFinanceDefaults | null;
  images: ProductImage[];
  latestCost?: ProductCost | null;
  productCosts?: ProductCost[];
};

type OrderRow = ExternalOrder & {
  fees: ExternalFee[];
  items: Array<
    ExternalOrderItem & {
      externalProduct:
        | (ExternalProduct & {
            linkedProduct?: LinkedProductRecord | null;
          })
        | null;
    }
  >;
};

type OrderRowShallow = ExternalOrder & {
  fees: ExternalFee[];
  items: Array<
    ExternalOrderItem & {
      externalProduct: ExternalProduct | null;
    }
  >;
};

const ORDER_STATUS_OPTIONS: OrderStatusOption[] = [
  { value: "confirmed", label: "Pagamento pendente" },
  { value: "payment_required", label: "Pagamento obrigatório" },
  { value: "payment_in_process", label: "Pagamento em processamento" },
  { value: "partially_paid", label: "Pagamento parcial" },
  { value: "paid", label: "Pagamento aprovado" },
  { value: "partially_refunded", label: "Reembolso parcial" },
  { value: "pending_cancel", label: "Cancelamento pendente" },
  { value: "cancelled", label: "Cancelado" },
];

const MELI_STATUS_SET = new Set<OrderCanonicalStatus>(
  ORDER_STATUS_OPTIONS.map((option) => option.value),
);

function toIsoString(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
}

function toDateOnly(value: Date | string | null | undefined) {
  const iso = toIsoString(value);
  return iso ? iso.slice(0, 10) : null;
}

function toNumber(value: string | number | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function toMoney(value: string | number | null | undefined) {
  return toNumber(value).toFixed(2);
}

function parseMoneyToCents(value: string | number | null | undefined) {
  return BigInt(Math.round(toNumber(value) * 100));
}

function formatCents(value: bigint) {
  const sign = value < 0n ? "-" : "";
  const absolute = value < 0n ? value * -1n : value;
  const whole = absolute / 100n;
  const cents = absolute % 100n;
  return `${sign}${whole.toString()}.${cents.toString().padStart(2, "0")}`;
}

function allocateCentsByWeights(totalCents: bigint, weights: bigint[]) {
  if (totalCents === 0n || weights.length === 0) {
    return weights.map(() => 0n);
  }

  const weightsTotal = weights.reduce((sum, value) => sum + value, 0n);
  if (weightsTotal === 0n) {
    return weights.map(() => 0n);
  }

  const allocations: bigint[] = [];
  let remaining = totalCents;

  for (let index = 0; index < weights.length; index += 1) {
    if (index === weights.length - 1) {
      allocations.push(remaining);
      break;
    }

    const allocation = (totalCents * weights[index]) / weightsTotal;
    allocations.push(allocation);
    remaining -= allocation;
  }

  return allocations;
}

function toPercentString(
  numeratorCents: bigint,
  denominatorCents: bigint,
) {
  if (denominatorCents <= 0n) {
    return null;
  }

  const sign = numeratorCents < 0n ? "-" : "";
  const absoluteNumerator = numeratorCents < 0n ? numeratorCents * -1n : numeratorCents;
  const scale = 10000n;
  const scaled = absoluteNumerator * scale;
  const quotient = scaled / denominatorCents;
  const remainder = scaled % denominatorCents;
  const rounded = remainder * 2n >= denominatorCents ? quotient + 1n : quotient;
  const whole = rounded / 100n;
  const fraction = rounded % 100n;

  return `${sign}${whole.toString()}.${fraction.toString().padStart(2, "0")}`;
}

function includesIgnoreCase(haystack: string | null | undefined, needle: string) {
  if (!haystack) {
    return false;
  }

  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function getOrderStatusLabel(status: OrderCanonicalStatus): OrderStatusLabel {
  return (
    ORDER_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status
  );
}

function normalizeOrderStatus(
  provider: string,
  status: string,
  metadata: Record<string, unknown>,
): OrderCanonicalStatus {
  const normalized = status.trim().toLowerCase();
  const detail = String(metadata.status_detail ?? "").trim().toLowerCase();
  const returned =
    metadata.returned === true ||
    metadata.refunded === true ||
    includesIgnoreCase(detail, "refund") ||
    includesIgnoreCase(detail, "return");

  if (returned || normalized.includes("refund")) {
    return "partially_refunded";
  }

  if (MELI_STATUS_SET.has(normalized as OrderCanonicalStatus)) {
    return normalized as OrderCanonicalStatus;
  }

  if (
    [
      "completed",
      "delivered",
      "ready_to_ship",
      "shipped",
      "processing",
      "invoice_pending",
      "to_be_agreed",
      "to_be_arranged",
      "packed",
      "pickup_ready",
    ].includes(normalized) ||
    normalized.includes("deliver") ||
    normalized.includes("ship")
  ) {
    return "paid";
  }

  if (["payment_required", "unpaid", "pending"].includes(normalized)) {
    return "payment_required";
  }

  if (["payment_in_process", "processing_payment"].includes(normalized)) {
    return "payment_in_process";
  }

  if (["partially_paid"].includes(normalized)) {
    return "partially_paid";
  }

  if (
    ["cancelled", "canceled", "cancel"].includes(normalized) ||
    normalized.includes("cancel")
  ) {
    return provider === "mercadolivre" && normalized === "pending_cancel"
      ? "pending_cancel"
      : "cancelled";
  }

  if (["confirmed", "created"].includes(normalized)) {
    return "confirmed";
  }

  if (normalized.includes("paid") || normalized.includes("approved")) {
    return "paid";
  }

  return "confirmed";
}

function sumFeesByPredicate(
  fees: ExternalFee[],
  predicate: (fee: ExternalFee) => boolean,
) {
  return fees.reduce((total, fee) => {
    return predicate(fee) ? total + toNumber(fee.amount) : total;
  }, 0);
}

function getPrimaryImageUrl(
  images:
    | Array<{
        position: number;
        url: string;
      }>
    | null
    | undefined,
) {
  return (
    images
      ?.slice()
      .sort((left, right) => left.position - right.position)[0]?.url ?? null
  );
}

function readMetadataMoney(
  metadata: Record<string, unknown>,
  key: string,
) {
  const value = metadata[key];

  if (typeof value === "string" || typeof value === "number") {
    return toNumber(value);
  }

  return 0;
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

function resolveLatestCostAmount(product: LinkedProductRecord | null | undefined) {
  if (!product) {
    return null;
  }

  if (product.latestCost) {
    return toNumber(product.latestCost.amount);
  }

  const latestCost =
    product.productCosts
      ?.slice()
      .sort((left, right) => {
        const leftDate = toIsoString(left.effectiveFrom ?? left.createdAt) ?? "";
        const rightDate = toIsoString(right.effectiveFrom ?? right.createdAt) ?? "";
        return rightDate.localeCompare(leftDate);
      })[0] ?? null;

  return latestCost ? toNumber(latestCost.amount) : null;
}

function buildOrderDisplayNameMaps(order: OrderRow) {
  const parentNameByGroupKey = new Map<string, string>();
  const displayNameByItemId = new Map<string, string>();
  const linkedItems = order.items.filter(
    (item) => item.externalProduct?.linkedProductId && item.externalProduct,
  );

  for (const item of linkedItems) {
    const externalProduct = item.externalProduct!;
    if (externalProduct.provider !== "mercadolivre") {
      continue;
    }

    const metadata = readMercadoLivreSyncMetadata(
      (externalProduct.metadata ?? {}) as Record<string, unknown>,
    );
    const itemId =
      metadata.itemId ?? extractMercadoLivreItemId(externalProduct.externalProductId);
    if (!itemId) {
      continue;
    }

    const groupKey = toCatalogGroupKey(itemId);
    const isVariation =
      metadata.variationId !== null ||
      externalProduct.externalProductId.includes(":");
    const trimmedTitle = externalProduct.title?.trim() || null;

    if (!isVariation && trimmedTitle) {
      parentNameByGroupKey.set(groupKey, trimmedTitle);
    }
  }

  for (const item of linkedItems) {
    const externalProduct = item.externalProduct!;
    const fallbackName = externalProduct.title?.trim() || "Produto sem titulo";

    if (externalProduct.provider !== "mercadolivre") {
      displayNameByItemId.set(item.id, fallbackName);
      continue;
    }

    const metadata = readMercadoLivreSyncMetadata(
      (externalProduct.metadata ?? {}) as Record<string, unknown>,
    );
    const itemId =
      metadata.itemId ?? extractMercadoLivreItemId(externalProduct.externalProductId);
    if (!itemId) {
      displayNameByItemId.set(item.id, fallbackName);
      continue;
    }

    const groupKey = toCatalogGroupKey(itemId);
    const isVariation =
      metadata.variationId !== null ||
      externalProduct.externalProductId.includes(":");

    if (!isVariation) {
      displayNameByItemId.set(item.id, fallbackName);
      continue;
    }

    const parentName = parentNameByGroupKey.get(groupKey);
    const linkedProductName = externalProduct.linkedProduct?.name?.trim() || null;
    displayNameByItemId.set(
      item.id,
      parentName || linkedProductName
        ? `${fallbackName} | ${parentName ?? linkedProductName}`
        : fallbackName,
    );
  }

  return displayNameByItemId;
}

function toOrderListItem(order: OrderRow): OrderListItem {
  const metadata = (order.metadata ?? {}) as Record<string, unknown>;
  const totalWithFees = toNumber(order.totalAmount);
  const totalFees = order.fees.reduce((total, fee) => total + toNumber(fee.amount), 0);
  const shippingAmount =
    sumFeesByPredicate(order.fees, (fee) => fee.feeType === "shipping_cost") ||
    readMetadataMoney(metadata, "shippingCostAmount");
  const tariffAmount = sumFeesByPredicate(
    order.fees,
    (fee) => fee.feeType === "marketplace_commission",
  );
  const fixedCostAmount =
    sumFeesByPredicate(order.fees, (fee) => fee.feeType === "fixed_fee") ||
    readMetadataMoney(metadata, "fixedCostAmount");
  const totalWithoutFees = Math.max(0, totalWithFees - totalFees);
  const itemsSold = order.items.reduce((total, item) => total + item.quantity, 0);
  const canonicalStatus = normalizeOrderStatus(order.provider, order.status, metadata);

  return {
    createdAt: toIsoString(order.createdAt)!,
    currency: order.currency,
    fixedCostAmount: fixedCostAmount.toFixed(2),
    id: order.id,
    itemsSold,
    orderDate: toDateOnly(order.orderedAt),
    orderId: order.externalOrderId,
    orderedAt: toIsoString(order.orderedAt),
    provider: order.provider as "mercadolivre" | "shopee" | "shein",
    shippingAmount: shippingAmount.toFixed(2),
    sourceStatus: order.status,
    status: canonicalStatus,
    statusLabel: getOrderStatusLabel(canonicalStatus),
    tariffAmount: tariffAmount.toFixed(2),
    totalFees: totalFees.toFixed(2),
    totalWithFees: totalWithFees.toFixed(2),
    totalWithoutFees: totalWithoutFees.toFixed(2),
  };
}

function toOrderLineItems(order: OrderRow): OrderLineItem[] {
  const orderRow = toOrderListItem(order);
  const displayNameByItemId = buildOrderDisplayNameMaps(order);
  const itemTotalsCents = order.items.map((item) => parseMoneyToCents(item.totalPrice));
  const commissionTotalCents = parseMoneyToCents(orderRow.tariffAmount);
  const shippingOrFixedFeeTotalCents =
    parseMoneyToCents(orderRow.shippingAmount) +
    parseMoneyToCents(orderRow.fixedCostAmount);
  const commissionAllocations = allocateCentsByWeights(
    commissionTotalCents,
    itemTotalsCents,
  );
  const shippingOrFixedFeeAllocations = allocateCentsByWeights(
    shippingOrFixedFeeTotalCents,
    itemTotalsCents,
  );

  return order.items.map((item, index) => {
    const linkedProduct = item.externalProduct?.linkedProduct;
    const revenueCents = itemTotalsCents[index] ?? 0n;
    const commissionCents = commissionAllocations[index] ?? 0n;
    const shippingOrFixedFeeCents = shippingOrFixedFeeAllocations[index] ?? 0n;
    const netRevenueCents = revenueCents - commissionCents - shippingOrFixedFeeCents;
    const packagingCostCents = linkedProduct
      ? parseMoneyToCents(linkedProduct.financeDefaults?.packagingCost) *
        BigInt(item.quantity)
      : 0n;
    const latestCostAmount = resolveLatestCostAmount(linkedProduct);
    const productCostCents =
      latestCostAmount === null
        ? null
        : parseMoneyToCents(latestCostAmount) * BigInt(item.quantity);
    const totalProfitCents =
      linkedProduct && productCostCents !== null
        ? netRevenueCents - productCostCents - packagingCostCents
        : null;

    return {
      channel: orderRow.provider,
      contributionMarginPercent:
        totalProfitCents === null
          ? null
          : toPercentString(totalProfitCents, revenueCents),
      displayName:
        displayNameByItemId.get(item.id) ??
        item.externalProduct?.title?.trim() ??
        "Produto sem titulo",
      id: item.id,
      imageUrl: getPrimaryImageUrl(item.externalProduct?.linkedProduct?.images),
      linkedProductId: item.externalProduct?.linkedProductId ?? null,
      netRevenueAmount: formatCents(netRevenueCents),
      orderedAt: orderRow.orderedAt,
      productName: item.externalProduct?.title?.trim() || "Produto sem titulo",
      quantity: item.quantity,
      sku: item.externalProduct?.sku?.trim() || null,
      totalPrice: toMoney(item.totalPrice),
      totalProfitAmount:
        totalProfitCents === null ? null : formatCents(totalProfitCents),
      unitPrice: toMoney(item.unitPrice),
    };
  });
}

function buildOrderComposition(
  order: OrderRow,
  _taxRateDefault: string | number | null | undefined,
): OrderComposition {
  const orderRow = toOrderListItem(order);
  const revenueAmount = toNumber(orderRow.totalWithFees);
  const shippingOrFixedFeeAmount =
    toNumber(orderRow.shippingAmount) + toNumber(orderRow.fixedCostAmount);
  const marketplaceCommissionAmount = toNumber(orderRow.tariffAmount);
  const netRevenueAmount =
    revenueAmount - marketplaceCommissionAmount - shippingOrFixedFeeAmount;

  let productCostAmount = 0;
  let packagingCostAmount = 0;
  let missingLinkedItemsCount = 0;
  let missingCostItemsCount = 0;

  for (const item of order.items) {
    const linkedProduct = item.externalProduct?.linkedProduct;
    if (!linkedProduct || !item.externalProduct?.linkedProductId) {
      missingLinkedItemsCount += 1;
      missingCostItemsCount += 1;
      continue;
    }

    const latestCostAmount = resolveLatestCostAmount(linkedProduct);
    if (latestCostAmount === null) {
      missingCostItemsCount += 1;
    } else {
      productCostAmount += latestCostAmount * item.quantity;
    }

    packagingCostAmount +=
      toNumber(linkedProduct.financeDefaults?.packagingCost) * item.quantity;
  }

  return {
    hasIncompleteCostData:
      missingLinkedItemsCount > 0 || missingCostItemsCount > 0,
    marketplaceCommissionAmount: marketplaceCommissionAmount.toFixed(2),
    missingCostItemsCount,
    missingLinkedItemsCount,
    netRevenueAmount: netRevenueAmount.toFixed(2),
    packagingCostAmount: packagingCostAmount.toFixed(2),
    productCostAmount: productCostAmount.toFixed(2),
    revenueAmount: revenueAmount.toFixed(2),
    shippingOrFixedFeeAmount: shippingOrFixedFeeAmount.toFixed(2),
  };
}

function buildEmptyOrdersSummary(): OrdersListSummary {
  return {
    averageMargin: "0.00",
    grossProfit: "0.00",
    grossRevenue: "0.00",
    ordersCount: 0,
    unitsSold: 0,
  };
}

function buildOrdersSummary(rows: OrderRow[]): OrdersListSummary {
  if (rows.length === 0) {
    return buildEmptyOrdersSummary();
  }

  let grossRevenue = 0;
  let grossProfit = 0;
  let unitsSold = 0;

  for (const row of rows) {
    const order = toOrderListItem(row);
    const composition = buildOrderComposition(row, null);
    const orderGrossProfit =
      toNumber(composition.netRevenueAmount) -
      toNumber(composition.productCostAmount) -
      toNumber(composition.packagingCostAmount);

    grossRevenue += toNumber(order.totalWithFees);
    grossProfit += orderGrossProfit;
    unitsSold += order.itemsSold;
  }

  const averageMargin = grossRevenue > 0 ? grossProfit / grossRevenue : 0;

  return {
    averageMargin: averageMargin.toFixed(4),
    grossProfit: grossProfit.toFixed(4),
    grossRevenue: grossRevenue.toFixed(4),
    ordersCount: rows.length,
    unitsSold,
  };
}

@Injectable()
export class OrdersService {
  constructor(
    @Inject(DATABASE_CLIENT)
    private readonly db: DatabaseClient,
  ) {}

  async listOrders(
    authContext: TenantContext,
    filters: OrderListFilters = {},
  ): Promise<OrdersListResponse> {
    const companyId = this.requireSelectedCompanyId(authContext);
    const page = Number.isFinite(filters.page) ? Math.trunc(filters.page ?? 1) : 1;
    const pageSize = Number.isFinite(filters.pageSize)
      ? Math.trunc(filters.pageSize ?? 20)
      : 20;
    const rows = await this.db.query.externalOrders.findMany({
      orderBy: (table) => [desc(table.orderedAt), desc(table.createdAt)],
      where: (table) =>
        and(
          eq(table.organizationId, authContext.organizationId),
          eq(table.companyId, companyId),
          ...(filters.provider ? [eq(table.provider, filters.provider)] : []),
        ),
      with: {
        fees: true,
        items: {
          with: {
            externalProduct: true,
          },
        },
      },
    });

    const hydratedRows = await this.hydrateLinkedProducts(
      authContext,
      companyId,
      rows as OrderRowShallow[],
    );
    const mapped = hydratedRows
      .map((row) => toOrderListItem(row))
      .filter((row) => {
        if (filters.search && !includesIgnoreCase(row.orderId, filters.search)) {
          return false;
        }

        if (filters.status && row.status !== filters.status) {
          return false;
        }

        return true;
      });
    const filteredRowIds = new Set(mapped.map((row) => row.id));
    const filteredHydratedRows = hydratedRows.filter((row) =>
      filteredRowIds.has(row.id),
    );

    const totalItems = mapped.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;

    return {
      availableStatuses: ORDER_STATUS_OPTIONS,
      items: mapped.slice(start, start + pageSize),
      page: safePage,
      pageSize,
      summary: buildOrdersSummary(filteredHydratedRows),
      totalItems,
      totalPages,
    };
  }

  async getOrderDetails(
    authContext: TenantContext,
    orderRecordId: string,
  ): Promise<OrderDetails> {
    const companyId = this.requireSelectedCompanyId(authContext);
    const [company, row] = await Promise.all([
      this.db.query.companies.findFirst({
        where: (table) =>
          and(
            eq(table.id, companyId),
            eq(table.organizationId, authContext.organizationId),
          ),
      }),
      this.db.query.externalOrders.findFirst({
        where: (table) =>
          and(
            eq(table.id, orderRecordId),
            eq(table.organizationId, authContext.organizationId),
            eq(table.companyId, companyId),
          ),
        with: {
          fees: true,
          items: {
            with: {
              externalProduct: true,
            },
          },
        },
      }),
    ]);

    if (!row) {
      throw new NotFoundException("Order not found.");
    }

    const shallowRow = row as OrderRowShallow;
    const [hydratedRow] = await this.hydrateLinkedProducts(
      authContext,
      companyId,
      [shallowRow],
    );

    return {
      composition: buildOrderComposition(
        hydratedRow,
        company?.taxRateDefault,
      ),
      items: toOrderLineItems(hydratedRow),
      order: toOrderListItem(hydratedRow),
    };
  }

  private requireSelectedCompanyId(context: TenantContext) {
    if (!context.selectedCompanyId) {
      throw new BadRequestException("Selected company required.");
    }

    return context.selectedCompanyId;
  }

  private async hydrateLinkedProducts(
    authContext: TenantContext,
    companyId: string,
    rows: OrderRowShallow[],
  ): Promise<OrderRow[]> {
    const linkedProductIds = [
      ...new Set(
        rows
          .flatMap((row) =>
            row.items.map((item) => item.externalProduct?.linkedProductId ?? null),
          )
          .filter((value): value is string => value !== null),
      ),
    ];
    const linkedProducts =
      linkedProductIds.length === 0
        ? []
        : await this.db.query.products.findMany({
            where: (table) =>
              and(
                eq(table.organizationId, authContext.organizationId),
                eq(table.companyId, companyId),
                inArray(table.id, linkedProductIds),
              ),
            with: {
              financeDefaults: true,
              images: true,
              productCosts: true,
            },
          });
    const linkedProductById = new Map(
      linkedProducts.map((product) => [product.id, product as LinkedProductRecord] as const),
    );

    return rows.map((row) => ({
      ...row,
      items: row.items.map((item) => ({
        ...item,
        externalProduct: item.externalProduct
          ? {
              ...item.externalProduct,
              linkedProduct: item.externalProduct.linkedProductId
                ? linkedProductById.get(item.externalProduct.linkedProductId) ?? null
                : null,
            }
          : null,
      })),
    }));
  }
}
