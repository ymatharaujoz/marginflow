import { beforeEach, describe, expect, it, vi } from "vitest";

const apiClientMock = vi.hoisted(() => ({
  getValidatedData: vi.fn(),
}));
const useQueryMock = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-query", () => ({
  useQuery: useQueryMock,
}));
vi.mock("@/lib/api/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/client")>("@/lib/api/client");

  return {
    ...actual,
    apiClient: apiClientMock,
  };
});

import {
  fetchOrderDetails,
  fetchOrders,
  useOrderDetails,
  useOrdersList,
} from "./use-orders-data";

describe("orders protected fetchers", () => {
  beforeEach(() => {
    apiClientMock.getValidatedData.mockReset();
    useQueryMock.mockReset();
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
      page: 1,
      pageSize: 20,
      provider: "mercadolivre",
      search: "MLB-1001",
      status: "paid",
    });

    expect(apiClientMock.getValidatedData).toHaveBeenCalledWith(
      "/orders?page=1&pageSize=20&search=MLB-1001&provider=mercadolivre&status=paid",
      expect.any(Object),
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
      page: 2,
      pageSize: 20,
      provider: "shopee",
      search: "SHP-1001",
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
        ],
      }),
    );

    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: originalDocument,
    });
  });
});
