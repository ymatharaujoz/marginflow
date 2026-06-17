/** @vitest-environment jsdom */

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { ProductHeader } from "./product-header";
import type { CatalogStats } from "../types/products";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function mount(node: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(node));
  return { container, cleanup: () => act(() => root.unmount()) };
}

function buildStats(overrides: Partial<CatalogStats> = {}): CatalogStats {
  return {
    activeProducts: 1,
    archivedProducts: 0,
    pendingSyncProducts: 0,
    productsWithCost: 1,
    productsWithoutCost: 0,
    syncedProductsTotal: 0,
    totalAdCosts: 0,
    totalManualExpenses: 0,
    totalProductCosts: 0,
    totalProducts: 1,
    ...overrides,
  };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("ProductHeader", () => {
  it("renders 'Carregando' when stats is null", () => {
    const { container } = mount(<ProductHeader organizationName="Acme" stats={null} />);
    expect(container.textContent).toContain("Carregando");
  });

  it("renders 'Catálogo vazio' when totalProducts is 0", () => {
    const { container } = mount(
      <ProductHeader organizationName="Acme" stats={buildStats({ totalProducts: 0, activeProducts: 0 })} />
    );
    expect(container.textContent).toContain("Catálogo vazio");
  });

  it("renders 'Produtos sem custo' when productsWithoutCost > 0", () => {
    const { container } = mount(
      <ProductHeader organizationName="Acme" stats={buildStats({ productsWithoutCost: 1, productsWithCost: 0 })} />
    );
    expect(container.textContent).toContain("Produtos sem custo");
  });

  it("prioriza 'Produtos sem custo' sobre 'Revisão pendente'", () => {
    const { container } = mount(
      <ProductHeader
        organizationName="Acme"
        stats={buildStats({ productsWithoutCost: 1, pendingSyncProducts: 1 })}
      />
    );
    expect(container.textContent).toContain("Produtos sem custo");
    expect(container.textContent).not.toContain("Revisão pendente");
  });

  it("renders 'Revisão pendente' when pendingSyncProducts > 0 and no products without cost", () => {
    const { container } = mount(
      <ProductHeader organizationName="Acme" stats={buildStats({ pendingSyncProducts: 1 })} />
    );
    expect(container.textContent).toContain("Revisão pendente");
  });

  it("renders 'Catálogo saudável' when everything is fine", () => {
    const { container } = mount(
      <ProductHeader organizationName="Acme" stats={buildStats()} />
    );
    expect(container.textContent).toContain("Catálogo saudável");
  });
});
