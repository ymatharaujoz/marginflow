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
} from "@lucreii/database";
import type {
  OrderDetails,
  OrderLineItem,
  OrderListFilters,
  OrderListItem,
  OrdersListResponse,
} from "@lucreii/types";
import { and, desc, eq } from "drizzle-orm";
import { DATABASE_CLIENT } from "@/common/tokens";
type TenantContext = {
  organizationId: string;
  selectedCompanyId: string | null | undefined;
  userId: string;
};

type OrderRow = ExternalOrder & {
  fees: ExternalFee[];
  items: Array<
    ExternalOrderItem & {
      externalProduct:
        | (ExternalProduct & {
            linkedProduct?:
              | {
                  images: Array<{
                    position: number;
                    url: string;
                  }>;
                }
              | null;
          })
        | null;
    }
  >;
};

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

function includesIgnoreCase(haystack: string | null | undefined, needle: string) {
  if (!haystack) {
    return false;
  }

  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function mapStatusLabel(status: string, metadata: Record<string, unknown>) {
  const normalized = status.trim().toLowerCase();
  const hasReturnSignal =
    metadata.returned === true ||
    metadata.refunded === true ||
    includesIgnoreCase(String(metadata.status_detail ?? ""), "return") ||
    includesIgnoreCase(String(metadata.status_detail ?? ""), "refund");

  if (hasReturnSignal || normalized.includes("return") || normalized.includes("refund")) {
    return "Devolução";
  }

  if (["completed", "delivered"].includes(normalized) || normalized.includes("deliver")) {
    return "Entregue";
  }

  if (
    ["paid", "payment_approved", "ready_to_ship"].includes(normalized) ||
    normalized.includes("paid") ||
    normalized.includes("approved")
  ) {
    return "Pagamento aprovado";
  }

  return status;
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
    tariffAmount: tariffAmount.toFixed(2),
    status: order.status,
    statusLabel: mapStatusLabel(order.status, metadata),
    totalFees: totalFees.toFixed(2),
    totalWithFees: totalWithFees.toFixed(2),
    totalWithoutFees: totalWithoutFees.toFixed(2),
  };
}

function toOrderLineItems(order: OrderRow): OrderLineItem[] {
  return order.items.map((item) => ({
    id: item.id,
    imageUrl: getPrimaryImageUrl(item.externalProduct?.linkedProduct?.images),
    linkedProductId: item.externalProduct?.linkedProductId ?? null,
    productName: item.externalProduct?.title?.trim() || "Produto sem titulo",
    quantity: item.quantity,
    sku: item.externalProduct?.sku?.trim() || null,
    totalPrice: toMoney(item.totalPrice),
    unitPrice: toMoney(item.unitPrice),
  }));
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

    const mapped = (rows as OrderRow[])
      .map((row) => toOrderListItem(row))
      .filter((row) => {
        if (filters.search && !includesIgnoreCase(row.orderId, filters.search)) {
          return false;
        }

        if (
          filters.status &&
          row.status !== filters.status &&
          !includesIgnoreCase(row.statusLabel, filters.status)
        ) {
          return false;
        }

        return true;
      });

    const totalItems = mapped.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;

    return {
      items: mapped.slice(start, start + pageSize),
      page: safePage,
      pageSize,
      totalItems,
      totalPages,
    };
  }

  async getOrderDetails(
    authContext: TenantContext,
    orderRecordId: string,
  ): Promise<OrderDetails> {
    const companyId = this.requireSelectedCompanyId(authContext);
    const row = (await this.db.query.externalOrders.findFirst({
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
            externalProduct: {
              with: {
                linkedProduct: {
                  with: {
                    images: true,
                  },
                },
              },
            },
          },
        },
      },
    })) as OrderRow | undefined;

    if (!row) {
      throw new NotFoundException("Order not found.");
    }

    return {
      items: toOrderLineItems(row),
      order: toOrderListItem(row),
    };
  }

  private requireSelectedCompanyId(context: TenantContext) {
    if (!context.selectedCompanyId) {
      throw new BadRequestException("Selected company required.");
    }

    return context.selectedCompanyId;
  }
}
