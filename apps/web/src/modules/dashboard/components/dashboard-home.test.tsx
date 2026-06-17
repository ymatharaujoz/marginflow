/** @vitest-environment jsdom */

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DashboardRecentSyncResponse } from "@lucreii/types";
import { DashboardHome } from "./dashboard-home";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => React.createElement("a", { href }, children),
}));

const { useDashboardDataMock, useDashboardConnectionStatusesMock } = vi.hoisted(() => ({
  useDashboardDataMock: vi.fn(),
  useDashboardConnectionStatusesMock: vi.fn(),
}));

vi.mock("./dashboard-header", () => ({
  DashboardHeader: () => <div>Dashboard Header</div>,
}));

vi.mock("./dashboard-financial-indicators", () => ({
  DashboardFinancialIndicators: () => <div>Indicators</div>,
}));

vi.mock("./charts-section", () => ({
  ChartsSection: () => <div>Charts</div>,
}));

vi.mock("./insights-section", () => ({
  InsightsSection: () => <div>Insights</div>,
}));

vi.mock("./products-table", () => ({
  ProductsTable: () => <div>Products</div>,
}));

vi.mock("../hooks/use-dashboard-data", () => ({
  useDashboardData: useDashboardDataMock,
}));

vi.mock("../hooks/use-dashboard-connection-statuses", () => ({
  useDashboardConnectionStatuses: useDashboardConnectionStatusesMock,
}));

vi.mock("./marketplaces-section", () => ({
  MarketplacesSection: ({
    syncStatusByProvider,
  }: {
    syncStatusByProvider: Record<string, DashboardRecentSyncResponse | undefined>;
  }) => (
    <div>
      ML:
      {syncStatusByProvider.mercadolivre?.availability.reason ?? "missing"}
      |
      Shopee:
      {syncStatusByProvider.shopee?.availability.reason ?? "missing"}
    </div>
  ),
}));

function mount(node: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(node);
  });

  return {
    unmount() {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

function click(element: Element) {
  act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function buildRecentSync(
  provider: "mercadolivre" | "shopee",
  reason: DashboardRecentSyncResponse["availability"]["reason"],
): DashboardRecentSyncResponse {
  return {
    activeRun: null,
    availability: {
      canRun: reason === "available",
      currentWindowKey: null,
      currentWindowLabel: null,
      currentWindowSlot: null,
      lastSuccessfulSyncAt: "2026-06-17T12:00:00.000Z",
      message: reason,
      nextAvailableAt: null,
      provider,
      reason,
    },
    lastCompletedRun: null,
  };
}

afterEach(() => {
  document.body.innerHTML = "";
  useDashboardDataMock.mockReset();
  useDashboardConnectionStatusesMock.mockReset();
});

describe("DashboardHome", () => {
  it("keeps provider-specific connection state after switching to Shopee tab", () => {
    useDashboardDataMock.mockImplementation((provider: "mercadolivre" | "shopee" | null) => ({
      businessStatus: "healthy",
      chartsQuery: {
        data:
          provider === "shopee"
            ? { channels: [{ channel: "shopee", grossRevenue: 800, netProfit: 180, unitsSold: 4 }], daily: [] }
            : {
                channels: [
                  { channel: "Mercado Livre", grossRevenue: 1200, netProfit: 300, unitsSold: 5 },
                  { channel: "shopee", grossRevenue: 800, netProfit: 180, unitsSold: 4 },
                ],
                daily: [],
              },
      },
      error: null,
      financialState: "ready",
      isLoading: false,
      profitabilityQuery: { data: { channels: [], products: [] } },
      refetchAll: vi.fn(),
      summaryQuery: { data: { cards: [], summary: {} } },
    }));

    useDashboardConnectionStatusesMock.mockReturnValue({
      syncStatusByProvider: {
        mercadolivre: buildRecentSync("mercadolivre", "available"),
        shopee: buildRecentSync("shopee", "provider_disconnected"),
      },
    });

    const view = mount(
      <DashboardHome activeCompany={null} organizationName="Lucreii" />,
    );

    click(
      Array.from(document.querySelectorAll("button")).find((button) =>
        button.textContent?.trim() === "Shopee",
      )!,
    );

    expect(document.body.textContent ?? "").toMatch(/ML:available\|\s*Shopee:provider_disconnected/);

    view.unmount();
  });
});
