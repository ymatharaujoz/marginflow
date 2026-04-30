import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardHome } from "./dashboard-home";

const reactQueryMocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: reactQueryMocks.useQuery,
}));

describe("DashboardHome", () => {
  beforeEach(() => {
    reactQueryMocks.useQuery.mockReset();
  });

  function mockReadyQueries() {
    reactQueryMocks.useQuery.mockImplementation(({ queryKey }: { queryKey: string[] }) => {
      if (queryKey[0] === "dashboard-summary") {
        return {
          data: {
            cards: [
              {
                helperText: "4 orders across 7 sold units",
                label: "Gross revenue",
                tone: "positive",
                value: "1200.50",
              },
            ],
            summary: {
              breakEvenRevenue: "800.00",
              breakEvenUnits: "4.00",
              contributionMargin: "340.00",
              grossMarginPercent: "28.33",
              grossRevenue: "1200.50",
              netProfit: "210.10",
              netRevenue: "1100.00",
              ordersCount: 4,
              totalAdCosts: "40.00",
              totalCogs: "500.00",
              totalFees: "60.00",
              totalManualExpenses: "25.00",
              unitsSold: 7,
            },
          },
          error: null,
          isLoading: false,
        };
      }

      if (queryKey[0] === "dashboard-charts") {
        return {
          data: {
            channels: [
              {
                channel: "mercadolivre",
                grossRevenue: 1200.5,
                netProfit: 210.1,
                unitsSold: 7,
              },
            ],
            daily: [
              {
                grossRevenue: 500,
                metricDate: "2026-05-01",
                netProfit: 100,
                ordersCount: 2,
                unitsSold: 3,
              },
            ],
          },
          error: null,
          isLoading: false,
        };
      }

      if (queryKey[0] === "dashboard-recent-sync") {
        return {
          data: {
            activeRun: null,
            availability: {
              canRun: true,
              currentWindowKey: "2026-05-01:morning",
              currentWindowLabel: "Morning",
              currentWindowSlot: "morning",
              lastSuccessfulSyncAt: "2026-05-01T08:00:00.000Z",
              message: "Sync is available for the current daily window.",
              nextAvailableAt: "2026-05-01T15:00:00.000Z",
              provider: "mercadolivre",
              reason: "available",
            },
            lastCompletedRun: {
              counts: {
                fees: 2,
                items: 4,
                orders: 2,
                products: 2,
              },
              createdAt: "2026-05-01T08:00:00.000Z",
              cursor: null,
              errorSummary: null,
              finishedAt: "2026-05-01T08:05:00.000Z",
              id: "sync_1",
              provider: "mercadolivre",
              startedAt: "2026-05-01T08:00:00.000Z",
              status: "completed",
              updatedAt: "2026-05-01T08:05:00.000Z",
              windowKey: "2026-05-01:morning",
            },
          },
          error: null,
          isLoading: false,
        };
      }

      return {
        data: {
          channels: [
            {
              channel: "mercadolivre",
              summary: {
                breakEvenRevenue: "800.00",
                breakEvenUnits: "4.00",
                contributionMargin: "340.00",
                grossMarginPercent: "28.33",
                grossRevenue: "1200.50",
                netProfit: "210.10",
                netRevenue: "1100.00",
                ordersCount: 4,
                totalAdCosts: "40.00",
                totalCogs: "500.00",
                totalFees: "60.00",
                totalManualExpenses: "25.00",
                unitsSold: 7,
              },
            },
          ],
          products: [
            {
              productId: "prod_1",
              productName: "Premium Notebook",
              sku: "NB-1",
              summary: {
                breakEvenRevenue: "800.00",
                breakEvenUnits: "4.00",
                contributionMargin: "340.00",
                grossMarginPercent: "28.33",
                grossRevenue: "1200.50",
                netProfit: "210.10",
                netRevenue: "1100.00",
                ordersCount: 4,
                totalAdCosts: "40.00",
                totalCogs: "500.00",
                totalFees: "60.00",
                totalManualExpenses: "25.00",
                unitsSold: 7,
              },
            },
          ],
        },
        error: null,
        isLoading: false,
      };
    });
  }

  it("renders populated KPI, chart, and sync sections", () => {
    mockReadyQueries();

    const markup = renderToStaticMarkup(<DashboardHome organizationName="MarginFlow" />);

    expect(markup).toContain("Financial insight home for MarginFlow");
    expect(markup).toContain("Top-level KPIs");
    expect(markup).toContain("Gross revenue");
    expect(markup).toContain("Freshness and availability");
    expect(markup).toContain("Profitability tables");
    expect(markup).toContain("Premium Notebook");
  });

  it("renders the first-sync empty state", () => {
    reactQueryMocks.useQuery.mockImplementation(({ queryKey }: { queryKey: string[] }) => {
      if (queryKey[0] === "dashboard-summary") {
        return {
          data: {
            cards: [],
            summary: {
              breakEvenRevenue: "0.00",
              breakEvenUnits: "0.00",
              contributionMargin: "0.00",
              grossMarginPercent: "0.00",
              grossRevenue: "0.00",
              netProfit: "0.00",
              netRevenue: "0.00",
              ordersCount: 0,
              totalAdCosts: "0.00",
              totalCogs: "0.00",
              totalFees: "0.00",
              totalManualExpenses: "0.00",
              unitsSold: 0,
            },
          },
          error: null,
          isLoading: false,
        };
      }

      if (queryKey[0] === "dashboard-charts") {
        return {
          data: {
            channels: [],
            daily: [],
          },
          error: null,
          isLoading: false,
        };
      }

      if (queryKey[0] === "dashboard-recent-sync") {
        return {
          data: {
            activeRun: null,
            availability: {
              canRun: false,
              currentWindowKey: null,
              currentWindowLabel: null,
              currentWindowSlot: null,
              lastSuccessfulSyncAt: null,
              message: "Connect this marketplace account before running the first sync.",
              nextAvailableAt: null,
              provider: "mercadolivre",
              reason: "provider_disconnected",
            },
            lastCompletedRun: null,
          },
          error: null,
          isLoading: false,
        };
      }

      return {
        data: {
          channels: [],
          products: [],
        },
        error: null,
        isLoading: false,
      };
    });

    const markup = renderToStaticMarkup(<DashboardHome organizationName="MarginFlow" />);

    expect(markup).toContain("No marketplace sync has completed yet.");
    expect(markup).toContain("Connect this marketplace account before running the first sync.");
  });
});
