import { describe, expect, it } from "vitest";
import { companyFormSchema, companyUpdateSchema } from "./finance-inputs";
import { companiesApiResponseSchema } from "./protected-app";

describe("finance input company schemas", () => {
  it("accepts company finance defaults in create payloads", () => {
    const result = companyFormSchema.parse({
      cnpj: "12.345.678/0001-95",
      fixedCostDefault: "1500.00",
      isActive: true,
      razaoSocial: "Mercado Livre LTDA",
      taxRateDefault: "0.120000",
    });

    expect(result).toEqual({
      cnpj: "12345678000195",
      fixedCostDefault: "1500.00",
      isActive: true,
      razaoSocial: "Mercado Livre LTDA",
      taxRateDefault: "0.120000",
    });
  });

  it("rejects invalid cnpj values", () => {
    expect(() =>
      companyFormSchema.parse({
        cnpj: "12.345.678/0001-00",
        fixedCostDefault: "1500.00",
        isActive: true,
        razaoSocial: "Mercado Livre LTDA",
        taxRateDefault: "0.120000",
      }),
    ).toThrow("CNPJ must be valid.");
  });

  it("accepts partial company finance default updates", () => {
    const result = companyUpdateSchema.parse({
      fixedCostDefault: "1750.00",
      razaoSocial: "Mercado Livre LTDA",
    });

    expect(result).toEqual({
      fixedCostDefault: "1750.00",
      razaoSocial: "Mercado Livre LTDA",
    });
  });

  it("validates companies API records with persisted defaults", () => {
    const payload = companiesApiResponseSchema.parse({
      data: [
        {
          code: "MELI",
          cnpj: "12345678000195",
          createdAt: "2026-05-09T10:00:00.000Z",
          fixedCostDefault: "1500.00",
          id: "company_1",
          isActive: true,
          razaoSocial: "Mercado Livre LTDA",
          taxRateDefault: "0.120000",
          updatedAt: "2026-05-09T10:00:00.000Z",
        },
      ],
      error: null,
    });

    expect(payload.data[0]).toEqual(
      expect.objectContaining({
        cnpj: "12345678000195",
        fixedCostDefault: "1500.00",
        razaoSocial: "Mercado Livre LTDA",
        taxRateDefault: "0.120000",
      }),
    );
  });
});
