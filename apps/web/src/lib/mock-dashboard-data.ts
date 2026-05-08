import type {
  DashboardSummaryResponse,
  DashboardChartsResponse,
  DashboardRecentSyncResponse,
  DashboardProfitabilityResponse,
} from "@marginflow/types";

// Generate last 30 days of data
function generateDailyData(): DashboardChartsResponse["daily"] {
  const data: DashboardChartsResponse["daily"] = [];
  const today = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Simulate realistic patterns (weekends lower, weekdays higher)
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const baseRevenue = isWeekend ? 2500 : 4500;
    const variation = Math.random() * 0.3 - 0.15; // ±15% variation
    const grossRevenue = Math.round(baseRevenue * (1 + variation));
    const netProfit = Math.round(grossRevenue * 0.25); // 25% margin
    const unitsSold = Math.round(grossRevenue / 120); // ~R$120 average ticket
    const ordersCount = Math.round(unitsSold / 1.3); // ~1.3 items per order
    
    data.push({
      metricDate: date.toISOString().split("T")[0],
      grossRevenue,
      netProfit,
      unitsSold,
      ordersCount,
    });
  }
  
  return data;
}

const dailyData = generateDailyData();

// Calculate totals from daily data
const totals = dailyData.reduce(
  (acc, day) => ({
    grossRevenue: acc.grossRevenue + day.grossRevenue,
    netProfit: acc.netProfit + day.netProfit,
    unitsSold: acc.unitsSold + day.unitsSold,
    ordersCount: acc.ordersCount + day.ordersCount,
  }),
  { grossRevenue: 0, netProfit: 0, unitsSold: 0, ordersCount: 0 }
);

// Calculate aggregated metrics from daily data
const totalGrossProfit = Math.round(totals.netProfit * 1.15); // Lucro bruto ~15% maior que líquido
const avgRoi = "58.7";
const avgRoas = "3.85";
const totalReturns = Math.round(totals.unitsSold * 0.08); // 8% taxa de devolução
const avgTicket = totals.unitsSold > 0 ? (totals.grossRevenue / totals.unitsSold).toFixed(2) : "0";

export const mockDashboardSummary: DashboardSummaryResponse = {
  summary: {
    grossRevenue: String(totals.grossRevenue),
    netRevenue: String(Math.round(totals.grossRevenue * 0.92)), // 8% fees
    netProfit: String(totals.netProfit),
    contributionMargin: String(totals.netProfit),
    totalCogs: String(Math.round(totals.grossRevenue * 0.45)), // 45% COGS
    totalFees: String(Math.round(totals.grossRevenue * 0.08)), // 8% fees
    totalAdCosts: String(Math.round(totals.grossRevenue * 0.12)), // 12% ads
    totalManualExpenses: String(Math.round(totals.grossRevenue * 0.05)), // 5% expenses
    grossMarginPercent: "25.0",
    breakEvenRevenue: "15000",
    breakEvenUnits: "125",
    ordersCount: totals.ordersCount,
    unitsSold: totals.unitsSold,
    // Extended metrics
    grossProfit: String(totalGrossProfit),
    avgRoi,
    avgRoas,
    totalReturns,
    avgTicket,
  },
  cards: [
    {
      label: "Faturamento",
      value: totals.grossRevenue,
      tone: "positive",
      helperText: "Receita bruta total no período",
    },
    {
      label: "Lucro bruto",
      value: totalGrossProfit,
      tone: "positive",
      helperText: "Lucro antes de impostos",
    },
    {
      label: "Lucro líquido",
      value: totals.netProfit,
      tone: "positive",
      helperText: "Lucro após todos os custos",
    },
    {
      label: "Margem média",
      value: "25.0",
      tone: "positive",
      helperText: "Margem bruta percentual",
    },
  ],
};

export const mockDashboardCharts: DashboardChartsResponse = {
  daily: dailyData,
  channels: [
    {
      channel: "mercadolivre",
      grossRevenue: totals.grossRevenue,
      netProfit: totals.netProfit,
      unitsSold: totals.unitsSold,
    },
  ],
};

