import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProductsHub } from "./products-hub";

const reactQueryMocks = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  useMutation: vi.fn(() => ({
    isPending: false,
    mutate: vi.fn(),
  })),
  useQuery: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useMutation: reactQueryMocks.useMutation,
  useQuery: reactQueryMocks.useQuery,
  useQueryClient: () => ({
    invalidateQueries: reactQueryMocks.invalidateQueries,
  }),
}));

describe("ProductsHub", () => {
  beforeEach(() => {
    reactQueryMocks.invalidateQueries.mockReset();
    reactQueryMocks.useMutation.mockClear();
    reactQueryMocks.useQuery.mockReset();
  });

  it("renders an empty catalog workspace", () => {
    reactQueryMocks.useQuery.mockReturnValueOnce({
      data: {
        adCosts: [],
        catalogStats: {
          activeProducts: 0,
          archivedProducts: 0,
          pendingSyncProducts: 0,
          productsWithCost: 0,
          productsWithoutCost: 0,
          syncedProductsTotal: 0,
          totalAdCosts: 0,
          totalManualExpenses: 0,
          totalProductCosts: 0,
          totalProducts: 0,
        },
        dataGaps: [],
        financialState: "empty",
        manualExpenses: [],
        monthlyPerformanceRows: [],
        productCosts: [],
        productRows: [],
        products: [],
        scope: {
          companyId: null,
          companyRequired: false,
          referenceMonth: "2026-05-01",
        },
        syncedProducts: [],
      },
      error: null,
      isLoading: false,
    });

    const markup = renderToStaticMarkup(<ProductsHub organizationName="MarginFlow" />);

    expect(markup).toContain("Catálogo vazio");
    expect(markup).toContain("Criar primeiro produto");
  });

  it("renders API failure state", () => {
    reactQueryMocks.useQuery.mockReturnValueOnce({
      data: null,
      error: new Error("Boom"),
      isLoading: false,
    });

    const markup = renderToStaticMarkup(<ProductsHub organizationName="MarginFlow" />);

    expect(markup).toContain("Erro ao carregar dados");
    expect(markup).toContain("Não foi possível carregar o catálogo de produtos.");
  });
});
