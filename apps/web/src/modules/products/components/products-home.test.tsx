/** @vitest-environment jsdom */

import React, { act } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
import { ProductsHome } from "./products-home";

const { apiClientMocks, refetchMock, refreshMock } = vi.hoisted(() => ({
  apiClientMocks: {
    delete: vi.fn(),
    patch: vi.fn(),
  },
  refetchMock: vi.fn(),
  refreshMock: vi.fn(),
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

vi.mock("./product-header", () => ({
  ProductHeader: () => <div>Product header</div>,
}));

vi.mock("./product-financial-indicators", () => ({
  ProductFinancialIndicators: () => <div>Product financial indicators</div>,
}));

vi.mock("../calculations/product-insights", () => ({
  buildMarketplaceSyncNotice: () => null,
}));

vi.mock("../hooks/use-product-data", () => ({
  formatReferenceMonthPtBr: () => "junho de 2026",
  useProductData: () => ({
    data: {
      products: [
        {
          coverImageUrl: "https://example.com/product.png",
          createdAt: "2026-06-17T10:00:00.000Z",
          financeDefaults: null,
          id: "product_1",
          images: [
            {
              externalIdentifier: null,
              id: "image_1",
              position: 0,
              productId: "product_1",
              source: "manual",
              url: "https://example.com/product.png",
            },
          ],
          isActive: true,
          latestCost: null,
          name: "Kit Mercado Livre",
          organizationId: "org_1",
          sellingPrice: "149.90",
          sku: "ML-001",
          updatedAt: "2026-06-17T10:00:00.000Z",
        },
      ],
      scope: {
        companyId: null,
      },
    },
    error: null,
    financialState: "ready",
    goToPage: vi.fn(),
    isLoading: false,
    isUnauthorized: false,
    pagination: { currentPage: 1, pageSize: 10, totalItems: 1, totalPages: 1 },
    referenceMonth: "2026-06-01",
    referenceMonthSelectOptions: ["2026-06-01"],
    refetch: refetchMock,
    refresh: refreshMock,
    rows: [],
    setReferenceMonth: vi.fn(),
    stats: {
      activeProducts: 1,
      archivedProducts: 0,
      pendingSyncProducts: 0,
      productsWithCost: 0,
      productsWithoutCost: 1,
      syncedProductsTotal: 0,
      totalAdCosts: 0,
      totalManualExpenses: 0,
      totalProductCosts: 0,
      totalProducts: 1,
    },
  }),
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

function changeInputValue(element: HTMLInputElement, value: string) {
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  );
  descriptor?.set?.call(element, value);
  act(() => {
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function renderProductsHome() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });

  return mount(
    <QueryClientProvider client={queryClient}>
      <ProductsHome organizationName="Org" view="catalog" />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  document.body.innerHTML = "";
});

beforeEach(() => {
  refreshMock.mockReset();
  refetchMock.mockReset();
  apiClientMocks.delete.mockReset();
  apiClientMocks.patch.mockReset();
  vi.stubGlobal("confirm", vi.fn(() => true));
});

describe("ProductsHome catalog modal", () => {
  it("opens modal, keeps non-finance fields read-only, saves finance inputs, and deletes product", async () => {
    apiClientMocks.patch.mockResolvedValue({
      data: { id: "product_1" },
      error: null,
    });
    apiClientMocks.delete.mockResolvedValue({
      data: { id: "product_1" },
      error: null,
    });

    const view = renderProductsHome();

    click(document.querySelector("tbody tr")!);

    expect(document.body.textContent).toContain("Kit Mercado Livre");
    expect(document.body.textContent).toContain("SKU: ML-001");
    expect(document.body.textContent).toMatch(/R\$\s*149[.,]90/);

    const unitCostInput = document.querySelector('input[name="unitCost"]') as HTMLInputElement;
    const packagingInput = document.querySelector('input[name="packagingCost"]') as HTMLInputElement;

    changeInputValue(unitCostInput, "30.00");
    changeInputValue(packagingInput, "4.50");

    act(() => {
      unitCostInput.dispatchEvent(new Event("focusout", { bubbles: true }));
      packagingInput.dispatchEvent(new Event("focusout", { bubbles: true }));
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    click(
      Array.from(document.querySelectorAll("button")).find((button) =>
        button.textContent?.includes("Salvar"),
      )!,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(apiClientMocks.patch).toHaveBeenCalledWith("/products/product_1/catalog-finance", {
      body: {
        packagingCost: "4.50",
        unitCost: "30.00",
      },
    });
    expect(refreshMock).toHaveBeenCalled();

    click(document.querySelector("tbody tr")!);
    click(
      Array.from(document.querySelectorAll("button")).find((button) =>
        button.textContent?.includes("Excluir produto"),
      )!,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(globalThis.confirm).toHaveBeenCalled();
    expect(apiClientMocks.delete).toHaveBeenCalledWith("/products/product_1");

    view.unmount();
  });
});
