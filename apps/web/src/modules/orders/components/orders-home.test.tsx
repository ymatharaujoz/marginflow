/** @vitest-environment jsdom */

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OrdersHome } from "./orders-home";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const useOrdersListMock = vi.hoisted(() => vi.fn());
const useOrderDetailsMock = vi.hoisted(() => vi.fn());
const downloadOrdersExportMock = vi.hoisted(() => vi.fn());

vi.mock("../hooks/use-orders-data", () => ({
  downloadOrdersExport: downloadOrdersExportMock,
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

function changeInputValue(element: HTMLInputElement, value: string) {
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  );
  descriptor?.set?.call(element, value);
  act(() => {
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
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
            contributionMarginPercent: "46.00",
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
            skus: ["SKU-1", "SKU-2"],
            shippingAmount: "20.00",
            sourceStatus: "paid",
            status: "paid",
            statusLabel: "Pagamento aprovado",
            tariffAmount: "10.00",
            totalFees: "33.00",
            totalProfitAmount: "92.00",
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
          refundBonusAmount: "0.00",
          revenueAmount: "200.00",
          shippingOrFixedFeeAmount: "23.00",
          taxAmount: "24.00",
          taxRateDefault: "0.120000",
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
          contributionMarginPercent: "46.00",
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
          skus: ["SKU-1", "SKU-2"],
          shippingAmount: "20.00",
          sourceStatus: "paid",
          status: "paid",
          statusLabel: "Pagamento aprovado",
          tariffAmount: "10.00",
          totalFees: "33.00",
          totalProfitAmount: "92.00",
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

  beforeEach(() => {
    downloadOrdersExportMock.mockReset();
    downloadOrdersExportMock.mockResolvedValue(undefined);
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
    click(Array.from(document.querySelectorAll("button")).find((button) => button.textContent?.includes("Compos"))!);

    const content = text();

    expect(content).not.toContain("Composição do pedido");
    expect(content).not.toContain("Totais agregados do pedido");
    expect(content).toContain("R$ 200,00");
    expect(content).toContain("R$ 24,00");
    expect(content).toContain("Imposto");
    expect(content).toContain("12,00%");
    expect(content).toContain("Frete / Taxa Fixa");
    expect(content).toContain("Estornos / Bônus");
    expect(content).not.toContain("Receita Líquida");
    expect(content).not.toContain("Dados parciais");

    const impostoCardOrder = content.indexOf("Embalagem");
    const impostoValueOrder = content.indexOf("Imposto");
    expect(impostoCardOrder).toBeGreaterThan(-1);
    expect(impostoValueOrder).toBeGreaterThan(impostoCardOrder);

    view.unmount();
  });

  it("shows refund bonus card in composition tab when present", () => {
    useOrderDetailsMock.mockReturnValue({
      data: {
        composition: {
          hasIncompleteCostData: true,
          marketplaceCommissionAmount: "10.00",
          missingCostItemsCount: 1,
          missingLinkedItemsCount: 1,
          netRevenueAmount: "170.54",
          packagingCostAmount: "8.00",
          productCostAmount: "43.00",
          refundBonusAmount: "3.54",
          revenueAmount: "200.00",
          shippingOrFixedFeeAmount: "23.00",
          taxAmount: "24.00",
          taxRateDefault: "0.120000",
        },
        items: [
          {
            channel: "mercadolivre",
            contributionMarginPercent: "17.50",
            displayName: "Cor: Azul | Produto Pai",
            id: "item_1",
            imageUrl: "https://cdn.example.com/product-1-cover.jpg",
            linkedProductId: "product_1",
            netRevenueAmount: "111.54",
            orderedAt: "2026-06-20T10:15:00.000Z",
            productName: "Cor: Azul",
            quantity: 2,
            sku: "SKU-1",
            totalProfitAmount: "24.54",
            totalPrice: "120.00",
            unitPrice: "60.00",
          },
        ],
        order: {
          contributionMarginPercent: "47.77",
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
          totalProfitAmount: "95.54",
          totalWithFees: "200.00",
          totalWithoutFees: "167.00",
        },
      },
      error: null,
      isLoading: false,
    });

    const view = mount(<OrdersHome />);

    click(document.querySelector('tr[role="button"]')!);
    click(Array.from(document.querySelectorAll("button")).find((button) => button.textContent?.includes("Compos"))!);

    const content = text();
    expect(content).toContain("R$ 3,54");

    view.unmount();
  });

  it("renders product/unit price/quantity item columns and hides source status in modal header", () => {
    const view = mount(<OrdersHome />);

    click(document.querySelector('tr[role="button"]')!);

    const modalTable = document.querySelectorAll("table")[1];
    const modalContent = (modalTable?.textContent ?? "").replace(/\u00a0/g, " ");

    expect(modalContent).toContain("Produto");
    expect(modalContent).toContain("Preço de Venda");
    expect(modalContent).toContain("Quantidade");
    expect(modalContent).toContain("Cor: Azul | Produto Pai");
    expect(modalContent).not.toContain("Data do Pedido");
    expect(modalContent).not.toContain("Canal");
    expect(modalContent).not.toContain("Faturamento");
    expect(modalContent).not.toContain("Margem de Contribuição");
    expect(modalContent).not.toContain("Lucro Total");
    expect(text()).not.toContain("status origem");

    view.unmount();
  });

  it("renders compact item table without oversized min width", () => {
    const view = mount(<OrdersHome />);

    click(document.querySelector('tr[role="button"]')!);

    expect(document.querySelector("table.min-w-\\[1040px\\]")).toBeNull();

    view.unmount();
  });

  it("renders order-level financial columns in main table", () => {
    const view = mount(<OrdersHome />);

    const mainTable = document.querySelectorAll("table")[0];
    const mainContent = (mainTable?.textContent ?? "").replace(/\u00a0/g, " ");

    expect(mainContent).toContain("Faturamento");
    expect(mainContent).toContain("Margem de Contribuição");
    expect(mainContent).toContain("Lucro Total");
    expect(mainContent).toContain("R$ 200,00");
    expect(mainContent).toContain("46,00%");
    expect(mainContent).toContain("R$ 92,00");
    expect(mainContent).not.toContain("Receita Liquida");

    view.unmount();
  });

  it("renders displayed order id when available", () => {
    const view = mount(<OrdersHome />);

    expect(text()).toContain("MLB-SALE-9001");
    expect(text()).toContain("SKU-1");
    expect(text()).toContain("SKU-2");
    expect(text()).not.toContain("MLB-1001Pagamento aprovado");

    view.unmount();
  });

  it("renders negative margin and profit values in red", () => {
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
        ],
        items: [
          {
            contributionMarginPercent: "-10.50",
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
            totalProfitAmount: "-3.14",
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

    const view = mount(<OrdersHome />);
    const negativeMargin = Array.from(document.querySelectorAll("td")).find((cell) =>
      cell.textContent?.includes("-10,50%"),
    );
    const negativeProfit = Array.from(document.querySelectorAll("td")).find((cell) =>
      cell.textContent?.includes("3,14"),
    );

    expect(negativeMargin?.className).toContain("text-red");
    expect(negativeProfit?.className).toContain("text-red");

    view.unmount();
  });

  it("renders composition tab as read-only cards with negated red values for costs", () => {
    const view = mount(<OrdersHome />);

    click(document.querySelector('tr[role="button"]')!);
    click(Array.from(document.querySelectorAll("button")).find((button) => button.textContent?.includes("Compos"))!);

    const inputs = Array.from(document.querySelectorAll("input"));
    const editableInputs = inputs.filter((input) =>
      input.getAttribute("aria-label")?.includes("Estornos") ||
      input.getAttribute("aria-label")?.includes("Custo") ||
      input.getAttribute("aria-label")?.includes("Comissão") ||
      input.getAttribute("aria-label")?.includes("Frete") ||
      input.getAttribute("aria-label")?.includes("Embalagem"),
    );

    expect(editableInputs).toHaveLength(0);

    const content = text();
    expect(content).toContain("Faturamento");
    expect(content).toContain("Estornos / Bônus");
    expect(content).toContain("Custo Produto");
    expect(content).toContain("Comissão");
    expect(content).toContain("Frete / Taxa Fixa");
    expect(content).toContain("Embalagem");
    expect(content).toContain("Imposto");

    const negativeValueDivs = Array.from(document.querySelectorAll("div.text-red-600.tabular-nums"));
    expect(negativeValueDivs.length).toBeGreaterThanOrEqual(5);
    negativeValueDivs.forEach((div) => {
      expect(div.textContent?.trim().startsWith("-")).toBe(true);
    });

    const allValueDivs = Array.from(document.querySelectorAll("div.tabular-nums"));
    const nonNegativeValueDivs = allValueDivs.filter(
      (div) => !div.className.includes("text-red-600"),
    );
    nonNegativeValueDivs.forEach((div) => {
      expect(div.textContent?.trim().startsWith("-")).toBe(false);
    });

    view.unmount();
  });

  it("requests server-side ordering and disables summary loading for table query", () => {
    const view = mount(<OrdersHome />);

    click(
      Array.from(document.querySelectorAll("th")).find((header) =>
        header.textContent?.includes("Faturamento"),
      )!,
    );

    expect(useOrdersListMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        includeSummary: false,
        sortBy: "totalWithFees",
        sortDirection: "asc",
      }),
    );

    view.unmount();
  });

  it("passes ordered date range filters to list query and clears them", () => {
    const view = mount(<OrdersHome />);

    click(Array.from(document.querySelectorAll("button")).find((button) => button.textContent?.includes("Filtros"))!);

    const dateInputs = Array.from(document.querySelectorAll('input[type="date"]')) as HTMLInputElement[];
    const [orderedFromInput, orderedToInput] = dateInputs;

    changeInputValue(orderedFromInput, "2026-06-01");
    changeInputValue(orderedToInput, "2026-06-30");

    expect(useOrdersListMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        orderedFrom: "2026-06-01",
        orderedTo: "2026-06-30",
      }),
    );

    click(Array.from(document.querySelectorAll("button")).find((button) => button.textContent?.includes("Limpar"))!);

    expect(useOrdersListMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        page: 1,
        pageSize: 20,
      }),
    );

    view.unmount();
  });

  it("changes to page 2 when pagination is used", () => {
    useOrdersListMock
      .mockReturnValueOnce({
        data: {
          ...useOrdersListMock.mock.results[0]?.value?.data,
          items: [
            {
              contributionMarginPercent: "46.00",
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
              skus: ["SKU-1"],
              shippingAmount: "20.00",
              sourceStatus: "paid",
              status: "paid",
              statusLabel: "Pagamento aprovado",
              tariffAmount: "10.00",
              totalFees: "33.00",
              totalProfitAmount: "92.00",
              totalWithFees: "200.00",
              totalWithoutFees: "167.00",
            },
          ],
          page: 1,
          pageSize: 20,
          totalItems: 21,
          totalPages: 2,
        },
        error: null,
        isLoading: false,
      })
      .mockReturnValue({
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
          ],
          items: [],
          page: 2,
          pageSize: 20,
          totalItems: 21,
          totalPages: 2,
        },
        error: null,
        isLoading: false,
      });

    const view = mount(<OrdersHome />);

    click(Array.from(document.querySelectorAll("button")).find((button) => button.textContent?.trim() === "2")!);

    expect(useOrdersListMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        page: 2,
      }),
    );

    view.unmount();
  });

  it("selects visible rows and exports selected orders without opening modal", async () => {
    useOrdersListMock.mockReturnValue({
      data: {
        summary: {
          averageMargin: "0.29",
          grossProfit: "57.00",
          grossRevenue: "200.00",
          ordersCount: 2,
          unitsSold: 3,
        },
        availableStatuses: [
          { label: "Pagamento aprovado", value: "paid" },
        ],
        items: [
          {
            contributionMarginPercent: "46.00",
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
            skus: ["SKU-1"],
            shippingAmount: "20.00",
            sourceStatus: "paid",
            status: "paid",
            statusLabel: "Pagamento aprovado",
            tariffAmount: "10.00",
            totalFees: "33.00",
            totalProfitAmount: "92.00",
            totalWithFees: "200.00",
            totalWithoutFees: "167.00",
          },
          {
            contributionMarginPercent: "12.00",
            createdAt: "2026-06-21T12:00:00.000Z",
            currency: "BRL",
            displayOrderId: "SHP-SALE-9002",
            fixedCostAmount: "1.00",
            id: "order_row_2",
            itemsSold: 1,
            orderDate: "2026-06-21",
            orderId: "SHP-1002",
            orderedAt: "2026-06-21T10:15:00.000Z",
            provider: "shopee",
            skus: ["SKU-9"],
            shippingAmount: "9.00",
            sourceStatus: "paid",
            status: "paid",
            statusLabel: "Pagamento aprovado",
            tariffAmount: "4.00",
            totalFees: "14.00",
            totalProfitAmount: "8.00",
            totalWithFees: "80.00",
            totalWithoutFees: "66.00",
          },
        ],
        page: 1,
        pageSize: 20,
        totalItems: 2,
        totalPages: 1,
      },
      error: null,
      isLoading: false,
    });

    const view = mount(<OrdersHome />);

    click(document.querySelector('input[aria-label="Selecionar pedidos visiveis"]')!);

    expect(text()).toContain("2selecionados");

    await act(async () => {
      click(Array.from(document.querySelectorAll("button")).find((button) =>
        button.textContent?.includes("Exportar selecionados"),
      )!);
      await Promise.resolve();
    });

    expect(downloadOrdersExportMock).toHaveBeenCalledWith({
      ids: ["order_row_1", "order_row_2"],
    });
    expect(useOrderDetailsMock).not.toHaveBeenCalledWith("order_row_1", true);

    view.unmount();
  });

  it("exports filtered orders", async () => {
    const view = mount(<OrdersHome />);

    await act(async () => {
      click(Array.from(document.querySelectorAll("button")).find((button) =>
        button.textContent?.includes("Exportar"),
      )!);
      await Promise.resolve();
    });

    expect(downloadOrdersExportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        includeSummary: false,
        page: 1,
        pageSize: 20,
      }),
    );

    view.unmount();
  });
});
