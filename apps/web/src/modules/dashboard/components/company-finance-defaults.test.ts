import { describe, expect, it } from "vitest";
import {
  buildCompanyDefaultsPatch,
  formatTaxPercentInput,
  getActiveCompany,
} from "./company-finance-defaults";

describe("company finance defaults helpers", () => {
  it("builds normalized patch payloads for company defaults", () => {
    const payload = buildCompanyDefaultsPatch({
      fixedCostInput: "1.500,00",
      taxPercentInput: "12,50",
    });

    expect(payload).toEqual({
      fixedCostDefault: "1500.00",
      taxRateDefault: "0.125000",
    });
  });

  it("formats stored tax rates as percent input values", () => {
    expect(formatTaxPercentInput("0.120000")).toBe("12,00");
  });

  it("returns the first active company", () => {
    const activeCompany = getActiveCompany([
      {
        cnpj: "12345678000195",
        code: "INACTIVE",
        createdAt: "2026-05-09T10:00:00.000Z",
        fixedCostDefault: "0.00",
        id: "company_0",
        isActive: false,
        razaoSocial: "Inativa LTDA",
        taxRateDefault: "0.000000",
        updatedAt: "2026-05-09T10:00:00.000Z",
      },
      {
        cnpj: "11222333000181",
        code: "MELI",
        createdAt: "2026-05-09T10:00:00.000Z",
        fixedCostDefault: "1500.00",
        id: "company_1",
        isActive: true,
        razaoSocial: "Mercado Livre LTDA",
        taxRateDefault: "0.120000",
        updatedAt: "2026-05-09T10:00:00.000Z",
      },
    ]);

    expect(activeCompany?.id).toBe("company_1");
  });
});
