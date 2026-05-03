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

  it("renders an empty-state management workspace", () => {
    reactQueryMocks.useQuery.mockReturnValue({
      data: {
        adCosts: [],
        manualExpenses: [],
        productCosts: [],
        products: [],
        syncedProducts: [],
      },
      error: null,
      isLoading: false,
    });

    const markup = renderToStaticMarkup(<ProductsHub organizationName="MarginFlow" />);

    expect(markup).toContain("Gestao de produtos e custos");
    expect(markup).toContain("Ainda nao ha dados no catalogo.");
    expect(markup).toContain("Criar produto");
    expect(markup).toContain("Produtos sincronizados para revisao");
  });

  it("renders API failure state", () => {
    reactQueryMocks.useQuery.mockReturnValue({
      data: null,
      error: new Error("Boom"),
      isLoading: false,
    });

    const markup = renderToStaticMarkup(<ProductsHub organizationName="MarginFlow" />);

    expect(markup).toContain("Nao conseguimos carregar seu catalogo");
    expect(markup).toContain("Boom");
  });
});
