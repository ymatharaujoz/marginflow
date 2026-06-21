import { describe, expect, it, vi } from "vitest";
import { OrdersService } from "./orders.service";

describe("OrdersService", () => {
  it("lists only orders from selected company and derives table totals", async () => {
    const db = {
      query: {
        externalOrders: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "order_row_1",
              companyId: "company_123",
              createdAt: new Date("2026-06-20T12:00:00.000Z"),
              currency: "BRL",
              externalOrderId: "MLB-1001",
              metadata: {},
              orderedAt: new Date("2026-06-20T10:15:00.000Z"),
              organizationId: "org_123",
              provider: "mercadolivre",
              status: "paid",
              syncRunId: null,
              updatedAt: new Date("2026-06-20T12:00:00.000Z"),
              totalAmount: "200.00",
              items: [
                {
                  id: "item_1",
                  quantity: 2,
                  totalPrice: "120.00",
                  unitPrice: "60.00",
                  externalProduct: {
                    id: "ext_prod_1",
                    linkedProductId: "product_1",
                    sku: "SKU-1",
                    title: "Produto 1",
                  },
                },
                {
                  id: "item_2",
                  quantity: 1,
                  totalPrice: "80.00",
                  unitPrice: "80.00",
                  externalProduct: {
                    id: "ext_prod_2",
                    linkedProductId: null,
                    sku: "SKU-2",
                    title: "Produto 2",
                  },
                },
              ],
              fees: [
                {
                  amount: "20.00",
                  feeType: "shipping_cost",
                  id: "fee_ship",
                  metadata: {},
                },
                {
                  amount: "3.00",
                  feeType: "fixed_fee",
                  id: "fee_fixed",
                  metadata: {},
                },
                {
                  amount: "10.00",
                  feeType: "marketplace_commission",
                  id: "fee_commission",
                  metadata: {},
                },
              ],
            },
          ]),
        },
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            fixedCostDefault: "1500.00",
            id: "company_123",
          }),
        },
      },
    };

    const service = new OrdersService(db as never);

    await expect(
      service.listOrders(
        {
          organizationId: "org_123",
          selectedCompanyId: "company_123",
          userId: "user_123",
        },
        {
          page: 1,
          pageSize: 10,
          provider: undefined,
          search: undefined,
          status: undefined,
        },
      ),
    ).resolves.toEqual({
        items: [
          expect.objectContaining({
            fixedCostAmount: "3.00",
            itemsSold: 3,
            orderId: "MLB-1001",
            shippingAmount: "20.00",
            tariffAmount: "10.00",
            statusLabel: "Pagamento aprovado",
            totalFees: "33.00",
            totalWithFees: "200.00",
            totalWithoutFees: "167.00",
          }),
        ],
      page: 1,
      pageSize: 10,
      totalItems: 1,
      totalPages: 1,
    });
  });

  it("returns order detail with products table rows", async () => {
    const db = {
      query: {
        externalOrders: {
          findFirst: vi.fn().mockResolvedValue({
            id: "order_row_1",
            companyId: "company_123",
            createdAt: new Date("2026-06-20T12:00:00.000Z"),
            currency: "BRL",
            externalOrderId: "SHP-1001",
            metadata: {},
            orderedAt: new Date("2026-06-20T10:15:00.000Z"),
            organizationId: "org_123",
            provider: "shopee",
            status: "completed",
            syncRunId: null,
            updatedAt: new Date("2026-06-20T12:00:00.000Z"),
            totalAmount: "200.00",
            items: [
              {
                id: "item_1",
                quantity: 2,
                totalPrice: "120.00",
                unitPrice: "60.00",
              externalProduct: {
                id: "ext_prod_1",
                linkedProductId: "product_1",
                linkedProduct: {
                  images: [
                    {
                      position: 1,
                      url: "https://cdn.example.com/product-1-secondary.jpg",
                    },
                    {
                      position: 0,
                      url: "https://cdn.example.com/product-1-cover.jpg",
                    },
                  ],
                },
                sku: "SKU-1",
                title: "Produto 1",
              },
              },
            ],
            fees: [
              {
                amount: "20.00",
                feeType: "shipping_cost",
                id: "fee_ship",
                metadata: {},
              },
            ],
          }),
        },
      },
    };

    const service = new OrdersService(db as never);

    await expect(
      service.getOrderDetails(
        {
          organizationId: "org_123",
          selectedCompanyId: "company_123",
          userId: "user_123",
        },
        "order_row_1",
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            imageUrl: "https://cdn.example.com/product-1-cover.jpg",
            productName: "Produto 1",
            quantity: 2,
            sku: "SKU-1",
            totalPrice: "120.00",
            unitPrice: "60.00",
          }),
        ],
        order: expect.objectContaining({
          tariffAmount: "0.00",
          orderId: "SHP-1001",
          provider: "shopee",
          statusLabel: "Entregue",
        }),
      }),
    );
  });
});