// Helper function to calculate product metrics
function calculateProductMetrics(
  productName: string,
  sku: string,
  channel: string,
  salePrice: number,
  sales: number,
  returns: number,
  productCost: number,
  packagingCost: number,
  commissionRate: number,
  shippingPerUnit: number,
  taxRate: number,
  adSpendRate: number,
): DashboardProductProfitabilityRow {
  const netSales = sales - returns;
  const revenue = salePrice * netSales;
  const marketplaceCommission = revenue * commissionRate;
  const shippingCost = shippingPerUnit * netSales;
  const taxAmount = revenue * taxRate;
  const packagingTotal = packagingCost * netSales;
  const productTotal = productCost * netSales;
  const adSpend = revenue * adSpendRate;

  const grossProfit =
    revenue - marketplaceCommission - shippingCost - taxAmount - packagingTotal - productTotal;
  const margin = revenue > 0 ? grossProfit / revenue : 0;
  const roi = productTotal > 0 ? grossProfit / productTotal : null;
  const roas = adSpend > 0 ? revenue / adSpend : null;

  return {
    productId: `prod-${sku.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
    productName,
    sku,
    channel,
    summary: {
      grossRevenue: String(Math.round(revenue)),
      netProfit: String(Math.round(grossProfit * 0.85)), // Aproximação: lucro líquido ~85% do bruto
      unitsSold: netSales,
      grossMarginPercent: String((margin * 100).toFixed(1)),
      totalCogs: String(Math.round(productTotal + packagingTotal)),
      totalFees: String(Math.round(marketplaceCommission + shippingCost + taxAmount)),
      totalAdCosts: String(Math.round(adSpend)),
      totalManualExpenses: "0",
      netRevenue: String(Math.round(revenue * 0.88)), // Aproximação
      contributionMargin: String(Math.round(grossProfit)),
      breakEvenRevenue: String(Math.round(productTotal / 0.3)), // Aproximação
      breakEvenUnits: Math.round(productTotal / (salePrice * 0.3)),
      ordersCount: Math.round(netSales / 1.3),
      grossProfit: String(Math.round(grossProfit)),
      avgRoi: roi !== null ? String((roi * 100).toFixed(1)) : null,
      avgRoas: roas !== null ? String(roas.toFixed(2)) : null,
      totalReturns: returns,
      avgTicket: String(salePrice),
    },
    sales,
    returns,
    netSales,
    salePrice: String(salePrice),
    revenue: String(revenue),
    marketplaceCommission: String(Math.round(marketplaceCommission)),
    shippingCost: String(Math.round(shippingCost)),
    taxAmount: String(Math.round(taxAmount)),
    packagingCost: String(Math.round(packagingTotal)),
    productCost: String(Math.round(productTotal)),
    adSpend: String(Math.round(adSpend)),
    grossProfit: String(Math.round(grossProfit)),
    roi: roi !== null ? String((roi * 100).toFixed(1)) : null,
    roas: roas !== null ? String(roas.toFixed(2)) : null,
    margin: String((margin * 100).toFixed(1)),
  };
}

// Product data with detailed metrics
const productData: Omit<DashboardProductProfitabilityRow, "productId">[] = [
  // Lucrativo e escalável
  calculateProductMetrics(
    "Fone de Ouvido Bluetooth Pro",
    "FONE-001",
    "mercadolivre",
    259.9,
    50,
    2,
    80,
    3,
    0.12,
    13,
    0.14,
    0.2,
  ),
  // Produto saudável
  calculateProductMetrics(
    "Mouse Gamer Wireless RGB",
    "MOUSE-002",
    "mercadolivre",
    189.9,
    45,
    3,
    55,
    2.5,
    0.12,
    11,
    0.14,
    0.18,
  ),
  // Margem baixa - atenção
  calculateProductMetrics(
    "Teclado Mecânico 60%",
    "TECL-003",
    "mercadolivre",
    349.9,
    28,
    5,
    180,
    5,
    0.14,
    15,
    0.12,
    0.25,
  ),
  // Produto com ROAS baixo - atenção
  calculateProductMetrics(
    "Webcam Full HD 1080p",
    "WEBC-004",
    "mercadolivre",
    299.9,
    22,
    2,
    120,
    4,
    0.12,
    14,
    0.14,
    0.45,
  ),
  // Produto com prejuízo - crítico
  calculateProductMetrics(
    "Suporte Notebook Ajustável",
    "SUPP-005",
    "mercadolivre",
    89.9,
    20,
    8,
    70,
    3,
    0.16,
    12,
    0.12,
    0.3,
  ),
  // Produto sem venda - neutro
  {
    productName: "Hub USB-C 7 Portas",
    sku: "HUB-006",
    channel: "mercadolivre",
    summary: {
      grossRevenue: "0",
      netProfit: "0",
      unitsSold: 0,
      grossMarginPercent: "0",
      totalCogs: "0",
      totalFees: "0",
      totalAdCosts: "0",
      totalManualExpenses: "0",
      netRevenue: "0",
      contributionMargin: "0",
      breakEvenRevenue: "0",
      breakEvenUnits: 0,
      ordersCount: 0,
      grossProfit: "0",
      avgRoi: null,
      avgRoas: null,
      totalReturns: 0,
      avgTicket: null,
    },
    sales: 0,
    returns: 0,
    netSales: 0,
    salePrice: "149.90",
    revenue: "0",
    marketplaceCommission: "0",
    shippingCost: "0",
    taxAmount: "0",
    packagingCost: "0",
    productCost: "0",
    adSpend: "0",
    grossProfit: "0",
    roi: null,
    roas: null,
    margin: "0",
  },
  // Produto escalável (ROI alto + margem boa)
  calculateProductMetrics(
    "Monitor LED 24 Polegadas",
    "MON-007",
    "mercadolivre",
    899.9,
    15,
    1,
    350,
    15,
    0.12,
    45,
    0.14,
    0.15,
  ),
];

export const mockDashboardProfitability: DashboardProfitabilityResponse = {
  channels: [
    {
      channel: "mercadolivre",
      summary: {
        ...mockDashboardSummary.summary,
        grossRevenue: String(totals.grossRevenue),
        netProfit: String(totals.netProfit),
        unitsSold: totals.unitsSold,
        grossProfit: String(Math.round(totals.netProfit * 1.15)),
        avgRoi: "58.7",
        avgRoas: "3.85",
        totalReturns: Math.round(totals.unitsSold * 0.08),
        avgTicket: String((totals.grossRevenue / totals.unitsSold).toFixed(2)),
      },
    },
  ],
  products: productData.map((p, i) => ({ ...p, productId: `prod-${i + 1}` })),
};

export const mockDashboardRecentSync: DashboardRecentSyncResponse = {
  activeRun: null,
  availability: {
    canRun: true,
    message: "Janela disponível para sincronização",
    nextWindow: null,
  },
  lastCompletedRun: {
    id: "sync-001",
    provider: "mercadolivre",
    status: "completed",
    startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    finishedAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
    windowKey: "2026-05-08-afternoon",
    counts: {
      orders: 156,
      items: 203,
    },
    errorMessage: null,
  },
};
