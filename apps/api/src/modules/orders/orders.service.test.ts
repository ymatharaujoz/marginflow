import { describe, expect, it, vi } from "vitest";
import { OrdersService } from "./orders.service";

describe("OrdersService", () => {
  it("lists only orders from selected company and derives table totals", async () => {
    const db = {
      query: {
        products: {
          findMany: vi.fn().mockResolvedValue([
            {
              financeDefaults: {
                packagingCost: "4.00",
              },
              id: "product_1",
              images: [],
              name: "Produto 1",
              productCosts: [
                {
                  amount: "21.50",
                  createdAt: new Date("2026-06-01T00:00:00.000Z"),
                  effectiveFrom: new Date("2026-06-01T00:00:00.000Z"),
                },
              ],
            },
          ]),
        },
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
            id: "company_123",
            taxRateDefault: "0.120000",
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
      summary: {
        averageMargin: "0.58",
        grossProfit: "116.00",
        grossRevenue: "200.00",
        ordersCount: 1,
        unitsSold: 3,
      },
      availableStatuses: expect.arrayContaining([
        { label: "Pagamento pendente", value: "confirmed" },
        { label: "Pagamento aprovado", value: "paid" },
        { label: "Cancelado", value: "cancelled" },
      ]),
        items: [
          expect.objectContaining({
            fixedCostAmount: "3.00",
            itemsSold: 3,
            orderId: "MLB-1001",
            shippingAmount: "20.00",
            sourceStatus: "paid",
            tariffAmount: "10.00",
            status: "paid",
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
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.120000",
          }),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "product_1",
              name: "Produto Pai",
              financeDefaults: {
                packagingCost: "4.00",
              },
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
              productCosts: [
                {
                  amount: "21.50",
                  createdAt: new Date("2026-06-01T00:00:00.000Z"),
                  effectiveFrom: new Date("2026-06-01T00:00:00.000Z"),
                },
              ],
            },
          ]),
        },
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
                  externalProductId: "MLB123:VAR1",
                  linkedProduct: {
                    id: "product_1",
                    name: "Produto Pai",
                  },
                  metadata: {
                    itemId: "MLB123",
                    variationId: "VAR1",
                },
                provider: "mercadolivre",
                sku: "SKU-1",
                title: "Cor: Azul",
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
                  externalProductId: "EXT-2",
                  linkedProduct: null,
                  metadata: {},
                  provider: "shopee",
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
        composition: {
          hasIncompleteCostData: true,
          marketplaceCommissionAmount: "0.00",
          missingCostItemsCount: 1,
          missingLinkedItemsCount: 1,
          netRevenueAmount: "177.00",
          packagingCostAmount: "8.00",
          productCostAmount: "43.00",
          revenueAmount: "200.00",
          shippingOrFixedFeeAmount: "23.00",
        },
        items: expect.arrayContaining([
          expect.objectContaining({
            channel: "shopee",
            contributionMarginPercent: "46.00",
            displayName: "Cor: Azul | Produto Pai",
            imageUrl: "https://cdn.example.com/product-1-cover.jpg",
            netRevenueAmount: "106.20",
            orderedAt: "2026-06-20T10:15:00.000Z",
            productName: "Cor: Azul",
            quantity: 2,
            sku: "SKU-1",
            totalProfitAmount: "55.20",
            totalPrice: "120.00",
            unitPrice: "60.00",
          }),
          expect.objectContaining({
            channel: "shopee",
            contributionMarginPercent: null,
            netRevenueAmount: "70.80",
            totalProfitAmount: null,
          }),
        ]),
        order: expect.objectContaining({
          sourceStatus: "completed",
          tariffAmount: "0.00",
          orderId: "SHP-1001",
          provider: "shopee",
          status: "paid",
          statusLabel: "Pagamento aprovado",
        }),
      }),
    );
  });

  it("rates fees proportionally across multiple items in order details", async () => {
    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.120000",
          }),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "product_1",
              financeDefaults: {
                packagingCost: "5.00",
              },
              images: [],
              name: "Produto A",
              productCosts: [
                {
                  amount: "50.00",
                  createdAt: new Date("2026-06-01T00:00:00.000Z"),
                  effectiveFrom: new Date("2026-06-01T00:00:00.000Z"),
                },
              ],
            },
            {
              id: "product_2",
              financeDefaults: {
                packagingCost: "1.00",
              },
              images: [],
              name: "Produto B",
              productCosts: [
                {
                  amount: "10.00",
                  createdAt: new Date("2026-06-01T00:00:00.000Z"),
                  effectiveFrom: new Date("2026-06-01T00:00:00.000Z"),
                },
              ],
            },
          ]),
        },
        externalOrders: {
          findFirst: vi.fn().mockResolvedValue({
            id: "order_row_2",
            companyId: "company_123",
            createdAt: new Date("2026-06-20T12:00:00.000Z"),
            currency: "BRL",
            externalOrderId: "MLB-2001",
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
                quantity: 1,
                totalPrice: "150.00",
                unitPrice: "150.00",
                externalProduct: {
                  id: "ext_prod_1",
                  linkedProductId: "product_1",
                  externalProductId: "MLB-A",
                  linkedProduct: {
                    id: "product_1",
                    name: "Produto A",
                  },
                  metadata: {},
                  provider: "mercadolivre",
                  sku: "SKU-A",
                  title: "Produto A",
                },
              },
              {
                id: "item_2",
                quantity: 1,
                totalPrice: "50.00",
                unitPrice: "50.00",
                externalProduct: {
                  id: "ext_prod_2",
                  linkedProductId: "product_2",
                  externalProductId: "MLB-B",
                  linkedProduct: {
                    id: "product_2",
                    name: "Produto B",
                  },
                  metadata: {},
                  provider: "mercadolivre",
                  sku: "SKU-B",
                  title: "Produto B",
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
                amount: "10.00",
                feeType: "fixed_fee",
                id: "fee_fixed",
                metadata: {},
              },
              {
                amount: "40.00",
                feeType: "marketplace_commission",
                id: "fee_commission",
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
        "order_row_2",
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            contributionMarginPercent: "28.33",
            netRevenueAmount: "97.50",
            totalProfitAmount: "42.50",
          }),
          expect.objectContaining({
            contributionMarginPercent: "43.00",
            netRevenueAmount: "32.50",
            totalProfitAmount: "21.50",
          }),
        ],
      }),
    );
  });

  it("formats negative contribution margin percent as valid decimal string", async () => {
    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.120000",
          }),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "product_1",
              financeDefaults: {
                packagingCost: "2.50",
              },
              images: [],
              name: "Cor: Transparente",
              productCosts: [
                {
                  amount: "20.00",
                  createdAt: new Date("2026-06-01T00:00:00.000Z"),
                  effectiveFrom: new Date("2026-06-01T00:00:00.000Z"),
                },
              ],
            },
          ]),
        },
        externalOrders: {
          findFirst: vi.fn().mockResolvedValue({
            id: "order_row_neg",
            companyId: "company_123",
            createdAt: new Date("2026-06-24T04:00:31.954Z"),
            currency: "BRL",
            externalOrderId: "2000017026965252",
            metadata: {},
            orderedAt: new Date("2026-06-20T02:55:39.000Z"),
            organizationId: "org_123",
            provider: "mercadolivre",
            status: "paid",
            syncRunId: null,
            updatedAt: new Date("2026-06-24T04:00:31.954Z"),
            totalAmount: "29.90",
            items: [
              {
                id: "item_neg",
                quantity: 1,
                totalPrice: "29.90",
                unitPrice: "29.90",
                externalProduct: {
                  externalProductId: "MLBNEG:VAR1",
                  id: "ext_prod_neg",
                  linkedProductId: "product_1",
                  linkedProduct: {
                    id: "product_1",
                    name: "Cor: Transparente",
                  },
                  metadata: {
                    itemId: "MLBNEG",
                    variationId: "VAR1",
                  },
                  provider: "mercadolivre",
                  sku: "ACESSORIO-TRANSPARENTE",
                  title: "Acessório De Unha - Não Ofertar",
                },
              },
            ],
            fees: [
              {
                amount: "3.89",
                feeType: "marketplace_commission",
                id: "fee_commission",
                metadata: {},
              },
              {
                amount: "6.65",
                feeType: "fixed_fee",
                id: "fee_fixed",
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
        "order_row_neg",
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            displayName: "Acessório De Unha - Não Ofertar | Cor: Transparente",
            contributionMarginPercent: "-10.50",
            netRevenueAmount: "19.36",
            totalProfitAmount: "-3.14",
          }),
        ],
      }),
    );
  });

  it("maps MELI statuses canonically and preserves raw status", async () => {
    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.100000",
          }),
        },
        externalOrders: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "order_row_1",
              companyId: "company_123",
              createdAt: new Date("2026-06-20T12:00:00.000Z"),
              currency: "BRL",
              externalOrderId: "MLB-1002",
              metadata: {},
              orderedAt: new Date("2026-06-20T10:15:00.000Z"),
              organizationId: "org_123",
              provider: "mercadolivre",
              status: "payment_in_process",
              syncRunId: null,
              updatedAt: new Date("2026-06-20T12:00:00.000Z"),
              totalAmount: "200.00",
              items: [],
              fees: [],
            },
          ]),
        },
      },
    };

    const service = new OrdersService(db as never);
    const result = await service.listOrders(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      {},
    );

    expect(result.items[0]).toEqual(
      expect.objectContaining({
        sourceStatus: "payment_in_process",
        status: "payment_in_process",
        statusLabel: "Pagamento em processamento",
      }),
    );
  });
});
