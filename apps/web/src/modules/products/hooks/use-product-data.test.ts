import { beforeEach, describe, expect, it, vi } from "vitest";

const apiClientMock = vi.hoisted(() => ({
  getValidatedData: vi.fn(),
}));

vi.mock("@/lib/api/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/client")>("@/lib/api/client");

  return {
    ...actual,
    apiClient: apiClientMock,
  };
});

import { fetchProductCatalog } from "./use-product-data";

describe("products protected fetchers", () => {
  beforeEach(() => {
    apiClientMock.getValidatedData.mockReset();
  });

  it("uses the analytics snapshot endpoint as the primary source when mock mode is off", async () => {
    apiClientMock.getValidatedData.mockResolvedValue({
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
        companyId: "11111111-1111-4111-8111-111111111111",
        companyRequired: false,
        referenceMonth: "2026-05-01",
      },
      syncedProducts: [],
    });

    await fetchProductCatalog({
      referenceMonth: "2026-05-01",
    });

    expect(apiClientMock.getValidatedData).toHaveBeenCalledWith(
      "/products/analytics?referenceMonth=2026-05-01",
      expect.any(Object),
    );
  });
});
