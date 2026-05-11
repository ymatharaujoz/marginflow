import {
  externalOrderItems,
  externalOrders,
  externalProducts,
  type DatabaseClient,
  type ExternalOrder,
  type ExternalOrderItem,
  type ExternalProduct,
  type Product,
} from "@marginflow/database";
import type {
  IntegrationProviderSlug,
  SyncedProductLinkedProduct,
  SyncedProductRecord,
  SyncedProductReviewStatus,
  SyncedProductSuggestedMatch,
} from "@marginflow/types";
import { and, desc, eq, inArray } from "drizzle-orm";

type ExternalProductOrderItemRow = ExternalOrderItem & {
  externalOrder: ExternalOrder | null;
};

type SyncedExternalProductRow = ExternalProduct & {
  linkedProduct: Product | null;
  orderItems: ExternalProductOrderItemRow[];
};

type LegacySyncedExternalProductRow = Omit<ExternalProduct, "linkedProductId" | "reviewStatus"> & {
  linkedProductId: string | null;
  reviewStatus: "unreviewed";
};

function toDecimalString(value: number | string | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toFixed(2);
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed.toFixed(2) : "0.00";
  }

  return "0.00";
}

function normalizeSku(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  return normalized.length > 0 ? normalized : null;
}

export function isMissingExternalProductReviewColumns(error: unknown) {
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

function selectLatestUnitPrice(orderItems: ExternalProductOrderItemRow[]) {
  const latestItem = [...orderItems].sort((left, right) => {
    const leftTime = left.externalOrder?.orderedAt?.getTime() ?? left.updatedAt.getTime();
    const rightTime = right.externalOrder?.orderedAt?.getTime() ?? right.updatedAt.getTime();
    return rightTime - leftTime;
  })[0];

  return latestItem ? toDecimalString(latestItem.unitPrice) : null;
}

function toLinkedProductSummary(product: Product | null): SyncedProductLinkedProduct | null {
  if (!product) {
    return null;
  }

  return {
    id: product.id,
    isActive: product.isActive,
    name: product.name,
    sku: product.sku,
  };
}

function toSuggestedMatches(
  externalProduct: ExternalProduct | LegacySyncedExternalProductRow,
  productsList: Product[],
  reviewStatus: SyncedProductReviewStatus,
): SyncedProductSuggestedMatch[] {
  if (
    externalProduct.linkedProductId ||
    reviewStatus === "ignored" ||
    reviewStatus === "imported_as_internal_product"
  ) {
    return [];
  }

  const normalizedExternalSku = normalizeSku(externalProduct.sku);

  if (!normalizedExternalSku) {
    return [];
  }

  return productsList
    .filter((product) => normalizeSku(product.sku) === normalizedExternalSku)
    .slice(0, 3)
    .map((product) => ({
      isActive: product.isActive,
      name: product.name,
      productId: product.id,
      reason: "sku_exact" as const,
      sku: product.sku,
    }));
}

function toSyncedProductRecord(
  row: SyncedExternalProductRow,
  productsList: Product[],
): SyncedProductRecord {
  const uniqueOrderIds = new Set<string>();
  let unitsSold = 0;
  let grossRevenue = 0;
  let lastOrderedAt: string | null = null;

  for (const item of row.orderItems) {
    uniqueOrderIds.add(item.externalOrderId);
    unitsSold += item.quantity;
    grossRevenue += Number(item.totalPrice) || 0;

    const orderedAt = item.externalOrder?.orderedAt ?? null;
    const orderedAtIso = orderedAt ? orderedAt.toISOString() : null;

    if (orderedAtIso && (!lastOrderedAt || orderedAtIso > lastOrderedAt)) {
      lastOrderedAt = orderedAtIso;
    }
  }

  return {
    externalProductId: row.externalProductId,
    grossRevenue: toDecimalString(grossRevenue),
    id: row.id,
    lastOrderedAt,
    latestUnitPrice: selectLatestUnitPrice(row.orderItems),
    linkedProduct: toLinkedProductSummary(row.linkedProduct),
    orderCount: uniqueOrderIds.size,
    provider: row.provider as IntegrationProviderSlug,
    reviewStatus: row.reviewStatus as SyncedProductReviewStatus,
    sku: row.sku,
    suggestedMatches: toSuggestedMatches(
      row,
      productsList,
      row.reviewStatus as SyncedProductReviewStatus,
    ),
    title: row.title,
    unitsSold,
  };
}

async function readSyncedExternalProducts(
  db: DatabaseClient,
  organizationId: string,
  providerSlug: IntegrationProviderSlug,
): Promise<Array<ExternalProduct | LegacySyncedExternalProductRow>> {
  try {
    return await db
      .select()
      .from(externalProducts)
      .where(
        and(eq(externalProducts.organizationId, organizationId), eq(externalProducts.provider, providerSlug)),
      )
      .orderBy(desc(externalProducts.updatedAt), desc(externalProducts.createdAt));
  } catch (error) {
    if (!isMissingExternalProductReviewColumns(error)) {
      throw error;
    }

    const legacyRows = await db
      .select({
        createdAt: externalProducts.createdAt,
        externalProductId: externalProducts.externalProductId,
        id: externalProducts.id,
        marketplaceConnectionId: externalProducts.marketplaceConnectionId,
        metadata: externalProducts.metadata,
        organizationId: externalProducts.organizationId,
        provider: externalProducts.provider,
        sku: externalProducts.sku,
        title: externalProducts.title,
        updatedAt: externalProducts.updatedAt,
      })
      .from(externalProducts)
      .where(
        and(eq(externalProducts.organizationId, organizationId), eq(externalProducts.provider, providerSlug)),
      )
      .orderBy(desc(externalProducts.updatedAt), desc(externalProducts.createdAt));

    return legacyRows.map((row) => ({
      ...row,
      linkedProductId: null,
      reviewStatus: "unreviewed" as const,
    }));
  }
}

export async function listSyncedProductsReadModel(input: {
  db: DatabaseClient;
  organizationId: string;
  productsList: Product[];
  providerSlug: IntegrationProviderSlug;
}): Promise<SyncedProductRecord[]> {
  const externalProductRows = await readSyncedExternalProducts(
    input.db,
    input.organizationId,
    input.providerSlug,
  );

  if (externalProductRows.length === 0) {
    return [];
  }

  const productRowsById = new Map(input.productsList.map((row) => [row.id, row] as const));
  const externalProductIds = externalProductRows.map((row) => row.id);
  const orderItemRows = await input.db
    .select({
      externalOrder: externalOrders,
      orderItem: externalOrderItems,
    })
    .from(externalOrderItems)
    .leftJoin(externalOrders, eq(externalOrderItems.externalOrderId, externalOrders.id))
    .where(
      and(
        eq(externalOrderItems.organizationId, input.organizationId),
        inArray(externalOrderItems.externalProductId, externalProductIds),
      ),
    );

  const orderItemsByExternalProductId = new Map<string, ExternalProductOrderItemRow[]>();

  for (const row of orderItemRows) {
    const externalProductId = row.orderItem.externalProductId;

    if (!externalProductId) {
      continue;
    }

    const currentItems = orderItemsByExternalProductId.get(externalProductId) ?? [];
    currentItems.push({
      ...row.orderItem,
      externalOrder: row.externalOrder,
    });
    orderItemsByExternalProductId.set(externalProductId, currentItems);
  }

  return externalProductRows.map((row) =>
    toSyncedProductRecord(
      {
        ...row,
        linkedProduct: row.linkedProductId ? productRowsById.get(row.linkedProductId) ?? null : null,
        orderItems: orderItemsByExternalProductId.get(row.id) ?? [],
      },
      input.productsList,
    ),
  );
}
