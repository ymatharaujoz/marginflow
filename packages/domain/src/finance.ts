export type DecimalString = string;

export type FinancialProductInput = {
  id: string;
  name: string;
  sku: string | null;
  sellingPrice: DecimalString;
  unitCost: DecimalString;
  isActive: boolean;
};

export type FinancialOrderItemInput = {
  id: string;
  productId: string | null;
  sku: string | null;
  quantity: number;
  unitPrice: DecimalString;
  totalPrice: DecimalString;
};

export type FinancialOrderInput = {
  id: string;
  provider: string;
  orderedAt: string | null;
  totalAmount: DecimalString;
  refundAmount?: DecimalString;
  discountAmount?: DecimalString;
  items: readonly FinancialOrderItemInput[];
  fees: readonly {
    amount: DecimalString;
    feeType: string;
  }[];
};

export type FinancialAdCostInput = {
  id: string;
  productId: string | null;
  channel: string;
  amount: DecimalString;
  spentAt: string | null;
};

export type FinancialManualExpenseInput = {
  id: string;
  category: string;
  amount: DecimalString;
  incurredAt: string | null;
};

export type FinanceSnapshot = {
  adCosts: readonly FinancialAdCostInput[];
  manualExpenses: readonly FinancialManualExpenseInput[];
  orders: readonly FinancialOrderInput[];
  products: readonly FinancialProductInput[];
};

export type FinancialFormulaBreakEvenInput = {
  contributionMargin: DecimalString;
  fixedCosts: DecimalString;
  grossRevenue: DecimalString;
  unitsSold: number;
};

export type FinancialSummaryMetrics = {
  totalAdCosts: DecimalString;
  totalCogs: DecimalString;
  totalFees: DecimalString;
  totalManualExpenses: DecimalString;
  grossMarginPercent: DecimalString;
  grossRevenue: DecimalString;
  netProfit: DecimalString;
  netRevenue: DecimalString;
  contributionMargin: DecimalString;
  breakEvenRevenue: DecimalString;
  breakEvenUnits: DecimalString;
  ordersCount: number;
  unitsSold: number;
};

export type DailyFinancialMetric = {
  metricDate: string;
  ordersCount: number;
  summary: FinancialSummaryMetrics;
};

export type ProductFinancialMetric = {
  productId: string;
  productName: string;
  sku: string | null;
  metricDate: string;
  summary: FinancialSummaryMetrics;
};

export type ProductProfitabilityMetric = {
  productId: string;
  productName: string;
  sku: string | null;
  summary: FinancialSummaryMetrics;
};

export type ChannelProfitabilityMetric = {
  channel: string;
  summary: FinancialSummaryMetrics;
};

export type FinanceOverview = {
  channels: ChannelProfitabilityMetric[];
  daily: DailyFinancialMetric[];
  products: ProductFinancialMetric[];
  summary: FinancialSummaryMetrics;
};

type MutableAccumulator = {
  totalAdCosts: bigint;
  totalCogs: bigint;
  totalFees: bigint;
  totalManualExpenses: bigint;
  grossRevenue: bigint;
  netRevenue: bigint;
  ordersCount: number;
  unitsSold: number;
};

const MONEY_SCALE = 100n;
const PERCENT_SCALE = 100n;
const ZERO_MONEY = "0.00";

function createAccumulator(): MutableAccumulator {
  return {
    grossRevenue: 0n,
    netRevenue: 0n,
    ordersCount: 0,
    totalAdCosts: 0n,
    totalCogs: 0n,
    totalFees: 0n,
    totalManualExpenses: 0n,
    unitsSold: 0,
  };
}

function finalizeAccumulator(value: MutableAccumulator): FinancialSummaryMetrics {
  const contributionMarginCents = computeContributionMarginCents(value);
  const netProfitCents = computeNetProfitCents(value);

  return {
    breakEvenRevenue: calculateBreakEvenRevenue({
      contributionMargin: formatMoney(contributionMarginCents),
      fixedCosts: formatMoney(value.totalManualExpenses),
      grossRevenue: formatMoney(value.grossRevenue),
    }),
    breakEvenUnits: calculateBreakEvenQuantity({
      contributionMargin: formatMoney(contributionMarginCents),
      fixedCosts: formatMoney(value.totalManualExpenses),
      unitsSold: value.unitsSold,
    }),
    contributionMargin: formatMoney(contributionMarginCents),
    grossMarginPercent: calculateGrossMarginPercent(
      formatMoney(value.grossRevenue),
      formatMoney(value.totalCogs),
    ),
    grossRevenue: formatMoney(value.grossRevenue),
    netProfit: formatMoney(netProfitCents),
    netRevenue: formatMoney(value.netRevenue),
    ordersCount: value.ordersCount,
    totalAdCosts: formatMoney(value.totalAdCosts),
    totalCogs: formatMoney(value.totalCogs),
    totalFees: formatMoney(value.totalFees),
    totalManualExpenses: formatMoney(value.totalManualExpenses),
    unitsSold: value.unitsSold,
  };
}

