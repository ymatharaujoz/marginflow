/** @vitest-environment jsdom */

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DashboardChartsResponse, DashboardRecentSyncResponse } from "@lucreii/types";
import { MarketplacesSection } from "./marketplaces-section";

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

function buildRecentSync(
  overrides: Partial<DashboardRecentSyncResponse>,
): DashboardRecentSyncResponse {
  return {
    activeRun: null,
    availability: {
      canRun: true,
      currentWindowKey: null,
      currentWindowLabel: null,
      currentWindowSlot: null,
      lastSuccessfulSyncAt: "2026-06-17T12:00:00.000Z",
      message: "Disponivel",
      nextAvailableAt: null,
      provider: "mercadolivre",
      reason: "available",
    },
    lastCompletedRun: {
      counts: { fees: 0, items: 0, orders: 0, products: 0 },
      createdAt: "2026-06-17T12:00:00.000Z",
      cursor: null,
      errorSummary: null,
      finishedAt: "2026-06-17T12:00:00.000Z",
      id: "run_1",
      origin: "manual",
      provider: "mercadolivre",
      startedAt: "2026-06-17T11:59:00.000Z",
      status: "completed",
      updatedAt: "2026-06-17T12:00:00.000Z",
      windowKey: null,
    },
    ...overrides,
  };
}

const chartsData: DashboardChartsResponse = {
  channels: [
    { channel: "Mercado Livre", grossRevenue: 1200, netProfit: 300, unitsSold: 5 },
    { channel: "shopee", grossRevenue: 800, netProfit: 180, unitsSold: 4 },
  ],
  daily: [],
};

afterEach(() => {
  document.body.innerHTML = "";
});

describe("MarketplacesSection", () => {
  it("renders only Conectado, Sincronizando, and Desconectado labels from provider-specific sync status", () => {
    const view = mount(
      <MarketplacesSection
        data={chartsData}
        syncStatusByProvider={{
          mercadolivre: buildRecentSync({}),
          shopee: buildRecentSync({
            activeRun: {
              counts: { fees: 0, items: 0, orders: 0, products: 0 },
              createdAt: "2026-06-17T12:05:00.000Z",
              cursor: null,
              errorSummary: null,
              finishedAt: null,
              id: "run_2",
              origin: "manual",
              provider: "shopee",
              startedAt: "2026-06-17T12:05:00.000Z",
              status: "running",
              updatedAt: "2026-06-17T12:05:00.000Z",
              windowKey: null,
            },
            availability: {
              canRun: false,
              currentWindowKey: null,
              currentWindowLabel: null,
              currentWindowSlot: null,
              lastSuccessfulSyncAt: null,
              message: "Sincronizando",
              nextAvailableAt: null,
              provider: "shopee",
              reason: "sync_in_progress",
            },
            lastCompletedRun: null,
          }),
          shein: undefined,
        }}
      />,
    );

    expect(document.body.textContent).toContain("Conectado");
    expect(document.body.textContent).toContain("Sincronizando");
    expect(document.body.textContent).not.toContain("NÃ£o verificado");
    expect(document.body.textContent).not.toContain("Com dados");
    expect(document.body.textContent).not.toContain("Atrasado");
    expect(document.body.textContent).not.toContain("Nunca sync");

    view.unmount();
  });

  it("shows Mercado Livre as connected even when Shopee is selected elsewhere", () => {
    const view = mount(
      <MarketplacesSection
        data={{ channels: [{ channel: "shopee", grossRevenue: 800, netProfit: 180, unitsSold: 4 }], daily: [] }}
        syncStatusByProvider={{
          mercadolivre: buildRecentSync({}),
          shopee: buildRecentSync({
            availability: {
              canRun: false,
              currentWindowKey: null,
              currentWindowLabel: null,
              currentWindowSlot: null,
              lastSuccessfulSyncAt: null,
              message: "Desconectado",
              nextAvailableAt: null,
              provider: "shopee",
              reason: "provider_disconnected",
            },
            lastCompletedRun: null,
          }),
          shein: undefined,
        }}
      />,
    );

    const text = document.body.textContent ?? "";
    expect(text).toContain("Mercado Livre");
    expect(text).toContain("Shopee");
    expect(text).toMatch(/Mercado Livre[\s\S]*Conectado/);
    expect(text).toMatch(/Shopee[\s\S]*Desconectado/);

    view.unmount();
  });
});
