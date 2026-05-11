import { describe, expect, it, vi } from "vitest";
import { DashboardService } from "./dashboard.service";

describe("DashboardService", () => {
  it("maps backend finance and sync data into dashboard endpoint responses without changing values", async () => {
    const summary = {
      avgRoi: "340.00",
      avgRoas: "12.00",
      avgTicket: "240.00",
      breakEvenRevenue: "600.00",
      breakEvenUnits: "4.00",
      contributionMargin: "265.00",
      grossMarginPercent: "49.17",
      grossProfit: "295.00",
      grossRevenue: "1200.00",
      netProfit: "220.00",
      netRevenue: "1100.00",
      ordersCount: 5,
      totalAdCosts: "35.00",
      totalCogs: "500.00",
      totalFees: "305.00",
      totalManualExpenses: "45.00",
      totalReturns: 0,
      unitsSold: 8,
    };

    const financeService = {
      buildDashboardReadModel: vi.fn().mockResolvedValue({
        channels: [
          {
            channel: "mercadolivre",
            summary,
          },
        ],
        daily: [
          {
            metricDate: "2026-05-01",
            ordersCount: 5,
            summary,
          },
        ],
        productProfitability: [
          {
            adSpend: "35.00",
            channel: "mercadolivre",
            grossProfit: "295.00",
            margin: "24.58",
            marketplaceCommission: "305.00",
            netSales: 8,
            packagingCost: "0.00",
            productCost: "500.00",
            productId: "product_1",
            productName: "Premium Notebook",
            returns: 0,
            revenue: "1200.00",
            roi: "59.00",
            roas: "34.29",
            salePrice: "150.00",
            sales: 8,
            shippingCost: "0.00",
            sku: "NB-1",
            summary,
            taxAmount: "0.00",
          },
        ],
        products: [],
        summary,
      }),
      readSummaryMetrics: vi.fn().mockResolvedValue(summary),
    };
    const syncService = {
      getStatus: vi.fn().mockResolvedValue({
        activeRun: null,
        availability: {
          canRun: true,
          currentWindowKey: "2026-05-01:morning",
          currentWindowLabel: "Morning",
          currentWindowSlot: "morning",
          lastSuccessfulSyncAt: "2026-05-01T09:00:00.000Z",
          message: "Sync is available for the current daily window.",
          nextAvailableAt: "2026-05-01T15:00:00.000Z",
          provider: "mercadolivre",
          reason: "available",
        },
        lastCompletedRun: null,
      }),
    };
    const service = new DashboardService(financeService as never, syncService as never);

    await expect(service.readSummary("org_123")).resolves.toEqual({
      cards: expect.arrayContaining([
        expect.objectContaining({
          label: "Gross revenue",
          value: "1200.00",
        }),
        expect.objectContaining({
          label: "Net profit",
          value: "220.00",
        }),
      ]),
      summary: expect.objectContaining({
        avgRoi: "340.00",
        grossProfit: "295.00",
        grossRevenue: "1200.00",
        netProfit: "220.00",
      }),
    });
    await expect(service.readCharts("org_123")).resolves.toEqual({
      channels: [
        {
          channel: "mercadolivre",
          grossRevenue: 1200,
          netProfit: 220,
          unitsSold: 8,
        },
      ],
      daily: [
        {
          grossRevenue: 1200,
          metricDate: "2026-05-01",
          netProfit: 220,
          ordersCount: 5,
          unitsSold: 8,
        },
      ],
    });
    await expect(service.readRecentSync("org_123")).resolves.toEqual(
      expect.objectContaining({
        availability: expect.objectContaining({
          provider: "mercadolivre",
        }),
      }),
    );
    await expect(service.readProfitability("org_123")).resolves.toEqual({
      channels: [
        expect.objectContaining({
          channel: "mercadolivre",
        }),
      ],
      products: [
        expect.objectContaining({
          channel: "mercadolivre",
          grossProfit: "295.00",
          marketplaceCommission: "305.00",
          productId: "product_1",
          roi: "59.00",
          sales: 8,
        }),
      ],
    });
  });
});
