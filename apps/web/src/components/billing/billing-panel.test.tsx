import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BillingPanel } from "./billing-panel";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    replace: vi.fn(),
  }),
}));

describe("BillingPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("presents the free trial terms for eligible users", () => {
    const markup = renderToStaticMarkup(
      createElement(BillingPanel, {
        checkoutSessionId: null,
        checkoutState: null,
        organizationName: "Lucreii",
        trialDays: 7,
        trialEligible: true,
      }),
    );

    expect(markup).toContain("Teste grátis por 7 dias");
    expect(markup).toContain("Começar teste grátis");
    expect(markup).toContain("Cadastre seu cartão agora");
    expect(markup).toContain("Cobrança automática após 7 dias grátis");
    expect(markup).toContain("Start");
    expect(markup).toContain("Pro");
    expect(markup).toContain("Business");
    expect(markup).toContain("1 CNPJ");
    expect(markup).toContain("3 CNPJs");
    expect(markup).toContain("5 CNPJs");
  });

  it("presents immediate subscription copy after trial redemption", () => {
    const markup = renderToStaticMarkup(
      createElement(BillingPanel, {
        checkoutSessionId: null,
        checkoutState: null,
        organizationName: "Lucreii",
        trialDays: 7,
        trialEligible: false,
      }),
    );

    expect(markup).toContain("Ative sua assinatura");
    expect(markup).toContain(">Assinar<");
    expect(markup).not.toContain("Começar teste grátis");
    expect(markup).not.toContain("Cobrança automática após 7 dias grátis");
  });
});
