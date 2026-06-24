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
      "Preencha ambos os campos para habilitar a sincronização manual.",
    expectedTitle: "Datas obrigatórias",
  },
  {
    error: "Período inválido.",
    expectedSuggestion: "Revise as datas selecionadas e tente novamente.",
    expectedTitle: "Formato inválido",
  },
  {
    error: "Data inicial não pode ser maior que data final.",
    expectedSuggestion: "A data inicial deve ser anterior ou igual à data final.",
    expectedTitle: "Intervalo invertido",
  },
  {
    error: "Período manual deve ficar dentro dos últimos 30 dias.",
    expectedSuggestion:
      "Selecione datas mais recentes, dentro da janela permitida.",
    expectedTitle: "Fora da janela de 30 dias",
  },
  {
    error: "Período manual não pode ultrapassar 1 mês.",
    expectedSuggestion: "Reduza o intervalo para no máximo 1 mês.",
    expectedTitle: "Período muito longo",
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
    expect(text).toContain("Período inválido");
    expect(text).toContain("Revise o período selecionado e tente novamente.");
    expect(text).toContain("Algum erro desconhecido.");
  });

  it("exposes role=alert and aria-live=polite for assistive tech", () => {
    const { container } = mount(
      <ManualSyncRangeErrorBanner error="Período inválido." />,
    );

    const alert = container.querySelector('[role="alert"]');
    expect(alert).not.toBeNull();
    expect(alert?.getAttribute("aria-live")).toBe("polite");
  });

  it("applies the describedById to the banner root", () => {
    const { container } = mount(
      <ManualSyncRangeErrorBanner
        error="Período inválido."
        describedById="manual-sync-range-error"
      />,
    );

    const alert = container.querySelector("#manual-sync-range-error");
    expect(alert).not.toBeNull();
    expect(alert?.getAttribute("role")).toBe("alert");
  });
});
