/** @vitest-environment jsdom */

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { ProductTable } from "./product-table";
import type { ProductTableRow } from "../types/products";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function buildRow(index: number, overrides: Partial<ProductTableRow> = {}): ProductTableRow {
  return {
    actualRoas: 2.4,
    adSpend: 120,
    channelLabel: "mercadolivre",
    commissionPct: 16,
    contributionMarginRatio: 0.18,
    id: `2026-06-01:mercadolivre:SKU-${index}`,
    minimumRoas: 5.55,
    name: `Produto ${index}`,
    netLiquidSales: 8,
    packagingCost: 4,
    referenceMonth: "2026-06-01",
    returns: 2,
    revenue: 960,
    roiRatio: 0.41,
    sales: 10,
    sellingPrice: 120,
    shipping: 15,
    sku: `SKU-${index}`,
    taxPct: 9,
    totalPackagingCost: 32,
    totalProductCost: 480,
    totalProfit: 160,
    unitCost: 60,
    unitProfit: 20,
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
    container,
    rerender(next: React.ReactNode) {
      act(() => {
        root.render(next);
      });
    },
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

function keydown(element: Element | Document, key: string) {
  act(() => {
    element.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key }));
  });
}

function changeInputValue(element: HTMLInputElement, value: string) {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  descriptor?.set?.call(element, value);
  act(() => {
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function ProductTableHarness({
  rows,
}: {
  rows: ProductTableRow[];
}) {
  const [currentPage, setCurrentPage] = React.useState(1);

  return (
    <ProductTable
      onPageChange={setCurrentPage}
      pagination={{ currentPage, pageSize: 10, totalItems: rows.length, totalPages: 2 }}
      rows={rows}
    />
  );
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("ProductTable", () => {
  it("opens monthly details modal on row click and keeps current page after close", () => {
    const rows = Array.from({ length: 11 }, (_, index) => buildRow(index + 1));
    const view = mount(<ProductTableHarness rows={rows} />);

    click(Array.from(document.querySelectorAll("button")).find((button) => button.textContent?.trim() === "2")!);
    click(document.querySelector("tbody tr")!);

    expect(document.body.textContent).toContain("Detalhes mensais");
    expect(document.body.textContent).toContain("Produto 11");
    expect(document.body.textContent).toContain("SKU-11");
    expect(document.body.textContent).toContain("ROAS Real");

    click(document.querySelector('[aria-label="Close"]')!);

    expect(document.body.textContent).not.toContain("Detalhes mensais");
    expect(document.body.textContent).toContain("Página 2 de 2");

    view.unmount();
  });

  it("opens modal with keyboard, keeps search filter, and renders placeholders for unavailable values", () => {
    const row = buildRow(1, {
      actualRoas: null,
      minimumRoas: null,
      roiRatio: null,
      unitProfit: null,
    });
    const rows = [row, buildRow(2)];
    const view = mount(
      <ProductTable
        onPageChange={() => {}}
        pagination={{ currentPage: 1, pageSize: 10, totalItems: rows.length, totalPages: 1 }}
        rows={rows}
      />,
    );

    click(document.querySelector("button")!);
    const search = document.querySelector('input[placeholder="Nome ou SKU do produto..."]') as HTMLInputElement;
    changeInputValue(search, "Produto 1");

    const tableRow = document.querySelector("tbody tr")!;
    keydown(tableRow, "Enter");

    expect(document.body.textContent).toContain("Detalhes mensais");
    expect(document.body.textContent).toContain("ROI");
    expect(document.body.textContent).toContain("ROAS Mínimo");
    expect(document.body.textContent).toContain("ROAS Real");
    expect(document.body.textContent).toContain("—");

    keydown(document, "Escape");

    expect(document.body.textContent).not.toContain("Detalhes mensais");
    expect((document.querySelector('input[placeholder="Nome ou SKU do produto..."]') as HTMLInputElement).value).toBe("Produto 1");

    view.unmount();
  });
});
