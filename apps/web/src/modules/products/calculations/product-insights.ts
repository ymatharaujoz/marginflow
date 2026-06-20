import type {
  ProductPerformanceRow,
  ProductAnalyticsRow,
  ProductFinancialState,
  ProductListItem,
  ProductMonthlyPerformanceDisplayRow,
} from "@lucreii/types";
import { parseProtectedNumber } from "@/lib/protected-numbers";
import type {
  ProductCatalogData,
  ProductInsight,
  ProductMarketplaceNotice,
  CatalogStats,
  ProductTableRow,
} from "../types/products";

function toNumber(value: string | null | undefined) {
  return parseProtectedNumber(value, { allowInfinity: true }) ?? 0;
}

function toDecimalString(value: number, fractionDigits = 2) {
  return value.toFixed(fractionDigits);
}

function resolveNetLiquidSales(salesQuantity: number, returnsQuantity: number): number {
  const sales = Math.max(0, salesQuantity);
  const cappedReturns = Math.max(0, Math.min(returnsQuantity, sales));
  return Math.max(0, sales - cappedReturns);
}

function deriveRowFinancials(
  row: ProductMonthlyPerformanceDisplayRow,
  taxRateDefault: number,
  marketplaceCommissionTotal: number | null = null,
): {
  netLiquidSales: number;
  revenue: number;
  totalCommission: number;
  totalProfit: number;
  totalPackagingCost: number;
  totalProductCost: number;
  unitProfit: number | null;
  contributionMarginRatio: number | null;
  roiRatio: number | null;
  minimumRoas: number | null;
  actualRoas: number | null;
} {
  const netLiquidSales = resolveNetLiquidSales(row.salesQuantity, row.returnsQuantity);

  const sellingPrice = toNumber(row.salePrice);
  const commissionRate = toNumber(row.commissionRate);
  const shippingFee = toNumber(row.shippingFee);
  const packagingCost = toNumber(row.packagingCost);
  const unitCost = toNumber(row.unitCost);
  const advertising = toNumber(row.advertisingCost);
  const marketplaceCommission = toNumber(row.marketplaceCommission ?? "0") || commissionRate * sellingPrice;

  const revenue = sellingPrice * netLiquidSales;
  const totalCommission = marketplaceCommissionTotal ?? marketplaceCommission * netLiquidSales;
  const totalShipping = shippingFee * netLiquidSales;
  const totalTax = revenue * taxRateDefault;
  const totalPackagingCost = packagingCost * netLiquidSales;
  const totalProductCost = unitCost * netLiquidSales;

  const totalProfit =
    revenue
    - totalCommission
    - totalShipping
    - totalTax
    - totalPackagingCost
    - totalProductCost;

  const unitProfit = netLiquidSales > 0 ? totalProfit / netLiquidSales : null;
  const contributionMarginRatio =
    unitProfit !== null && sellingPrice > 0 ? unitProfit / sellingPrice : null;
  const roiRatio = unitProfit !== null && unitCost > 0 ? unitProfit / unitCost : null;
  const minimumRoas =
    contributionMarginRatio !== null && contributionMarginRatio > 0
      ? 1 / contributionMarginRatio
      : null;
  const actualRoas = advertising > 0 ? revenue / advertising : null;

  return {
    actualRoas,
    contributionMarginRatio,
    minimumRoas,
    netLiquidSales,
    revenue,
    roiRatio,
    totalCommission,
    totalPackagingCost,
    totalProductCost,
    totalProfit,
    unitProfit,
  };
}

function getProductId(row: { name: string; sku: string | null }): string {
  return row.sku?.trim() ? row.sku : row.name;
}

function extractVariationLabel(title: string | null): string | null {
  if (!title) {
    return null;
  }

  const parts = title
    .split(" - ")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 2) {
    return null;
  }

  return parts[parts.length - 1] ?? null;
}

function resolveProductDisplayName(productName: string, variationLabel: string | null): string {
  if (!variationLabel) {
    return productName;
  }

  const suffix = ` - ${variationLabel}`;
  if (productName.endsWith(suffix)) {
    return productName.slice(0, -suffix.length);
  }

  return productName;
}

function resolveMinimumRoas(row: ProductAnalyticsRow): number | null {
  const contribution = parseProtectedNumber(row.contributionMargin) ?? 0;
  if (contribution <= 0) return null;
  const raw = parseProtectedNumber(row.minimumRoas, { allowInfinity: true });
  if (raw === null || raw === Number.POSITIVE_INFINITY || !Number.isFinite(raw)) return null;
  return raw;
}

