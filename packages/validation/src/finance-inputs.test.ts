import { describe, expect, it } from "vitest";
import { companyFormSchema, companyUpdateSchema } from "./finance-inputs";
import { companiesApiResponseSchema } from "./protected-app";

describe("finance input company schemas", () => {
  it("accepts company finance defaults in create payloads", () => {
    const result = companyFormSchema.parse({
      code: "meli",
      fixedCostDefault: "1500.00",
      isActive: true,
      name: "Mercado Livre",
      taxRateDefault: "0.120000",
    });

    expect(result).toEqual({
      code: "MELI",
      fixedCostDefault: "1500.00",
      isActive: true,
      name: "Mercado Livre",
      taxRateDefault: "0.120000",
    });
  });

  it("accepts partial company finance default updates", () => {
    const result = companyUpdateSchema.parse({
      fixedCostDefault: "1750.00",
    });

    expect(result).toEqual({
      fixedCostDefault: "1750.00",
    });
  });

  it("validates companies API records with persisted defaults", () => {
    const payload = companiesApiResponseSchema.parse({
      data: [
        {
          code: "MELI",
          createdAt: "2026-05-09T10:00:00.000Z",
          fixedCostDefault: "1500.00",
          id: "company_1",
          isActive: true,
          name: "Mercado Livre",
          taxRateDefault: "0.120000",
          updatedAt: "2026-05-09T10:00:00.000Z",
        },
      ],
      error: null,
    });

    expect(payload.data[0]).toEqual(
      expect.objectContaining({
        fixedCostDefault: "1500.00",
        taxRateDefault: "0.120000",
      }),
    );
  });
});
