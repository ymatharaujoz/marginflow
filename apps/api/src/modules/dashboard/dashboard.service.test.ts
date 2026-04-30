import { describe, expect, it, vi } from "vitest";
import { DashboardService } from "./dashboard.service";

describe("DashboardService", () => {
  it("maps backend finance and sync data into dashboard endpoint responses without changing values", async () => {
    const financeService = {
      buildDashboardReadModel: vi.fn().mockResolvedValue({
        channels: [
          {
            channel: "mercadolivre",
            summary: {
              breakEvenRevenue: "600.00",
              breakEvenUnits: "4.00",
              contributionMargin: "300.00",
              grossMarginPercent: "25.00",
              grossRevenue: "1200.00",
              netProfit: "220.00",
              netRevenue: "1100.00",
              ordersCount: 5,
              totalAdCosts: "35.00",
              totalCogs: "500.00",
              totalFees: "70.00",
              totalManualExpenses: "20.00",
              unitsSold: 8,
            },
          },
        ],
        daily: [
          {
            metricDate: "2026-05-01",
            ordersCount: 5,
            summary: {
              breakEvenRevenue: "600.00",
              breakEvenUnits: "4.00",
              contributionMargin: "300.00",
              grossMarginPercent: "25.00",
              grossRevenue: "1200.00",
              netProfit: "220.00",
              netRevenue: "1100.00",
              ordersCount: 5,
              totalAdCosts: "35.00",
              totalCogs: "500.00",
              totalFees: "70.00",
              totalManualExpenses: "20.00",
              unitsSold: 8,
            },
          },
        ],
        productProfitability: [
          {
            productId: "product_1",
            productName: "Premium Notebook",
            sku: "NB-1",
            summary: {
              breakEvenRevenue: "600.00",
              breakEvenUnits: "4.00",
              contributionMargin: "300.00",
              grossMarginPercent: "25.00",
              grossRevenue: "1200.00",
              netProfit: "220.00",
              netRevenue: "1100.00",
              ordersCount: 5,
              totalAdCosts: "35.00",
              totalCogs: "500.00",
              totalFees: "70.00",
              totalManualExpenses: "20.00",
              unitsSold: 8,
            },
          },
        ],
        products: [],
        summary: {
          breakEvenRevenue: "600.00",
          breakEvenUnits: "4.00",
          contributionMargin: "300.00",
          grossMarginPercent: "25.00",
          grossRevenue: "1200.00",
          netProfit: "220.00",
          netRevenue: "1100.00",
          ordersCount: 5,
          totalAdCosts: "35.00",
          totalCogs: "500.00",
          totalFees: "70.00",
          totalManualExpenses: "20.00",
          unitsSold: 8,
        },
      }),
      readSummaryMetrics: vi.fn().mockResolvedValue({
        breakEvenRevenue: "600.00",
        breakEvenUnits: "4.00",
        contributionMargin: "300.00",
        grossMarginPercent: "25.00",
        grossRevenue: "1200.00",
        netProfit: "220.00",
        netRevenue: "1100.00",
        ordersCount: 5,
        totalAdCosts: "35.00",
        totalCogs: "500.00",
        totalFees: "70.00",
        totalManualExpenses: "20.00",
        unitsSold: 8,
      }),
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
          productId: "product_1",
        }),
      ],
    });
  });
});
