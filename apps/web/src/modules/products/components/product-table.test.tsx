/** @vitest-environment jsdom */

import React, { act } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { productCatalogQueryKey } from "../hooks/use-product-data";
import { ProductTable } from "./product-table";
import type { ProductTableRow } from "../types/products";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const { apiClientMocks } = vi.hoisted(() => ({
  apiClientMocks: {
    patch: vi.fn(),
  },
}));

vi.mock("next/image", () => ({
  default: ({
    alt,
    src,
  }: {
    alt: string;
    src: string;
  }) => React.createElement("img", { alt, src }),
}));

vi.mock("@/lib/api/client", () => ({
  ApiClientError: class ApiClientError extends Error {
    status: number;

    constructor(message: string, status = 400) {
      super(message);
      this.status = status;
    }
  },
  apiClient: apiClientMocks,
}));

function buildRow(index: number, overrides: Partial<ProductTableRow> = {}): ProductTableRow {
  return {
    actualRoas: 2.4,
    adSpend: 120,
    advertisingCost: 120,
    channelLabel: "mercadolivre",
    commissionPct: 16,
    contributionMarginRatio: 0.18,
    coverImageUrl: "https://example.com/product.png",
    displayName: `Produto ${index}`,
    id: `2026-06-01:mercadolivre:SKU-${index}`,
    isActive: true,
    minimumRoas: 5.55,
    name: `Produto ${index}`,
    netLiquidSales: 8,
    packagingCost: 4,
    performanceId: `perf_${index}`,
    referenceMonth: "2026-06-01",
    returns: 2,
    revenue: 960,
    roiRatio: 0.41,
    sales: 10,
    sellingPrice: 120,
    shipping: 15,
    sku: `SKU-${index}`,
    taxPct: 9,
    totalCommission: 128,
    totalPackagingCost: 32,
    totalProductCost: 480,
    totalProfit: 160,
    unitCost: 60,
    unitProfit: 20,
    variationLabel: null,
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

function renderWithClient(node: React.ReactNode, client?: QueryClient) {
  const queryClient =
    client ??
    new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    });

  return {
    queryClient,
    ...mount(<QueryClientProvider client={queryClient}>{node}</QueryClientProvider>),
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

beforeEach(() => {
  apiClientMocks.patch.mockReset();
});

describe("ProductTable", () => {
  it("opens monthly details modal on row click and keeps current page after close", () => {
    const rows = Array.from({ length: 11 }, (_, index) => buildRow(index + 1));
    const view = renderWithClient(<ProductTableHarness rows={rows} />);

    click(Array.from(document.querySelectorAll("button")).find((button) => button.textContent?.trim() === "2")!);
    click(document.querySelector("tbody tr")!);

    expect(document.body.textContent).toContain("Visão Geral de Vendas");
    expect(document.body.textContent).toContain("Produto 11");
    expect(document.body.textContent).toContain("SKU-11");
    expect(document.querySelector('img[alt="Produto 11"]')).not.toBeNull();

    click(Array.from(document.querySelectorAll("button")).find((button) => button.textContent?.trim() === "Composição")!);
    expect(document.body.textContent).toContain("Composição de Preço");
    expect(document.body.textContent).toContain("Comissão MELI");
    expect(document.body.textContent).toContain("Investimento em Publicidade");

    click(document.querySelector('[aria-label="Close"]')!);

    expect(document.body.textContent).not.toContain("Visão Geral de Vendas");
    expect(document.body.textContent).toContain("Página 2 de 2");

    view.unmount();
  });

  it("opens modal with keyboard, keeps search filter, and renders placeholders for unavailable values", () => {
    const row = buildRow(1, {
      actualRoas: null,
      coverImageUrl: null,
      minimumRoas: null,
      roiRatio: null,
      unitProfit: null,
    });
    const rows = [row, buildRow(2)];
    const view = renderWithClient(
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

    expect(document.body.textContent).toContain("Visão Geral de Vendas");
    expect(document.body.textContent).toContain("Sem foto");

    click(Array.from(document.querySelectorAll("button")).find((button) => button.textContent?.trim() === "Composição")!);
    expect(document.body.textContent).toContain("Composição de Preço");

    keydown(document, "Escape");

    expect(document.body.textContent).not.toContain("Visão Geral de Vendas");
    expect((document.querySelector('input[placeholder="Nome ou SKU do produto..."]') as HTMLInputElement).value).toBe("Produto 1");

    view.unmount();
  });

  it("saves edited advertising cost from composition tab and invalidates analytics query", async () => {
    apiClientMocks.patch.mockResolvedValue({
      data: { id: "perf_1" },
      error: null,
    });

    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const view = renderWithClient(
      <ProductTable
        onPageChange={() => {}}
        pagination={{ currentPage: 1, pageSize: 10, totalItems: 1, totalPages: 1 }}
        rows={[buildRow(1)]}
      />,
      queryClient,
    );

    click(document.querySelector("tbody tr")!);
    click(Array.from(document.querySelectorAll("button")).find((button) => button.textContent?.trim() === "Composição")!);

    const adsInput = document.querySelector('input[name="advertisingCost"]') as HTMLInputElement;
    changeInputValue(adsInput, "240.00");

    await act(async () => {
      document.querySelector('button[type="submit"]')?.dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
    });

    expect(apiClientMocks.patch).toHaveBeenCalledWith("/performance/perf_1", {
      body: {
        advertisingCost: "240.00",
      },
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: productCatalogQueryKey });

    view.unmount();
  });
});
