import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  convertManualProductTaxRateToFraction,
  isManualProductTaxRateValid,
  normalizeManualProductTaxRateInput,
} from "./products-shell";
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
    const markup = renderToStaticMarkup(<ProductsHub organizationName="MarginFlow" />);
    expect(markup).toContain("Selecione uma secao no menu para continuar.");
  });

  it("normalizes integer tax percentages for the manual product modal", () => {
    expect(normalizeManualProductTaxRateInput(" 15 ")).toBe("15");
    expect(normalizeManualProductTaxRateInput("15.5")).toBeNull();
    expect(isManualProductTaxRateValid("15")).toBe(true);
    expect(isManualProductTaxRateValid("101")).toBe(false);
    expect(convertManualProductTaxRateToFraction("15")).toBe("0.150000");
  });
});
