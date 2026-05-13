import { describe, expect, it } from "vitest";

import { buildGestaoSeedRows } from "./seed-data";

describe("buildGestaoSeedRows", () => {
  it("uses SKU from JSON when present (GEST-* convention)", () => {
    const result = buildGestaoSeedRows({
      gestao_abril: [
        {
          aliquota: 0.04,
          canal: "MELI",
          comissao: 0.14,
          custo: 2.14,
          devolucoes: 10,
          embalagem: 0.5,
          publicidade: 462.01,
          produto: "Kit 2 Calçadeiras",
          pdv: 19,
          sku: "GEST-KIT-2-CALCADEIRAS",
          taxa_frete: 6.55,
          venda_liquida: 367,
          vendas: 377,
        },
        {
          aliquota: 0.04,
          canal: "MELI",
          comissao: 0.115,
          custo: 1.9,
          devolucoes: null,
          embalagem: 0.5,
          publicidade: null,
          produto: "WC",
          pdv: 27.59,
          sku: "GEST-WC",
          taxa_frete: 6.55,
          venda_liquida: 3,
          vendas: 3,
        },
        {
          aliquota: 0.04,
          canal: "MELI",
          comissao: 0.115,
          custo: 1.9,
          devolucoes: null,
          embalagem: 0.5,
          publicidade: 23.37,
          produto: "WC",
          pdv: 28.44,
          sku: "GEST-WC-02",
          taxa_frete: 6.55,
          venda_liquida: 10,
          vendas: 10,
        },
      ],
      gestao_maio: [
        {
          aliquota: 0.04,
          canal: "MELI",
          comissao: 0.115,
          custo: 1.42,
          devolucoes: null,
          embalagem: 0.5,
          publicidade: null,
          produto: "Cantinho Oração",
          pdv: 20.33,
          sku: "GEST-CANTINHO-ORACAO",
          taxa_frete: 6.55,
          venda_liquida: 1,
          vendas: 1,
        },
      ],
    });

    expect(result.performanceRows).toHaveLength(4);
    expect(result.productRows).toHaveLength(4);

    expect(result.performanceRows[0]).toMatchObject({
      advertisingCost: "462.01",
      companyCode: "GESTAO",
      channel: "MELI",
      productName: "Kit 2 Calçadeiras",
      referenceMonth: "2026-04-01",
      returnsQuantity: 10,
      salePrice: "19.00",
      salesQuantity: 377,
      sku: "GEST-KIT-2-CALCADEIRAS",
      unitCost: "2.14",
    });

    expect(result.performanceRows[1].sku).toBe("GEST-WC");
    expect(result.performanceRows[2].sku).toBe("GEST-WC-02");
    expect(result.performanceRows[3]).toMatchObject({
      advertisingCost: "0.00",
      referenceMonth: "2026-05-01",
      returnsQuantity: 0,
      salesQuantity: 1,
      sku: "GEST-CANTINHO-ORACAO",
    });
  });

  it("falls back to legacy SKU when json sku is null", () => {
    const result = buildGestaoSeedRows({
      gestao_abril: [
        {
          aliquota: 0.04,
          canal: "MELI",
          comissao: 0.115,
          custo: 1.9,
          devolucoes: null,
          embalagem: 0.5,
          publicidade: null,
          produto: "Legacy Item",
          pdv: 10,
          sku: null,
          taxa_frete: 6.55,
          venda_liquida: 1,
          vendas: 1,
        },
      ],
      gestao_maio: [],
    });

    expect(result.performanceRows).toHaveLength(1);
    expect(result.performanceRows[0]?.sku).toBe("LEGACY-ITEM-2026-04-01-1");
  });
});
