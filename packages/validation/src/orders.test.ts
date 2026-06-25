import { describe, expect, it } from "vitest";
import {
  orderDetailsApiResponseSchema,
  ordersListApiResponseSchema,
} from "./orders";

describe("orders validation schemas", () => {
  it("accepts paginated orders list responses", () => {
    const result = ordersListApiResponseSchema.parse({
      data: {
        summary: {
          averageMargin: "0.25",
          grossProfit: "50.00",
          grossRevenue: "200.00",
          ordersCount: 1,
          unitsSold: 3,
        },
        availableStatuses: [
          { label: "Pagamento aprovado", value: "paid" },
          { label: "Cancelado", value: "cancelled" },
        ],
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
            sourceStatus: "paid",
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
    expect(result.data.summary.grossProfit).toBe("50.00");
  });

  it("accepts order detail responses with line items", () => {
    const result = orderDetailsApiResponseSchema.parse({
      data: {
        composition: {
          hasIncompleteCostData: true,
          marketplaceCommissionAmount: "12.00",
          missingCostItemsCount: 1,
          missingLinkedItemsCount: 1,
          netRevenueAmount: "165.00",
          packagingCostAmount: "8.00",
          productCostAmount: "60.00",
          revenueAmount: "200.00",
          shippingOrFixedFeeAmount: "23.00",
        },
        items: [
          {
            channel: "shopee",
            contributionMarginPercent: "17.50",
            displayName: "Produto Pai | Cor: Azul",
            id: "item_1",
            imageUrl: "https://cdn.example.com/product-1-cover.jpg",
            linkedProductId: "product_1",
            netRevenueAmount: "108.00",
            orderedAt: "2026-06-20T10:15:00.000Z",
            productName: "Produto 1",
            quantity: 2,
            sku: "SKU-1",
            totalProfitAmount: "21.00",
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
          sourceStatus: "completed",
          shippingAmount: "20.00",
          tariffAmount: "0.00",
          status: "paid",
          statusLabel: "Pagamento aprovado",
          totalFees: "20.00",
          totalWithFees: "200.00",
          totalWithoutFees: "180.00",
        },
      },
      error: null,
    });

    expect(result.data.items[0]?.sku).toBe("SKU-1");
    expect(result.data.composition.shippingOrFixedFeeAmount).toBe("23.00");
    expect(result.data.items[0]?.displayName).toBe("Produto Pai | Cor: Azul");
    expect(result.data.composition.netRevenueAmount).toBe("165.00");
  });

  it("accepts negative contribution margin percentages in order details", () => {
    const result = orderDetailsApiResponseSchema.parse({
      data: {
        composition: {
          hasIncompleteCostData: false,
          marketplaceCommissionAmount: "3.89",
          missingCostItemsCount: 0,
          missingLinkedItemsCount: 0,
          netRevenueAmount: "19.36",
          packagingCostAmount: "2.50",
          productCostAmount: "20.00",
          revenueAmount: "29.90",
          shippingOrFixedFeeAmount: "6.65",
        },
        items: [
          {
            channel: "mercadolivre",
            contributionMarginPercent: "-10.50",
            displayName: "Cor: Transparente | Acessório De Unha - Não Ofertar",
            id: "item_1",
            imageUrl: "https://cdn.example.com/product-1-cover.jpg",
            linkedProductId: "product_1",
            netRevenueAmount: "19.36",
            orderedAt: "2026-06-20T10:15:00.000Z",
            productName: "Acessório De Unha - Não Ofertar",
            quantity: 1,
            sku: "ACESSORIO-TRANSPARENTE",
            totalPrice: "29.90",
            totalProfitAmount: "-3.14",
            unitPrice: "29.90",
          },
        ],
        order: {
          createdAt: "2026-06-20T12:00:00.000Z",
          currency: "BRL",
          fixedCostAmount: "6.65",
          id: "order_row_1",
          itemsSold: 1,
          orderDate: "2026-06-20",
          orderId: "MLB-1001",
          orderedAt: "2026-06-20T10:15:00.000Z",
          provider: "mercadolivre",
          sourceStatus: "paid",
          shippingAmount: "0.00",
          tariffAmount: "3.89",
          status: "paid",
          statusLabel: "Pagamento aprovado",
          totalFees: "10.54",
          totalWithFees: "29.90",
          totalWithoutFees: "19.36",
        },
      },
      error: null,
    });

    expect(result.data.items[0]?.contributionMarginPercent).toBe("-10.50");
  });
});
