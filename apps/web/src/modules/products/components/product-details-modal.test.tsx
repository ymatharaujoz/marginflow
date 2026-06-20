/** @vitest-environment jsdom */

import React, { act } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { ProductDetailsModal } from "./product-details-modal";
import type { ProductTableRow } from "../types/products";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function buildRow(overrides: Partial<ProductTableRow> = {}): ProductTableRow {
  return {
    actualRoas: 3.12,
    adSpend: 0,
    advertisingCost: 0,
    catalogGroupKey: null,
    catalogRole: "standalone",
    channelLabel: "mercadolivre",
    children: [],
    commissionPct: 11.74,
    contributionMarginRatio: 0.21,
    coverImageUrl: null,
    displayName: "Acessório De Celular",
    id: "2026-06-01:mercadolivre:ACC-1",
    isActive: true,
    minimumRoas: 4.77,
    name: "Acessório De Celular",
    netLiquidSales: 3,
    packagingCost: 0,
    parentProductId: null,
    performanceId: "perf_acc_1",
    productId: null,
    referenceMonth: "2026-06-01",
    returns: 0,
    revenue: 89.7,
    roiRatio: 1.2,
    sales: 3,
    sellingPrice: 29.9,
    shipping: 0,
    sku: "ACC-1",
    taxPct: 0,
    totalCommission: 31.62,
    totalPackagingCost: 0,
    totalProductCost: 69,
    totalProfit: 20.28,
    unitCost: 23,
    unitProfit: 6.76,
    variationLabel: "Cor: Transparente",
    ...overrides,
  };
}

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

function renderWithClient(node: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });

  return mount(<QueryClientProvider client={queryClient}>{node}</QueryClientProvider>);
}

function click(element: Element) {
  act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function normalizedTextContent() {
  return document.body.textContent?.replace(/\u00a0/g, " ") ?? "";
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("ProductDetailsModal", () => {
  it("shows total MELI commission for the selected row", () => {
    const row = buildRow({ taxPct: 13 });
    const view = renderWithClient(
      <ProductDetailsModal onClose={() => {}} open row={row} />,
    );

    click(Array.from(document.querySelectorAll("button")).find((button) => button.textContent?.trim() === "Composição")!);

    const text = normalizedTextContent();

    expect(text).toContain("Comissão MELI");
    expect(text).toContain("R$ 31,62");
    expect(text).not.toContain("R$ 3,51");
    expect(text).toContain("Imposto");
    expect(text).toContain("13%");

    view.unmount();
  });

  it("still renders the total commission for a single-unit row", () => {
    const row = buildRow({
      netLiquidSales: 1,
      sales: 1,
      totalCommission: 11.67,
    });
    const view = renderWithClient(
      <ProductDetailsModal onClose={() => {}} open row={row} />,
    );

    click(Array.from(document.querySelectorAll("button")).find((button) => button.textContent?.trim() === "Composição")!);

    expect(normalizedTextContent()).toContain("R$ 11,67");

    view.unmount();
  });

  it("reuses the child commission value and derives net revenue as FATURAMENTO - (COMISSÃO MELI × VENDAS) for a parent row with variations", () => {
    const child = buildRow({
      id: "child-1",
      netLiquidSales: 1,
      sales: 1,
      sku: "CHILD-1",
      totalCommission: 10.54,
    });
    const row = buildRow({
      catalogRole: "parent",
      children: [child],
      id: "parent-1",
      netLiquidSales: 4,
      revenue: 119.6,
      sales: 4,
      sku: "PARENT-1",
      totalCommission: 100,
    });
    const view = renderWithClient(
      <ProductDetailsModal onClose={() => {}} open row={row} />,
    );

    click(Array.from(document.querySelectorAll("button")).find((button) => button.textContent?.trim() === "Composição")!);

    const text = normalizedTextContent();

    expect(text).toContain("R$ 10,54");

    view.unmount();

    const view2 = renderWithClient(
      <ProductDetailsModal onClose={() => {}} open row={row} />,
    );

    const overviewText = normalizedTextContent();

    expect(overviewText).toContain("R$ 77,44");

    view2.unmount();
  });

  it("calculates net revenue using commission total when commission exceeds revenue on multiplication", () => {
    const row = buildRow({ totalCommission: 31.62 });
    const view = renderWithClient(
      <ProductDetailsModal onClose={() => {}} open row={row} />,
    );

    const text = normalizedTextContent();

    expect(text).toContain("Receita Líquida");
    expect(text).toContain("R$ 58,08");

    view.unmount();
  });

  it("calculates net revenue by multiplying unit commission when it does not exceed revenue", () => {
    const row = buildRow({ totalCommission: 10.54 });
    const view = renderWithClient(
      <ProductDetailsModal onClose={() => {}} open row={row} />,
    );

    const text = normalizedTextContent();

    expect(text).toContain("Receita Líquida");
    expect(text).toContain("R$ 58,08");

    view.unmount();
  });
});