export function buildCatalogStats(data: ProductCatalogData): CatalogStats {
  return data.catalogStats;
}

export function buildProductInsights(
  data: ProductCatalogData,
  stats: CatalogStats,
  rows: ProductTableRow[],
): ProductInsight[] {
  const insights: ProductInsight[] = [];

  // Agregar métricas primeiro para calcular insight de devoluções
  let totalRevenue = 0;
  let totalAdSpend = 0;

  const productMetrics: Array<{
    id: string;
    name: string;
    sku: string;
    profit: number;
    shipping: number;
    adSpend: number;
    roas: number | null;
    returns: number;
  }> = [];

  for (const row of rows) {
    totalRevenue += row.revenue;
    totalAdSpend += row.adSpend;

    productMetrics.push({
      id: row.id,
      name: row.name,
      sku: row.sku,
      profit: row.totalProfit,
      shipping: row.shipping,
      adSpend: row.adSpend,
      roas: row.actualRoas,
      returns: row.returns,
    });
  }

  // Ordenar métricas para os insights
  const byProfitDesc = [...productMetrics].sort((a, b) => b.profit - a.profit);
  const byReturnsDesc = [...productMetrics]
    .filter((p) => p.returns > 0)
    .sort((a, b) => b.returns - a.returns);
  const byShippingDesc = [...productMetrics]
    .filter((p) => p.shipping > 0)
    .sort((a, b) => b.shipping - a.shipping);
  const byRoasDesc = [...productMetrics]
    .filter((p) => p.adSpend > 10 && p.roas !== null && p.roas > 0 && p.roas < 50 && Number.isFinite(p.roas))
    .sort((a, b) => (b.roas ?? 0) - (a.roas ?? 0));

  // ===== INSIGHT 1: Produto com maior lucro líquido =====
  if (byProfitDesc.length > 0 && byProfitDesc[0].profit > 0) {
    const bestProduct = byProfitDesc[0];
    insights.push({
      description: `${bestProduct.name} (${bestProduct.sku}) gerou ${formatMoney(bestProduct.profit)} de lucro. Maior lucro do catálogo.`,
      href: "/app/products",
      id: "best-profit-product",
      priority: "medium",
      title: "Maior lucro",
      type: "growth",
    });
  } else {
    insights.push({
      description: "Nenhum produto com lucro registrado no catálogo.",
      href: "/app/products",
      id: "no-profit",
      priority: "low",
      title: "Sem lucro",
      type: "info",
    });
  }

  // ===== INSIGHT 2: Produto com mais devoluções =====
  if (byReturnsDesc.length > 0) {
    const highestReturnsProduct = byReturnsDesc[0];
    insights.push({
      description: `${highestReturnsProduct.name} (${highestReturnsProduct.sku}) teve ${highestReturnsProduct.returns} devoluções. Produto com mais devoluções do catálogo.`,
      href: "/app/products",
      id: "highest-returns-product",
      priority: "high",
      title: "Mais devoluções",
      type: "alert",
    });
  } else {
    insights.push({
      description: "Nenhuma devolução registrada nos produtos do catálogo.",
      href: "/app/products",
      id: "no-returns",
      priority: "low",
      title: "Sem devoluções",
      type: "info",
    });
  }

  // ===== INSIGHT 3: Produto com frete mais caro =====
  if (byShippingDesc.length > 0) {
    const highestShippingProduct = byShippingDesc[0];
    insights.push({
      description: `${highestShippingProduct.name} (${highestShippingProduct.sku}) tem o frete mais caro.`,
      href: "/app/products",
      id: "highest-shipping-product",
      priority: "medium",
      title: "Frete mais caro",
      type: "alert",
    });
  } else {
    insights.push({
      description: "Nenhum produto com custo de frete registrado.",
      href: "/app/products",
      id: "no-shipping",
      priority: "low",
      title: "Sem frete",
      type: "info",
    });
  }

  // ===== INSIGHT 4: Produto com publicidade mais eficiente =====
  if (byRoasDesc.length > 0) {
    const bestRoasProduct = byRoasDesc[0];
    const roasValue = bestRoasProduct.roas ?? 0;
    const revenueFromAds = bestRoasProduct.adSpend * roasValue;

    let roasLabel = "";
    if (roasValue >= 5) roasLabel = "excelente";
    else if (roasValue >= 3) roasLabel = "muito boa";
    else if (roasValue >= 2) roasLabel = "boa";
    else roasLabel = "baixa";

    insights.push({
      description: `${bestRoasProduct.name} (${bestRoasProduct.sku}): ROAS de ${roasValue.toFixed(1)}x (${roasLabel}). Investiu ${formatMoney(bestRoasProduct.adSpend)} e retornou ${formatMoney(revenueFromAds)}.`,
      href: "/app/products",
      id: "best-roas-product",
      priority: "medium",
      title: "Publicidade mais eficiente",
      type: "growth",
    });
  } else {
    insights.push({
      description: "Nenhum investimento em publicidade registrado nos produtos.",
      href: "/app/products",
      id: "no-ads",
      priority: "low",
      title: "Sem publicidade",
      type: "info",
    });
  }

  return insights.slice(0, 4);
}

