import { beforeEach, describe, expect, it, vi } from "vitest";

const apiClientMock = vi.hoisted(() => ({
  download: vi.fn(),
  getValidatedData: vi.fn(),
  patch: vi.fn(),
}));
const useQueryMock = vi.hoisted(() => vi.fn());
const useMutationMock = vi.hoisted(() => vi.fn());
const invalidateQueriesMock = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-query", () => ({
  useMutation: useMutationMock,
  useQuery: useQueryMock,
  useQueryClient: () => ({
    invalidateQueries: invalidateQueriesMock,
  }),
}));
vi.mock("@/lib/api/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/client")>("@/lib/api/client");

  return {
    ...actual,
    apiClient: apiClientMock,
  };
});

import {
  downloadOrdersExport,
  fetchOrderDetails,
  fetchOrders,
  updateOrderComposition,
  useUpdateOrderComposition,
  useOrderDetails,
  useOrdersList,
} from "./use-orders-data";

describe("orders protected fetchers", () => {
  beforeEach(() => {
    apiClientMock.download.mockReset();
    apiClientMock.getValidatedData.mockReset();
    apiClientMock.patch.mockReset();
    useQueryMock.mockReset();
    useMutationMock.mockReset();
    invalidateQueriesMock.mockReset();
  });

  it("uses protected orders list endpoint as data source", async () => {
    apiClientMock.getValidatedData.mockResolvedValue({
      summary: {
        averageMargin: "0.00",
        grossProfit: "0.00",
        grossRevenue: "0.00",
        ordersCount: 0,
        unitsSold: 0,
      },
      availableStatuses: [],
      items: [],
      page: 1,
      pageSize: 20,
      totalItems: 0,
      totalPages: 1,
    });

    await fetchOrders({
      includeSummary: false,
      page: 1,
      pageSize: 20,
      provider: "mercadolivre",
      search: "MLB-1001",
      sortBy: "orderedAt",
      sortDirection: "desc",
      status: "paid",
    });

    expect(apiClientMock.getValidatedData).toHaveBeenCalledWith(
      "/orders?page=1&pageSize=20&search=MLB-1001&provider=mercadolivre&status=paid&sortBy=orderedAt&sortDirection=desc&includeSummary=false",
      expect.any(Object),
    );
  });

  it("sends ordered date range filters to orders list endpoint", async () => {
    apiClientMock.getValidatedData.mockResolvedValue({
      summary: {
        averageMargin: "0.00",
        grossProfit: "0.00",
        grossRevenue: "0.00",
        ordersCount: 0,
        unitsSold: 0,
      },
      availableStatuses: [],
      items: [],
      page: 1,
      pageSize: 20,
      totalItems: 0,
      totalPages: 1,
    });

    await fetchOrders({
      orderedFrom: "2026-06-01",
      orderedTo: "2026-06-30",
      page: 1,
      pageSize: 20,
    });

    expect(apiClientMock.getValidatedData).toHaveBeenCalledWith(
      "/orders?page=1&pageSize=20&orderedFrom=2026-06-01&orderedTo=2026-06-30",
      expect.any(Object),
    );
  });

  it("downloads orders export using filters", async () => {
    apiClientMock.download.mockResolvedValue(new Blob(["xlsx"]));

    await downloadOrdersExport({
      orderedFrom: "2026-06-01",
      orderedTo: "2026-06-30",
      provider: "mercadolivre",
      search: "MLB-1001",
      status: "paid",
    });

    expect(apiClientMock.download).toHaveBeenCalledWith(
      "/orders/export?search=MLB-1001&provider=mercadolivre&status=paid&orderedFrom=2026-06-01&orderedTo=2026-06-30",
    );
  });

  it("downloads selected orders export using ids", async () => {
    apiClientMock.download.mockResolvedValue(new Blob(["xlsx"]));

    await downloadOrdersExport({
      ids: ["order_1", "order_2"],
    });

    expect(apiClientMock.download).toHaveBeenCalledWith(
      "/orders/export?ids=order_1%2Corder_2",
    );
  });

  it("uses protected order detail endpoint as data source", async () => {
    apiClientMock.getValidatedData.mockResolvedValue({
      composition: {
        hasIncompleteCostData: false,
        marketplaceCommissionAmount: "0.00",
        missingCostItemsCount: 0,
        missingLinkedItemsCount: 0,
        netRevenueAmount: "0.00",
        packagingCostAmount: "0.00",
        productCostAmount: "0.00",
        refundBonusAmount: "0.00",
        revenueAmount: "0.00",
        shippingOrFixedFeeAmount: "0.00",
      },
      items: [
        {
          channel: "mercadolivre",
          contributionMarginPercent: "12.00",
          displayName: "Produto 1",
          id: "item_1",
          imageUrl: "https://cdn.example.com/product-1-cover.jpg",
          linkedProductId: "product_1",
          netRevenueAmount: "100.00",
          orderedAt: "2026-06-20T10:15:00.000Z",
          productName: "Produto 1",
          quantity: 2,
          sku: "SKU-1",
          totalProfitAmount: "12.00",
          totalPrice: "120.00",
          unitPrice: "60.00",
        },
      ],
        order: {
          createdAt: "2026-06-20T12:00:00.000Z",
          currency: "BRL",
          displayOrderId: "MLB-1001",
          fixedCostAmount: "0.00",
          id: "order_row_1",
          itemsSold: 0,
          orderDate: "2026-06-20",
          orderId: "MLB-1001",
          orderedAt: "2026-06-20T10:15:00.000Z",
          provider: "mercadolivre",
          shippingAmount: "0.00",
          sourceStatus: "paid",
          tariffAmount: "0.00",
          status: "paid",
          statusLabel: "Pagamento aprovado",
          totalFees: "0.00",
        totalWithFees: "0.00",
        totalWithoutFees: "0.00",
      },
    });

    await expect(fetchOrderDetails("order_row_1")).resolves.toEqual(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            imageUrl: "https://cdn.example.com/product-1-cover.jpg",
          }),
        ],
      }),
    );

    expect(apiClientMock.getValidatedData).toHaveBeenCalledWith(
      "/orders/order_row_1",
      expect.any(Object),
    );
  });

  it("updates protected order composition through patch endpoint", async () => {
    apiClientMock.patch.mockResolvedValue({
      data: {
        composition: {
          hasIncompleteCostData: false,
          marketplaceCommissionAmount: "15.00",
          missingCostItemsCount: 0,
          missingLinkedItemsCount: 0,
          netRevenueAmount: "160.00",
          packagingCostAmount: "12.00",
          productCostAmount: "80.00",
          refundBonusAmount: "5.00",
          revenueAmount: "200.00",
          shippingOrFixedFeeAmount: "30.00",
          taxAmount: "24.00",
          taxRateDefault: "0.120000",
        },
        items: [],
        order: {
          contributionMarginPercent: "21.50",
          createdAt: "2026-06-20T12:00:00.000Z",
          currency: "BRL",
          displayOrderId: "MLB-SALE-9001",
          fixedCostAmount: "3.00",
          id: "order_row_1",
          itemsSold: 2,
          orderDate: "2026-06-20",
          orderId: "MLB-1001",
          orderedAt: "2026-06-20T10:15:00.000Z",
          provider: "mercadolivre",
          shippingAmount: "20.00",
          sourceStatus: "paid",
          status: "paid",
          statusLabel: "Pagamento aprovado",
          tariffAmount: "10.00",
          totalFees: "33.00",
          totalProfitAmount: "43.00",
          totalWithFees: "200.00",
          totalWithoutFees: "167.00",
        },
      },
      error: null,
    });

    await expect(
      updateOrderComposition("order_row_1", {
        marketplaceCommissionAmount: "15.00",
        packagingCostAmount: "12.00",
        productCostAmount: "80.00",
        refundBonusAmount: "5.00",
        shippingOrFixedFeeAmount: "30.00",
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        composition: expect.objectContaining({
          marketplaceCommissionAmount: "15.00",
        }),
      }),
    );

    expect(apiClientMock.patch).toHaveBeenCalledWith(
      "/orders/order_row_1/composition",
      expect.objectContaining({
        body: expect.objectContaining({
          marketplaceCommissionAmount: "15.00",
          packagingCostAmount: "12.00",
          productCostAmount: "80.00",
          refundBonusAmount: "5.00",
          shippingOrFixedFeeAmount: "30.00",
        }),
      }),
    );
  });

  it("creates composition update mutation hook", () => {
    useUpdateOrderComposition();

    expect(useMutationMock).toHaveBeenCalled();
  });

  it("keys order detail queries by selected company", () => {
    const originalDocument = globalThis.document;
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        cookie: "lucreii_selected_company_id=company_123",
      },
    });

    useOrderDetails("order_row_1", true);

    expect(useQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
        queryKey: ["orders", "company_123", "detail", "order_row_1"],
      }),
    );

    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: originalDocument,
    });
  });

  it("keys order list queries by selected company", () => {
    const originalDocument = globalThis.document;
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        cookie: "lucreii_selected_company_id=company_123",
      },
    });

    useOrdersList({
      includeSummary: false,
      page: 2,
      pageSize: 20,
      provider: "shopee",
      search: "SHP-1001",
      sortBy: "totalWithFees",
      sortDirection: "asc",
      status: "paid",
    });

    expect(useQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: [
          "orders",
          "company_123",
          2,
          20,
          "SHP-1001",
          "shopee",
          "paid",
          "totalWithFees",
          "asc",
          false,
          "",
          "",
        ],
      }),
    );

    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: originalDocument,
    });
  });

  it("keys order list queries by selected company and ordered date range", () => {
    const originalDocument = globalThis.document;
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        cookie: "lucreii_selected_company_id=company_123",
      },
    });

    useOrdersList({
      orderedFrom: "2026-06-01",
      orderedTo: "2026-06-30",
      page: 1,
      pageSize: 20,
    });

    expect(useQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: [
          "orders",
          "company_123",
          1,
          20,
          "",
          "",
          "",
          "",
          "",
          true,
          "2026-06-01",
          "2026-06-30",
        ],
      }),
    );

    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: originalDocument,
    });
  });
});
