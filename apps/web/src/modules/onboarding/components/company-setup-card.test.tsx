/** @vitest-environment jsdom */

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CompanySetupCard } from "./company-setup-card";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

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

function changeInput(input: HTMLInputElement, value: string) {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");

  act(() => {
    descriptor?.set?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

describe("CompanySetupCard", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders legal company fields and hides manual code field", () => {
    const view = mount(
      <CompanySetupCard
        isSubmitting={false}
        message={null}
        onSubmit={vi.fn()}
        organizationName="Workspace"
      />,
    );

    expect(document.body.textContent).toContain("Razão Social");
    expect(document.body.textContent).toContain("CNPJ");
    expect(document.body.textContent).not.toContain("Código da empresa");

    view.unmount();
  });

  it("submits razão social and normalized cnpj only", () => {
    const onSubmit = vi.fn();
    const view = mount(
      <CompanySetupCard
        isSubmitting={false}
        message={null}
        onSubmit={onSubmit}
        organizationName="Workspace"
      />,
    );

    const inputs = Array.from(document.querySelectorAll("input")) as HTMLInputElement[];
    changeInput(inputs[0]!, "Mercado Livre LTDA");
    changeInput(inputs[1]!, "12.345.678/0001-95");

    act(() => {
      document.querySelector("form")!.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });

    expect(onSubmit).toHaveBeenCalledWith({
      cnpj: "12345678000195",
      isActive: true,
      razaoSocial: "Mercado Livre LTDA",
    });

    view.unmount();
  });
});