export function buildMarketplaceSyncNotice(data: ProductCatalogData): ProductMarketplaceNotice | null {
  return null;
  // eslint-disable-next-line no-unreachable
  const { availability, activeRun, lastCompletedRun } = data.mercadoLivreSyncStatus;

  if (availability.reason === "provider_unavailable") {
    return {
      actionLabel: "Ver integrações",
      description:
        "As credenciais do Mercado Livre ainda não estão configuradas na API local. Sem isso, não há OAuth nem sincronização real.",
      href: "/app/integrations",
      id: "mercadolivre-unavailable",
      title: "Credenciais do Mercado Livre indisponíveis",
      tone: "alert",
    };
  }

  if (availability.reason === "provider_disconnected") {
    return null;
  }

  if (availability.reason === "provider_needs_reconnect") {
    return {
      actionLabel: "Reconectar conta",
      description:
        "O token salvo do Mercado Livre expirou. Reconecte a conta em integrações antes de tentar sincronizar novamente.",
      href: "/app/integrations",
      id: "mercadolivre-needs-reconnect",
      title: "Reconexão necessária",
      tone: "alert",
    };
  }

  if (activeRun) {
    return {
      actionLabel: "Ver integrações",
      description:
        "Há uma sincronização do Mercado Livre em andamento. Assim que ela terminar, os itens serão vinculados automaticamente por SKU quando houver match único; os demais ficarão em revisão.",
      href: "/app/integrations",
      id: "mercadolivre-sync-running",
      title: "Sincronização em andamento",
      tone: "info",
    };
  }

  if (data.catalogStats.pendingSyncProducts > 0) {
    return {
      actionKey: "open-synced-review",
      actionLabel: "Abrir revisão",
      description: `${data.catalogStats.pendingSyncProducts} produto(s) sincronizado(s) seguem pendentes porque ainda não houve match automático único por SKU. Revise para vincular, importar ou ignorar.`,
      id: "mercadolivre-pending-review",
      title: "Produtos aguardando revisão",
      tone: "success",
    };
  }

  if (!lastCompletedRun) {
    return {
      actionLabel: "Ir para integrações",
      description:
        "A conta está pronta, mas a primeira sincronização do Mercado Livre ainda não foi concluída. Rode o sync em Integrações para trazer os produtos.",
      href: "/app/integrations",
      id: "mercadolivre-first-sync",
      title: "Primeira sincronização pendente",
      tone: "info",
    };
  }

  return {
    actionLabel: "Ver integrações",
    description:
      "A última sincronização foi concluída e não há produtos pendentes de revisão no momento.",
    href: "/app/integrations",
    id: "mercadolivre-no-pending-review",
    title: "Sem revisão pendente",
    tone: "success",
  };
}

