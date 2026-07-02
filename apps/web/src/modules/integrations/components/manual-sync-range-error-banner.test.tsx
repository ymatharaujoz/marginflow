/** @vitest-environment jsdom */

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { ManualSyncRangeErrorBanner } from "./manual-sync-range-error-banner";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function mount(node: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(node));
  return {
    container,
    cleanup: () => act(() => root.unmount()),
  };
}

const errorCases: Array<{
  error: string;
  expectedTitle: string;
  expectedSuggestion: string;
}> = [
  {
    error: "Selecione data inicial e final.",
    expectedSuggestion:
      "Preencha ambos os campos para habilitar a sincronizacao manual.",
    expectedTitle: "Datas obrigatorias",
  },
  {
    error: "Periodo invalido.",
    expectedSuggestion: "Revise as datas selecionadas e tente novamente.",
    expectedTitle: "Formato invalido",
  },
  {
    error: "Data inicial nao pode ser maior que data final.",
    expectedSuggestion: "A data inicial deve ser anterior ou igual a data final.",
    expectedTitle: "Intervalo invertido",
  },
  {
    error: "Periodo manual deve ficar dentro dos ultimos 60 dias.",
    expectedSuggestion:
      "Selecione datas mais recentes, dentro da janela permitida.",
    expectedTitle: "Fora da janela de 60 dias",
  },
  {
    error: "Periodo manual nao pode exceder 60 dias.",
    expectedSuggestion: "Reduza intervalo para no maximo 60 dias.",
    expectedTitle: "Acima de 60 dias",
  },
];

afterEach(() => {
  document.body.innerHTML = "";
});

describe("ManualSyncRangeErrorBanner", () => {
  it.each(errorCases)(
    "renders title and suggestion for $expectedTitle",
    ({ error, expectedTitle, expectedSuggestion }) => {
      const { container } = mount(
        <ManualSyncRangeErrorBanner error={error} />,
      );

      const text = container.textContent ?? "";
      expect(text).toContain(expectedTitle);
      expect(text).toContain(error);
      expect(text).toContain(expectedSuggestion);
    },
  );

  it("falls back to generic copy when error message is unknown", () => {
    const { container } = mount(
      <ManualSyncRangeErrorBanner error="Algum erro desconhecido." />,
    );

    const text = container.textContent ?? "";
    expect(text).toContain("Periodo invalido");
    expect(text).toContain("Revise o periodo selecionado e tente novamente.");
    expect(text).toContain("Algum erro desconhecido.");
  });

  it("exposes role=alert and aria-live=polite for assistive tech", () => {
    const { container } = mount(
      <ManualSyncRangeErrorBanner error="Periodo invalido." />,
    );

    const alert = container.querySelector('[role="alert"]');
    expect(alert).not.toBeNull();
    expect(alert?.getAttribute("aria-live")).toBe("polite");
  });

  it("applies the describedById to the banner root", () => {
    const { container } = mount(
      <ManualSyncRangeErrorBanner
        error="Periodo invalido."
        describedById="manual-sync-range-error"
      />,
    );

    const alert = container.querySelector("#manual-sync-range-error");
    expect(alert).not.toBeNull();
    expect(alert?.getAttribute("role")).toBe("alert");
  });
});
