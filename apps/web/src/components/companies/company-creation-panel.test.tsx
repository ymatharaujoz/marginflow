/** @vitest-environment jsdom */

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CompanyCreationPanel } from "./company-creation-panel";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    replace: vi.fn(),
  }),
}));

vi.mock("@/lib/company-creation", () => ({
  createCompanyAndSelect: vi.fn(),
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

describe("CompanyCreationPanel", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders the dedicated add-company copy", () => {
    const view = mount(
      <CompanyCreationPanel
        companyCount={2}
        companyLimit={3}
        organizationName="Lucreii"
      />,
    );

    expect(document.body.textContent).toContain("Adicionar empresa");
    expect(document.body.textContent).toContain("2 de 3 empresas cadastradas");

    view.unmount();
  });
});
