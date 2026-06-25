/** @vitest-environment jsdom */

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OrdersHome } from "./orders-home";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const useOrdersListMock = vi.hoisted(() => vi.fn());
const useOrderDetailsMock = vi.hoisted(() => vi.fn());

vi.mock("../hooks/use-orders-data", () => ({
  useOrderDetails: useOrderDetailsMock,
  useOrdersList: useOrdersListMock,
}));

function mount(node: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(node);
  });

  return {
    container,
    unmount() {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

function click(element: Element) {
  act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function text() {
  return document.body.textContent?.replace(/\u00a0/g, " ") ?? "";
}

describe("OrdersHome", () => {
  beforeEach(() => {
    useOrdersListMock.mockReturnValue({
      data: {
        summary: {
          averageMargin: "0.29",
          grossProfit: "57.00",
          grossRevenue: "200.00",
          ordersCount: 1,
          unitsSold: 2,
        },
        availableStatuses: [
          { label: "Pagamento aprovado", value: "paid" },
          { label: "Cancelado", value: "cancelled" },
        ],
        items: [
          {
            createdAt: "2026-06-20T12:00:00.000Z",
            currency: "BRL",
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
            totalWithFees: "200.00",
            totalWithoutFees: "167.00",
          },
        ],
        page: 1,
        pageSize: 20,
        totalItems: 1,
        totalPages: 1,
      },
      error: null,
      isLoading: false,
    });

    useOrderDetailsMock.mockReturnValue({
      data: {
        composition: {
          hasIncompleteCostData: true,
          marketplaceCommissionAmount: "10.00",
          missingCostItemsCount: 1,
          missingLinkedItemsCount: 1,
          netRevenueAmount: "167.00",
          packagingCostAmount: "8.00",
          productCostAmount: "43.00",
          revenueAmount: "200.00",
          shippingOrFixedFeeAmount: "23.00",
        },
        items: [
          {
            channel: "mercadolivre",
            contributionMarginPercent: "17.50",
            displayName: "Cor: Azul | Produto Pai",
            id: "item_1",
            imageUrl: "https://cdn.example.com/product-1-cover.jpg",
            linkedProductId: "product_1",
            netRevenueAmount: "108.00",
            orderedAt: "2026-06-20T10:15:00.000Z",
            productName: "Cor: Azul",
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
          totalWithFees: "200.00",
          totalWithoutFees: "167.00",
        },
      },
      error: null,
      isLoading: false,
    });
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("renders status dropdown options from API", () => {
    const view = mount(<OrdersHome />);

    click(Array.from(document.querySelectorAll("button")).find((button) => button.textContent?.includes("Filtros"))!);
    click(Array.from(document.querySelectorAll("button")).find((button) => button.textContent?.includes("Status"))!);

    expect(text()).toContain("Pagamento aprovado");
    expect(text()).toContain("Cancelado");

    view.unmount();
  });

  it("shows composition tab with aggregated order totals", () => {
    const view = mount(<OrdersHome />);

    click(document.querySelector('tr[role="button"]')!);
    click(Array.from(document.querySelectorAll("button")).find((button) => button.textContent?.trim() === "Composição")!);

    const content = text();

    expect(content).toContain("Composição do pedido");
    expect(content).toContain("R$ 200,00");
    expect(content).toContain("R$ 167,00");
    expect(content).toContain("R$ 43,00");
    expect(content).toContain("R$ 23,00");
    expect(content).toContain("Receita Líquida");
    expect(content).toContain("Frete / Taxa Fixa");
    expect(content).not.toContain("Imposto");
    expect(content).toContain("Dados parciais");

    view.unmount();
  });

  it("renders analytics item columns and hides source status in modal header", () => {
    const view = mount(<OrdersHome />);

    click(document.querySelector('tr[role="button"]')!);

    const content = text();

    expect(content).toContain("Canal");
    expect(content).toContain("Produto");
    expect(content).toContain("Data do Pedido");
    expect(content).toContain("Faturamento");
    expect(content).toContain("Margem de Contribuição %");
    expect(content).toContain("Lucro Total");
    expect(content).toContain("Cor: Azul | Produto Pai");
    expect(content).toContain("R$ 120,00");
    expect(content).toContain("17,50%");
    expect(content).toContain("R$ 21,00");
    expect(content).not.toContain("status origem");
    expect(content).not.toContain("PreÃ§o unitÃ¡rio");
    expect(content).not.toContain("Quantidade");

    view.unmount();
  });

  it("renders compact item table without oversized min width", () => {
    const view = mount(<OrdersHome />);

    click(document.querySelector('tr[role="button"]')!);

    expect(document.querySelector("table.min-w-\\[1040px\\]")).toBeNull();

    view.unmount();
  });
});