function formatMoney(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function buildProductLookupMaps(products: ProductListItem[]) {
  const bySku = new Map<string, ProductListItem>();
  const byId = new Map<string, ProductListItem>();

  function traverse(product: ProductListItem) {
    if (product.sku) {
      bySku.set(product.sku, product);
    }
    byId.set(product.id, product);
    for (const child of product.children) {
      traverse(child);
    }
  }

  for (const product of products) {
    traverse(product);
  }

  return { byId, bySku };
}

export function buildProductTableRows(data: ProductCatalogData): ProductTableRow[] {
  const { byId, bySku } = buildProductLookupMaps(data.products);
  const productAnalyticsById = new Map(
    data.productRows.map((row) => [row.productId, row] as const),
  );
  const productAnalyticsBySku = new Map(
    data.productRows.map((row) => [row.sku, row] as const),
  );
  const monthlyPerformanceByProductId = new Map(
    data.monthlyPerformanceRows
      .filter((row): row is ProductMonthlyPerformanceDisplayRow & { productId: string } => row.productId !== null)
      .map((row) => [row.productId, row] as const),
  );
  const monthlyPerformanceBySku = new Map(
    data.monthlyPerformanceRows.map((row) => [row.sku, row] as const),
  );
  const matchedSkus = new Set<string>();
  const matchedPerformanceIds = new Set<string>();
  const hasHierarchicalPerformanceRows = data.performanceRows.some(
    (row) => row.catalogRole !== "standalone" || row.children.length > 0,
  );

  const resolveProductAnalyticsRow = (
    row: Pick<ProductMonthlyPerformanceDisplayRow, "productId" | "sku">,
  ): ProductAnalyticsRow | null =>
    (row.productId ? productAnalyticsById.get(row.productId) ?? null : null) ??
    productAnalyticsBySku.get(row.sku) ??
    null;

  const resolveMarketplaceCommissionTotal = (
    row: Pick<
      ProductMonthlyPerformanceDisplayRow,
      "channel" | "productId" | "sku" | "salesQuantity" | "returnsQuantity" | "marketplaceCommission"
    >,
  ): number | null => {
    const normalizedChannel = row.channel.trim().toLowerCase();
    const netSales = resolveNetLiquidSales(row.salesQuantity, row.returnsQuantity);
    const analyticsRow = resolveProductAnalyticsRow(row);
    if (
      normalizedChannel === "mercadolivre" &&
      analyticsRow?.marketplaceCommission !== undefined &&
      analyticsRow.netSales === netSales
    ) {
      return toNumber(analyticsRow.marketplaceCommission);
    }

    const marketplaceCommission = toNumber(row.marketplaceCommission ?? "0");
    if (marketplaceCommission <= 0) {
      return null;
    }

    return marketplaceCommission * resolveNetLiquidSales(row.salesQuantity, row.returnsQuantity);
  };

  const mapRow = (
    row: ProductMonthlyPerformanceDisplayRow,
    product: ProductListItem | null,
    children: ProductTableRow[],
    preferParentCostOverride = true,
    precomputedCommissionTotal: number | null = null,
  ): ProductTableRow => {
    const taxPct = toNumber(data.scope.taxRateDefault) * 100;
    const taxRateDefault = taxPct / 100;

    const isChild = product?.catalogRole === "child";

    let effectiveRow = row;

    if (isChild && preferParentCostOverride && product?.parentProductId) {
      const parentProduct = byId.get(product.parentProductId);
      if (parentProduct?.sku) {
        const parentRow = data.monthlyPerformanceRows.find(
          (r) => r.sku === parentProduct.sku,
        );
        if (parentRow) {
          effectiveRow = {
            ...row,
            salePrice: parentRow.salePrice,
            unitCost: parentRow.unitCost,
            packagingCost: parentRow.packagingCost,
          };
        }
      }
    }

    const marketplaceCommissionTotal =
      precomputedCommissionTotal ?? resolveMarketplaceCommissionTotal(row);
    const financials = deriveRowFinancials(effectiveRow, taxRateDefault, marketplaceCommissionTotal);
    const sellingPrice = toNumber(effectiveRow.salePrice);
    const variationLabel = product?.variationLabel ?? extractVariationLabel(row.productName);
    const displayName = resolveProductDisplayName(row.productName, variationLabel);

    return {
      ...financials,
      adSpend: toNumber(row.advertisingCost),
      advertisingCost: toNumber(row.advertisingCost),
      catalogGroupKey: product?.catalogGroupKey ?? null,
      catalogRole: product?.catalogRole ?? "standalone",
      channelLabel: row.channel,
      children,
      commissionPct: financials.revenue > 0
        ? (financials.totalCommission / financials.revenue) * 100
        : 0,
      coverImageUrl: product?.coverImageUrl ?? null,
      displayName,
      id: row.productId ?? row.id,
      isActive: product?.isActive ?? true,
      name: row.productName,
      packagingCost: toNumber(effectiveRow.packagingCost),
      parentProductId: product?.parentProductId ?? null,
      performanceId: row.id,
      productId: row.productId ?? product?.id ?? null,
      referenceMonth: row.referenceMonth,
      returns: row.returnsQuantity,
      sales: row.salesQuantity,
      sellingPrice,
      shipping: toNumber(row.shippingFee),
      sku: row.sku,
      taxPct,
      totalCommission: financials.totalCommission,
      totalPackagingCost: financials.totalPackagingCost,
      totalProductCost: financials.totalProductCost,
      unitCost: toNumber(effectiveRow.unitCost),
      variationLabel,
    };
  };

  const mapPerformanceRow = (row: ProductPerformanceRow): ProductTableRow => {
    const product =
      (row.productId ? byId.get(row.productId) ?? null : null) ??
      bySku.get(row.sku) ??
      null;
    const children = row.children
      .map(mapPerformanceRow)
      .filter((child): child is ProductTableRow => child !== null);

    return mapRow(row, product, children, false);
  };

  const aggregateGroupRow = (
    product: ProductListItem,
    ownRow: ProductMonthlyPerformanceDisplayRow | null,
    children: ProductTableRow[],
  ): ProductTableRow => {
    const sourceRows = [
      ...(ownRow ? [ownRow] : []),
      ...children.map((child) => ({
        advertisingCost: String(child.advertisingCost),
        channel: child.channelLabel,
        commissionRate: child.commissionPct > 0 && child.sellingPrice > 0
          ? String(child.commissionPct / 100)
          : "0",
        id: child.performanceId,
        marketplaceCommission: child.totalCommission > 0
          ? String(child.totalCommission / Math.max(1, child.netLiquidSales))
          : "0",
        packagingCost: String(child.packagingCost),
        productId: child.productId,
        productName: child.name,
        referenceMonth: child.referenceMonth,
        returnsQuantity: child.returns,
        salePrice: String(child.sellingPrice),
        salesQuantity: child.sales,
        shippingFee: String(child.shipping),
        sku: child.sku,
        unitCost: String(child.unitCost),
      }) satisfies ProductMonthlyPerformanceDisplayRow),
    ];
    const firstRow = ownRow ?? sourceRows[0];
    const totals = sourceRows.reduce((accumulator, sourceRow) => {
      const netSales = resolveNetLiquidSales(sourceRow.salesQuantity, sourceRow.returnsQuantity);
      const commissionTotal = resolveMarketplaceCommissionTotal(sourceRow);
      accumulator.salesQuantity += sourceRow.salesQuantity;
      accumulator.returnsQuantity += sourceRow.returnsQuantity;
      accumulator.netSales += netSales;
      accumulator.revenue += toNumber(sourceRow.salePrice) * netSales;
      accumulator.marketplaceCommission += commissionTotal ?? 0;
      accumulator.shipping += toNumber(sourceRow.shippingFee) * netSales;
      accumulator.packagingCost += toNumber(sourceRow.packagingCost) * netSales;
      accumulator.unitCost += toNumber(sourceRow.unitCost) * netSales;
      accumulator.adSpend += toNumber(sourceRow.advertisingCost);
      return accumulator;
    }, {
      adSpend: 0,
      marketplaceCommission: 0,
      netSales: 0,
      packagingCost: 0,
      returnsQuantity: 0,
      revenue: 0,
      salesQuantity: 0,
      shipping: 0,
      unitCost: 0,
    });

    const netSales = totals.netSales;
    const weightedSalePrice =
      netSales > 0 ? totals.revenue / netSales : toNumber(firstRow?.salePrice);
    const weightedMarketplaceCommission =
      netSales > 0
        ? totals.marketplaceCommission / netSales
        : toNumber(firstRow?.marketplaceCommission);
    const weightedShippingFee =
      netSales > 0 ? totals.shipping / netSales : toNumber(firstRow?.shippingFee);
    const weightedPackagingCost =
      netSales > 0 ? totals.packagingCost / netSales : toNumber(firstRow?.packagingCost);
    const weightedUnitCost =
      netSales > 0 ? totals.unitCost / netSales : toNumber(firstRow?.unitCost);
    const commissionRate =
      totals.revenue > 0
        ? totals.marketplaceCommission / totals.revenue
        : toNumber(firstRow?.commissionRate);

    const syntheticRow: ProductMonthlyPerformanceDisplayRow = {
      advertisingCost: toDecimalString(totals.adSpend),
      channel: firstRow?.channel ?? "mercadolivre",
      commissionRate: toDecimalString(commissionRate, 6),
      id: ownRow?.id ?? `${product.id}:${firstRow?.referenceMonth ?? "performance"}`,
      marketplaceCommission: toDecimalString(weightedMarketplaceCommission),
      packagingCost: toDecimalString(weightedPackagingCost),
      productId: product.id,
      productName: product.name,
      referenceMonth: firstRow?.referenceMonth ?? data.scope.referenceMonth,
      returnsQuantity: totals.returnsQuantity,
      salePrice: toDecimalString(weightedSalePrice),
      salesQuantity: totals.salesQuantity,
      shippingFee: toDecimalString(weightedShippingFee),
      sku: product.sku ?? firstRow?.sku ?? product.id,
      unitCost: toDecimalString(weightedUnitCost),
    };

    return mapRow(syntheticRow, product, children, true, totals.marketplaceCommission);
  };

  const buildFromProduct = (product: ProductListItem): ProductTableRow | null => {
    const ownRow =
      monthlyPerformanceByProductId.get(product.id) ??
      (product.sku ? monthlyPerformanceBySku.get(product.sku) ?? null : null);
    const childRows = product.children
      .map(buildFromProduct)
      .filter((child): child is ProductTableRow => child !== null);

    if (product.catalogRole === "parent" || childRows.length > 0) {
      if (!ownRow && childRows.length === 0) {
        return null;
      }

      if (ownRow) {
        matchedSkus.add(ownRow.sku);
        matchedPerformanceIds.add(ownRow.id);
      }

      for (const childRow of childRows) {
        matchedSkus.add(childRow.sku);
        matchedPerformanceIds.add(childRow.performanceId);
      }

      return aggregateGroupRow(product, ownRow, childRows);
    }

    if (!ownRow) {
      return null;
    }

    matchedSkus.add(ownRow.sku);
    matchedPerformanceIds.add(ownRow.id);

    return mapRow(ownRow, product, []);
  };

  const rows: ProductTableRow[] = [];

  if (hasHierarchicalPerformanceRows) {
    return data.performanceRows
      .filter((row) => row.catalogRole !== "child")
      .map(mapPerformanceRow);
  }

  for (const product of data.products) {
    if (product.catalogRole === "child") {
      continue;
    }

    const row = buildFromProduct(product);
    if (row) {
      rows.push(row);
    }
  }

  for (const row of data.monthlyPerformanceRows) {
    if (matchedPerformanceIds.has(row.id) || matchedSkus.has(row.sku)) {
      continue;
    }

    rows.push(
      mapRow(
        row,
        (row.productId ? byId.get(row.productId) ?? null : null) ??
          bySku.get(row.sku) ??
          null,
        [],
      ),
    );
  }

  return rows;
}

export function determineFinancialState(
  data: ProductCatalogData,
): ProductFinancialState {
  return data.financialState;
}

/**
 * Comissão total de uma linha de produto, espelhando a lógica usada no modal
 * de detalhes (product-details-modal). Para pais com variações, usa a comissão
 * unitária do primeiro filho multiplicada pelas vendas líquidas. Para filhos
 * ou standalone, aplica heurística que detecta se `totalCommission` já é o
 * total ou o valor unitário.
 */
export function computeRowCommissionTotal(row: ProductTableRow): number {
  const totalCommission = row.totalCommission;
  const parentCommission =
    row.catalogRole === "parent" && row.children.length > 0
      ? row.children[0].totalCommission
      : null;

  if (parentCommission !== null) {
    return parentCommission * row.netLiquidSales;
  }

  return totalCommission * row.netLiquidSales > row.revenue
    ? totalCommission
    : totalCommission * row.netLiquidSales;
}

/**
 * Receita líquida de uma linha: faturamento menos a comissão total.
 */
export function computeRowNetRevenue(row: ProductTableRow): number {
  return row.revenue - computeRowCommissionTotal(row);
}

const productDataGapLabels: Record<string, string> = {
  packaging_cost_unavailable: "embalagem",
  returns_unavailable: "devolucoes",
  shipping_cost_unavailable: "frete",
  tax_amount_unavailable: "impostos",
};

export function buildProductCoverageNote(data: ProductCatalogData | null | undefined) {
  if (!data || data.dataGaps.length === 0) {
    return null;
  }

  const labels = data.dataGaps
    .map((gap) => productDataGapLabels[gap])
    .filter((label): label is string => Boolean(label));

  if (labels.length === 0) {
    return null;
  }

  return `Este mês ainda não tem performance mensal suficiente: ${labels.join(", ")}.`;
}
