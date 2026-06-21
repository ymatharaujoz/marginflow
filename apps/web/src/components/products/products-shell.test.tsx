/** @vitest-environment jsdom */

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProductsShell } from "./products-shell";
import { useProductsActions } from "./products-actions-context";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const reactQueryMocks = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  mutateCalls: [] as Array<() => void>,
  useMutation: vi.fn((options?: { onSuccess?: (value: unknown) => void }) => {
    const mutate = vi.fn(() => {
      reactQueryMocks.mutateCalls.push(mutate);
      options?.onSuccess?.({
        data: [
          {
            connectAvailable: true,
            connectedAccountId: "seller-1",
            connectedAccountLabel: "SELLER1",
            disconnectAvailable: true,
            displayName: "Mercado Livre",
            lastSyncedAt: null,
            provider: "mercadolivre",
            status: "connected",
            statusMessage: "Conta conectada",
            tokenExpiresAt: null,
          },
          {
            connectAvailable: true,
            connectedAccountId: "shop-1",
            connectedAccountLabel: "SHOP1",
            disconnectAvailable: true,
            displayName: "Shopee",
            lastSyncedAt: null,
            provider: "shopee",
            status: "connected",
            statusMessage: "Conta conectada",
            tokenExpiresAt: null,
          },
        ],
      });
    });

    return {
      isPending: false,
      mutate,
    };
  }),
  useQuery: vi.fn(() => ({
    data: [],
    error: null,
    isFetching: false,
    isLoading: false,
  })),
}));

vi.mock("@tanstack/react-query", () => ({
  useMutation: reactQueryMocks.useMutation,
  useQuery: reactQueryMocks.useQuery,
  useQueryClient: () => ({
    invalidateQueries: reactQueryMocks.invalidateQueries,
  }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/app/products/catalog",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/lib/api/client", () => ({
  ApiClientError: class ApiClientError extends Error {},
  apiClient: {
    delete: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
  },
}));

function ImportTrigger() {
  const { handleImportProducts } = useProductsActions();
  return <button onClick={handleImportProducts}>Abrir importacao</button>;
}

function mount(node: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(node);
  });

  return {
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

describe("ProductsShell import sources modal", () => {
  beforeEach(() => {
    reactQueryMocks.invalidateQueries.mockReset();
    reactQueryMocks.useMutation.mockClear();
    reactQueryMocks.useQuery.mockClear();
    reactQueryMocks.mutateCalls = [];
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("shows Mercado Livre, Shopee, and Shein as marketplace import sources", () => {
    const view = mount(
      <ProductsShell organizationName="Lucreii">
        <ImportTrigger />
      </ProductsShell>,
    );

    const trigger = document.querySelector("button");
    expect(trigger).not.toBeNull();
    click(trigger!);

    expect(document.body.textContent).toContain("Mercado Livre");
    expect(document.body.textContent).toContain("Shopee");
    expect(document.body.textContent).toContain("Shein");
    expect(document.body.textContent).toContain("Importar produtos");

    view.unmount();
  });
});