function computeContributionMarginCents(value: MutableAccumulator) {
  return value.netRevenue - value.totalCogs - value.totalFees - value.totalAdCosts;
}

function computeNetProfitCents(value: MutableAccumulator) {
  return computeContributionMarginCents(value) - value.totalManualExpenses;
}

function sumMoney(values: readonly DecimalString[]) {
  return values.reduce((sum, value) => sum + parseMoney(value), 0n);
}

function normalizeDate(value: string | null) {
  if (!value) {
    return null;
  }

  return value.slice(0, 10);
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

function ensureAccumulator<TKey>(map: Map<TKey, MutableAccumulator>, key: TKey) {
  const existing = map.get(key);

  if (existing) {
    return existing;
  }

  const created = createAccumulator();
  map.set(key, created);
  return created;
}

function sortByDate<T extends { metricDate: string }>(values: T[]) {
  return [...values].sort((left, right) => left.metricDate.localeCompare(right.metricDate));
}

function sortChannels(values: ChannelProfitabilityMetric[]) {
  return [...values].sort(
    (left, right) =>
      Number.parseFloat(right.summary.netProfit) - Number.parseFloat(left.summary.netProfit),
  );
}

function sortProducts<T extends { summary: FinancialSummaryMetrics }>(values: T[]) {
  return [...values].sort(
    (left, right) =>
      Number.parseFloat(right.summary.netProfit) - Number.parseFloat(left.summary.netProfit),
  );
}

function divideRounded(dividend: bigint, divisor: bigint) {
  if (divisor === 0n) {
    return 0n;
  }

  const quotient = dividend / divisor;
  const remainder = dividend % divisor;

  return remainder * 2n >= divisor ? quotient + 1n : quotient;
}

export function parseMoney(value: DecimalString | number | bigint): bigint {
  if (typeof value === "bigint") {
    return value;
  }

  if (typeof value === "number") {
    return BigInt(Math.round(value * Number(MONEY_SCALE)));
  }

  const normalized = value.trim();

  if (!/^-?\d+(?:\.\d{1,2})?$/.test(normalized)) {
    throw new Error(`Invalid decimal amount: ${value}`);
  }

  const sign = normalized.startsWith("-") ? -1n : 1n;
  const unsigned = normalized.replace("-", "");
  const [wholePart, fractionPart = ""] = unsigned.split(".");
  const cents = BigInt(wholePart) * MONEY_SCALE + BigInt((fractionPart + "00").slice(0, 2));

  return cents * sign;
}

export function formatMoney(value: bigint): DecimalString {
  const sign = value < 0n ? "-" : "";
  const absolute = value < 0n ? value * -1n : value;
  const whole = absolute / MONEY_SCALE;
  const cents = absolute % MONEY_SCALE;

  return `${sign}${whole.toString()}.${cents.toString().padStart(2, "0")}`;
}

export function divideMoney(
  dividend: bigint,
  divisor: bigint,
  decimalPlaces = 2,
  multiplier = 1n,
): DecimalString {
  if (divisor <= 0n) {
    return ZERO_MONEY;
  }

  const sign = dividend < 0n ? -1n : 1n;
  const absoluteDividend = dividend < 0n ? dividend * -1n : dividend;
  const scale = 10n ** BigInt(decimalPlaces);
  const scaled = absoluteDividend * multiplier * scale;
  const quotient = scaled / divisor;
  const remainder = scaled % divisor;
  const rounded = remainder * 2n >= divisor ? quotient + 1n : quotient;
  const whole = rounded / scale;
  const fraction = rounded % scale;
  const prefix = sign < 0n ? "-" : "";

  return `${prefix}${whole.toString()}.${fraction.toString().padStart(decimalPlaces, "0")}`;
}

export function calculateGrossRevenue(amounts: readonly DecimalString[]): DecimalString {
  return formatMoney(sumMoney(amounts));
}

export function calculateNetRevenue(input: {
  grossRevenue: DecimalString;
  refunds?: DecimalString;
  discounts?: DecimalString;
}): DecimalString {
  const grossRevenue = parseMoney(input.grossRevenue);
  const refunds = parseMoney(input.refunds ?? ZERO_MONEY);
  const discounts = parseMoney(input.discounts ?? ZERO_MONEY);

  return formatMoney(grossRevenue - refunds - discounts);
}

export function calculateContributionMargin(input: {
  revenue: DecimalString;
  cogs?: DecimalString;
  marketplaceFees?: DecimalString;
  adCosts?: DecimalString;
}): DecimalString {
  const revenue = parseMoney(input.revenue);
  const cogs = parseMoney(input.cogs ?? ZERO_MONEY);
  const marketplaceFees = parseMoney(input.marketplaceFees ?? ZERO_MONEY);
  const adCosts = parseMoney(input.adCosts ?? ZERO_MONEY);

  return formatMoney(revenue - cogs - marketplaceFees - adCosts);
}

export function calculateGrossMarginPercent(
  grossRevenue: DecimalString,
  cogs: DecimalString,
): DecimalString {
  const revenue = parseMoney(grossRevenue);

  if (revenue <= 0n) {
    return ZERO_MONEY;
  }

  const grossMargin = revenue - parseMoney(cogs);
  return divideMoney(grossMargin, revenue, 2, PERCENT_SCALE);
}

export function calculateNetProfit(input: {
  revenue: DecimalString;
  cogs?: DecimalString;
  marketplaceFees?: DecimalString;
  adCosts?: DecimalString;
  taxesEstimate?: DecimalString;
  fixedCosts?: DecimalString;
  additionalExpenses?: DecimalString;
}): DecimalString {
  const revenue = parseMoney(input.revenue);
  const cogs = parseMoney(input.cogs ?? ZERO_MONEY);
  const marketplaceFees = parseMoney(input.marketplaceFees ?? ZERO_MONEY);
  const adCosts = parseMoney(input.adCosts ?? ZERO_MONEY);
  const taxesEstimate = parseMoney(input.taxesEstimate ?? ZERO_MONEY);
  const fixedCosts = parseMoney(input.fixedCosts ?? ZERO_MONEY);
  const additionalExpenses = parseMoney(input.additionalExpenses ?? ZERO_MONEY);

  return formatMoney(
    revenue - cogs - marketplaceFees - adCosts - taxesEstimate - fixedCosts - additionalExpenses,
  );
}

export function calculateBreakEvenQuantity(input: {
  contributionMargin: DecimalString;
  fixedCosts: DecimalString;
  unitsSold: number;
}): DecimalString {
  const contributionMargin = parseMoney(input.contributionMargin);
  const fixedCosts = parseMoney(input.fixedCosts);

  if (contributionMargin <= 0n || input.unitsSold <= 0) {
    return ZERO_MONEY;
  }

  return divideMoney(fixedCosts * BigInt(input.unitsSold), contributionMargin, 2);
}

export function calculateBreakEvenRevenue(input: {
  contributionMargin: DecimalString;
  fixedCosts: DecimalString;
  grossRevenue: DecimalString;
}): DecimalString {
  const contributionMargin = parseMoney(input.contributionMargin);
  const fixedCosts = parseMoney(input.fixedCosts);
  const grossRevenue = parseMoney(input.grossRevenue);

  if (contributionMargin <= 0n || grossRevenue <= 0n) {
    return ZERO_MONEY;
  }

  return formatMoney(divideRounded(fixedCosts * grossRevenue, contributionMargin));
}

export function buildFinanceOverview(snapshot: FinanceSnapshot): FinanceOverview {
  const productsById = new Map(snapshot.products.map((product) => [product.id, product]));
  const summary = createAccumulator();
  const dailyAccumulators = new Map<string, MutableAccumulator>();
  const productAccumulators = new Map<string, MutableAccumulator>();
  const productCatalog = new Map<string, FinancialProductInput>();
  const channelAccumulators = new Map<string, MutableAccumulator>();

  for (const product of snapshot.products) {
    productCatalog.set(product.id, product);
  }

  for (const order of snapshot.orders) {
    const grossRevenue = parseMoney(order.totalAmount);
    const netRevenue = parseMoney(
      calculateNetRevenue({
        discounts: order.discountAmount,
        grossRevenue: order.totalAmount,
        refunds: order.refundAmount,
      }),
    );
    const totalFees = sumMoney(order.fees.map((fee) => fee.amount));
    const channelAccumulator = ensureAccumulator(channelAccumulators, order.provider);
    const dayKey = normalizeDate(order.orderedAt);
    const itemWeights = order.items.map((item) => parseMoney(item.totalPrice));
    const feeAllocations = allocateProportionally(totalFees, itemWeights);

    summary.grossRevenue += grossRevenue;
    summary.netRevenue += netRevenue;
    summary.totalFees += totalFees;
    summary.ordersCount += 1;

    channelAccumulator.grossRevenue += grossRevenue;
    channelAccumulator.netRevenue += netRevenue;
    channelAccumulator.totalFees += totalFees;
    channelAccumulator.ordersCount += 1;

    if (dayKey) {
      const dailyAccumulator = ensureAccumulator(dailyAccumulators, dayKey);
      dailyAccumulator.grossRevenue += grossRevenue;
      dailyAccumulator.netRevenue += netRevenue;
      dailyAccumulator.totalFees += totalFees;
      dailyAccumulator.ordersCount += 1;
    }

    for (let index = 0; index < order.items.length; index += 1) {
      const item = order.items[index];
      const itemRevenue = parseMoney(item.totalPrice);
      const feeShare = feeAllocations[index] ?? 0n;
      const quantity = item.quantity;
      const matchedProduct = item.productId ? productsById.get(item.productId) : undefined;
      const unitCost = matchedProduct ? parseMoney(matchedProduct.unitCost) : 0n;
      const cogs = unitCost * BigInt(quantity);

      summary.unitsSold += quantity;
      summary.totalCogs += cogs;
      channelAccumulator.unitsSold += quantity;
      channelAccumulator.totalCogs += cogs;

      if (dayKey) {
        const dailyAccumulator = ensureAccumulator(dailyAccumulators, dayKey);
        dailyAccumulator.unitsSold += quantity;
        dailyAccumulator.totalCogs += cogs;
      }

      if (!matchedProduct || !dayKey) {
        continue;
      }

      const productKey = `${matchedProduct.id}:${dayKey}`;
      const productAccumulator = ensureAccumulator(productAccumulators, productKey);
      productAccumulator.grossRevenue += itemRevenue;
      productAccumulator.netRevenue += itemRevenue;
      productAccumulator.totalCogs += cogs;
      productAccumulator.totalFees += feeShare;
      productAccumulator.unitsSold += quantity;
    }

  }

  for (const adCost of snapshot.adCosts) {
    const amount = parseMoney(adCost.amount);
    const dayKey = normalizeDate(adCost.spentAt);
    const channelAccumulator = ensureAccumulator(channelAccumulators, adCost.channel);

    summary.totalAdCosts += amount;
    channelAccumulator.totalAdCosts += amount;

    if (dayKey) {
      ensureAccumulator(dailyAccumulators, dayKey).totalAdCosts += amount;
    }

    if (adCost.productId && dayKey) {
      ensureAccumulator(productAccumulators, `${adCost.productId}:${dayKey}`).totalAdCosts += amount;
    }
  }

  for (const expense of snapshot.manualExpenses) {
    const amount = parseMoney(expense.amount);
    const dayKey = normalizeDate(expense.incurredAt);

    summary.totalManualExpenses += amount;

    if (dayKey) {
      ensureAccumulator(dailyAccumulators, dayKey).totalManualExpenses += amount;
    }
  }

  const daily = sortByDate(
    [...dailyAccumulators.entries()].map(([metricDate, value]) => ({
      metricDate,
      ordersCount: value.ordersCount,
      summary: finalizeAccumulator(value),
    })),
  );

  const products = sortByDate(
    [...productAccumulators.entries()].map(([key, value]) => {
      const [productId, metricDate] = key.split(":");
      const product = productCatalog.get(productId);

      if (!product) {
        throw new Error(`Unknown product id in product metrics: ${productId}`);
      }

      return {
        metricDate,
        productId,
        productName: product.name,
        sku: product.sku,
        summary: finalizeAccumulator(value),
      };
    }),
  );

  const channels = sortChannels(
    [...channelAccumulators.entries()].map(([channel, value]) => ({
      channel,
      summary: finalizeAccumulator(value),
    })),
  );

  return {
    channels,
    daily,
    products,
    summary: finalizeAccumulator(summary),
  };
}

export function buildProductProfitabilityMetrics(
  snapshot: FinanceSnapshot,
): ProductProfitabilityMetric[] {
  const overview = buildFinanceOverview(snapshot);
  const productsById = new Map(snapshot.products.map((product) => [product.id, product]));
  const aggregateMap = new Map<string, MutableAccumulator>();

  for (const metric of overview.products) {
    const accumulator = ensureAccumulator(aggregateMap, metric.productId);
    accumulator.grossRevenue += parseMoney(metric.summary.grossRevenue);
    accumulator.netRevenue += parseMoney(metric.summary.netRevenue);
    accumulator.totalAdCosts += parseMoney(metric.summary.totalAdCosts);
    accumulator.totalCogs += parseMoney(metric.summary.totalCogs);
    accumulator.totalFees += parseMoney(metric.summary.totalFees);
    accumulator.totalManualExpenses += parseMoney(metric.summary.totalManualExpenses);
    accumulator.ordersCount += metric.summary.ordersCount;
    accumulator.unitsSold += metric.summary.unitsSold;
  }

  return sortProducts(
    [...aggregateMap.entries()].map(([productId, accumulator]) => {
      const product = productsById.get(productId);

      if (!product) {
        throw new Error(`Unknown product id in profitability metrics: ${productId}`);
      }

      return {
        productId,
        productName: product.name,
        sku: product.sku,
        summary: finalizeAccumulator(accumulator),
      };
    }),
  );
}
