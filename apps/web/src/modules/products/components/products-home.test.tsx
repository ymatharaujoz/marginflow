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
    download: vi.fn(),
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
          catalogGroupKey: "meli:MLB123",
          catalogRole: "parent",
          coverImageUrl: "https://example.com/product.png",
          createdAt: "2026-06-17T10:00:00.000Z",
          children: [
            {
              catalogGroupKey: "meli:MLB123",
              catalogRole: "child",
              coverImageUrl: "https://example.com/product-variation.png", 
              createdAt: "2026-06-17T10:00:00.000Z", 
              children: [], 
              derivedFromProvider: "mercadolivre", 
              financeDefaults: {
                advertisingCost: "0.00",
                createdAt: "2026-06-17T10:00:00.000Z",
                id: "defaults_2",
                packagingCost: "2.25",
                productId: "product_2",
                updatedAt: "2026-06-17T10:00:00.000Z",
              }, 
              id: "product_2", 
              images: [
                {
                  externalIdentifier: null,
                  id: "image_2",
                  position: 0,
                  productId: "product_2",
                  source: "manual",
                  url: "https://example.com/product-variation.png",
                },
              ], 
              isActive: true, 
              latestCost: {
                amount: "19.00",
                companyId: "company_1",
                costType: "base",
                createdAt: "2026-06-17T10:00:00.000Z",
                currency: "BRL",
                effectiveFrom: null,
                id: "cost_2",
                notes: null,
                organizationId: "org_1",
                productId: "product_2",
                updatedAt: "2026-06-17T10:00:00.000Z",
              }, 
              name: "Kit Mercado Livre - Azul",
              organizationId: "org_1",
              parentProductId: "product_1",
              sellingPrice: "149.90",
              sku: "ML-001-AZ",
              updatedAt: "2026-06-17T10:00:00.000Z",
              variationLabel: "Cor: Azul",
            },
          ], 
          derivedFromProvider: "mercadolivre", 
          financeDefaults: {
            advertisingCost: "0.00",
            createdAt: "2026-06-17T10:00:00.000Z",
            id: "defaults_1",
            packagingCost: "4.50",
            productId: "product_1",
            updatedAt: "2026-06-17T10:00:00.000Z",
          }, 
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
          latestCost: {
            amount: "30.00",
            companyId: "company_1",
            costType: "base",
            createdAt: "2026-06-17T10:00:00.000Z",
            currency: "BRL",
            effectiveFrom: null,
            id: "cost_1",
            notes: null,
            organizationId: "org_1",
            productId: "product_1",
            updatedAt: "2026-06-17T10:00:00.000Z",
          }, 
          name: "Kit Mercado Livre",
          organizationId: "org_1",
          parentProductId: null,
          sellingPrice: "149.90",
          sku: "ML-001",
          updatedAt: "2026-06-17T10:00:00.000Z",
          variationLabel: null,
        },
      ],
      scope: {
        companyId: null,
      },
    },
    error: null,
    financialState: "no-costs",
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
      <ProductsHome view="catalog" />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

beforeEach(() => {
  refreshMock.mockReset();
  refetchMock.mockReset();
  apiClientMocks.delete.mockReset();
  apiClientMocks.download.mockReset();
  apiClientMocks.patch.mockReset();
  vi.stubGlobal("confirm", vi.fn(() => true));
  vi.stubGlobal(
    "URL",
    Object.assign(globalThis.URL ?? class {}, {
      createObjectURL: vi.fn(() => "blob:catalog"),
      revokeObjectURL: vi.fn(),
    }),
  );
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});

describe("ProductsHome catalog modal", () => { 
  it("keeps catalog table visible when products exist", () => { 
    const view = renderProductsHome(); 
 
    expect(document.body.textContent).toContain("Produtos do cat"); 
    expect(document.body.textContent).toContain("Kit Mercado Livre"); 
    expect(document.body.textContent).not.toContain("Kit Mercado Livre - Azul"); 
    expect(document.body.textContent).not.toContain("Cadastre custos de produto"); 
 
    view.unmount(); 
  }); 

  it("exports filtered catalog rows as xlsx using current search and marketplace filters", async () => {
    apiClientMocks.download.mockResolvedValue(new Blob(["xlsx"]));

    const view = renderProductsHome();

    click(
      Array.from(document.querySelectorAll("button")).find((button) =>
        button.textContent?.includes("Filtros"),
      )!,
    );

    const searchInput = document.querySelector('input[placeholder*="Nome ou SKU"]') as HTMLInputElement;
    changeInputValue(searchInput, "Kit");

    click(
      Array.from(document.querySelectorAll("button")).find((button) =>
        button.textContent?.includes("MELI"),
      )!,
    );

    await act(async () => {
      click(
        Array.from(document.querySelectorAll("button")).find((button) =>
          button.textContent?.includes("Exportar"),
        )!,
      );
      await Promise.resolve();
    });

    expect(apiClientMocks.download).toHaveBeenCalledWith(
      "/products/export?search=Kit&marketplaces=mercadolivre",
    );
    expect(globalThis.URL.createObjectURL).toHaveBeenCalled();
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();

    view.unmount();
  });

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

  it("expands parent rows to show child variations with own costs and allows saving child finance", async () => {
    apiClientMocks.patch.mockResolvedValue({
      data: { id: "product_2" },
      error: null,
    });

    const view = renderProductsHome();

    click(
      Array.from(document.querySelectorAll("button")).find((button) =>
        button.getAttribute("aria-label")?.includes("Expandir"),
      )!,
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(document.body.textContent).toContain("Kit Mercado Livre - Azul");
    expect(document.body.textContent).toMatch(/R\$\s*19,00/);
    expect(document.body.textContent).toMatch(/R\$\s*2,25/);

    click(document.querySelector('[data-testid="child-product-row"]')!);

    expect(document.body.textContent).toContain("Informações Financeiras");
    expect(document.body.textContent).toContain(
      "Salvar aqui altera apenas esta varia",
    );

    const unitCostInput = document.querySelector('input[name="unitCost"]') as HTMLInputElement;
    const packagingInput = document.querySelector('input[name="packagingCost"]') as HTMLInputElement;
    expect(unitCostInput.disabled).toBe(false);
    expect(packagingInput.disabled).toBe(false);
    expect(unitCostInput.value).toContain("19");
    expect(packagingInput.value).toContain("2");

    expect(
      Array.from(document.querySelectorAll("button")).some((button) =>
        button.textContent?.includes("Excluir produto"),
      ),
    ).toBe(true);

    changeInputValue(unitCostInput, "21.50");
    changeInputValue(packagingInput, "2.75");

    act(() => {
      unitCostInput.dispatchEvent(new Event("focusout", { bubbles: true }));
      packagingInput.dispatchEvent(new Event("focusout", { bubbles: true }));
    });

    await act(async () => {
      await Promise.resolve();
    });

    click(
      Array.from(document.querySelectorAll("button")).find((button) =>
        button.textContent?.includes("Salvar"),
      )!,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(apiClientMocks.patch).toHaveBeenCalledWith("/products/product_2/catalog-finance", {
      body: {
        packagingCost: "2.75",
        unitCost: "21.50",
      },
    });

    view.unmount();
  });
});
