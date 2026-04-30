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
      },
      error: null,
      isLoading: false,
    });

    const markup = renderToStaticMarkup(<ProductsHub organizationName="MarginFlow" />);

    expect(markup).toContain("Product and cost management hub");
    expect(markup).toContain("No catalog data exists yet.");
    expect(markup).toContain("Create product");
  });

  it("renders API failure state", () => {
    reactQueryMocks.useQuery.mockReturnValue({
      data: null,
      error: new Error("Boom"),
      isLoading: false,
    });

    const markup = renderToStaticMarkup(<ProductsHub organizationName="MarginFlow" />);

    expect(markup).toContain("We could not load your catalog");
    expect(markup).toContain("Boom");
  });
});
