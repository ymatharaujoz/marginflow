import { describe, expect, it } from "vitest";
import { productImportRowSchema, productManualCreateSchema } from "./products";

describe("@marginflow/validation product schemas", () => {
  it("accepts manual product creation without tax rate", () => {
    const result = productManualCreateSchema.safeParse({
      initialFinance: {
        packagingCost: "3.00",
        unitCost: "80.00",
      },
      product: {
        isActive: true,
        name: "Kit Mercado Livre",
        sellingPrice: "149.90",
        sku: "ML-001",
      },
    });

    expect(result.success).toBe(true);
  });

  it("accepts product import rows without IMPOSTO column", () => {
    const result = productImportRowSchema.safeParse({
      EMBALAGEM: 3,
      "CUSTO UNITÁRIO": 80,
      "PREÇO DE VENDA": 149.9,
      PRODUTO: "Kit Mercado Livre",
      SKU: "ML-001",
      STATUS: 1,
    });

    expect(result.success).toBe(true);
  });
});
