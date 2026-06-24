import { describe, expect, it } from "vitest";
import {
  productCatalogExportQuerySchema,
  productImportRowSchema,
  productManualCreateSchema,
  productSpreadsheetUpdateRowSchema,
} from "./products";

describe("@lucreii/validation product schemas", () => {
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

  it("accepts spreadsheet update rows with optional empty finance fields", () => {
    const result = productSpreadsheetUpdateRowSchema.safeParse({
      EMBALAGEM: "",
      ID: "550e8400-e29b-41d4-a716-446655440000",
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      EMBALAGEM: undefined,
      ID: "550e8400-e29b-41d4-a716-446655440000",
    });
  });

  it("parses export query marketplaces from comma separated string", () => {
    const result = productCatalogExportQuerySchema.safeParse({
      marketplaces: "mercadolivre,shopee",
      search: " kit ",
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      marketplaces: ["mercadolivre", "shopee"],
      search: "kit",
    });
  });

  it("rejects spreadsheet update rows with non-numeric EMBALAGEM using a friendly message", () => {
    const result = productSpreadsheetUpdateRowSchema.safeParse({
      ID: "550e8400-e29b-41d4-a716-446655440000",
      EMBALAGEM: "abc",
    });

    expect(result.success).toBe(false);
    const issue = result.error!.issues.find(
      (current) => current.path.join(".") === "EMBALAGEM",
    );
    expect(issue?.message).toBe("Embalagem deve ser um número válido");
  });

  it("rejects spreadsheet update rows with negative EMBALAGEM using a friendly message", () => {
    const result = productSpreadsheetUpdateRowSchema.safeParse({
      ID: "550e8400-e29b-41d4-a716-446655440000",
      EMBALAGEM: -1,
    });

    expect(result.success).toBe(false);
    const issue = result.error!.issues.find(
      (current) => current.path.join(".") === "EMBALAGEM",
    );
    expect(issue?.message).toBe("Embalagem deve ser maior ou igual a zero");
  });

  it("rejects spreadsheet update rows with invalid UUID using a friendly message", () => {
    const result = productSpreadsheetUpdateRowSchema.safeParse({
      ID: "not-a-uuid",
      EMBALAGEM: 1,
    });

    expect(result.success).toBe(false);
    const issue = result.error!.issues.find(
      (current) => current.path.join(".") === "ID",
    );
    expect(issue?.message).toBe("ID deve ser um identificador válido (UUID)");
  });

  it("rejects product import rows with invalid STATUS using a friendly message", () => {
    const result = productImportRowSchema.safeParse({
      EMBALAGEM: 1,
      "CUSTO UNITÁRIO": 10,
      "PREÇO DE VENDA": 100,
      PRODUTO: "Teste",
      SKU: "SKU-1",
      STATUS: 5,
    });

    expect(result.success).toBe(false);
    const issue = result.error!.issues.find(
      (current) => current.path.join(".") === "STATUS",
    );
    expect(issue?.message).toBe(
      "STATUS deve ser 0 (inativo) ou 1 (ativo)",
    );
  });
});
