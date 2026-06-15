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

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/app/products",
}));

describe("ProductsHub", () => {
  beforeEach(() => {
    reactQueryMocks.invalidateQueries.mockReset();
    reactQueryMocks.useMutation.mockClear();
    reactQueryMocks.useQuery.mockReset();
  });

  it("renders the shell wrapper with fallback message", () => {
    const markup = renderToStaticMarkup(<ProductsHub organizationName="Lucreii" />);
    expect(markup).toContain("Selecione uma secao no menu para continuar.");
  });
});
