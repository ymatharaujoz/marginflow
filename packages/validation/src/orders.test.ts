import { describe, expect, it } from "vitest";
import {
  orderDetailsApiResponseSchema,
  ordersListApiResponseSchema,
} from "./orders";

describe("orders validation schemas", () => {
  it("accepts paginated orders list responses", () => {
    const result = ordersListApiResponseSchema.parse({
      data: {
        items: [
          {
            createdAt: "2026-06-20T12:00:00.000Z",
            currency: "BRL",
            fixedCostAmount: "0.00",
            id: "order_row_1",
            itemsSold: 3,
            orderDate: "2026-06-20",
            orderId: "MLB-1001",
            orderedAt: "2026-06-20T10:15:00.000Z",
            provider: "mercadolivre",
            shippingAmount: "20.00",
            tariffAmount: "10.00",
            status: "paid",
            statusLabel: "Pagamento aprovado",
            totalFees: "30.00",
            totalWithFees: "200.00",
            totalWithoutFees: "170.00",
          },
        ],
        page: "1",
        pageSize: "20",
        totalItems: "1",
        totalPages: "1",
      },
      error: null,
    });

    expect(result.data.items[0]?.orderId).toBe("MLB-1001");
  });

  it("accepts order detail responses with line items", () => {
    const result = orderDetailsApiResponseSchema.parse({
      data: {
        items: [
          {
            id: "item_1",
            imageUrl: "https://cdn.example.com/product-1-cover.jpg",
            linkedProductId: "product_1",
            productName: "Produto 1",
            quantity: 2,
            sku: "SKU-1",
            totalPrice: "120.00",
            unitPrice: "60.00",
          },
        ],
        order: {
          createdAt: "2026-06-20T12:00:00.000Z",
          currency: "BRL",
          fixedCostAmount: "0.00",
          id: "order_row_1",
          itemsSold: 2,
          orderDate: "2026-06-20",
          orderId: "SHP-1001",
          orderedAt: "2026-06-20T10:15:00.000Z",
          provider: "shopee",
          shippingAmount: "20.00",
          tariffAmount: "0.00",
          status: "completed",
          statusLabel: "Entregue",
          totalFees: "20.00",
          totalWithFees: "200.00",
          totalWithoutFees: "180.00",
        },
      },
      error: null,
    });

    expect(result.data.items[0]?.sku).toBe("SKU-1");
  });
});
