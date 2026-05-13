/**
 * De/para: campos do `dados_gestao_abril_maio.json` → colunas Drizzle (Postgres/Supabase).
 *
 * | Origem JSON              | Destino |
 * |--------------------------|---------|
 * | chave `gestao_abril`     | `product_monthly_performance.reference_month` = 2026-04-01 |
 * | chave `gestao_maio`      | `product_monthly_performance.reference_month` = 2026-05-01 |
 * | `canal`                  | `product_monthly_performance.channel` (trim) |
 * | `produto`                | `products.name`, `product_monthly_performance.product_name` (trim) |
 * | `sku`                    | `products.sku`, `product_monthly_performance.sku`; se vazio/null → legado `${NAMEKEY}-${referenceMonth}-${n}` |
 * | `vendas`                 | `sales_quantity` (fallback: `venda_liquida`) |
 * | `devolucoes`             | `returns_quantity` (null → 0) |
 * | `custo`                  | `unit_cost` |
 * | `pdv`                    | `sale_price`, `products.selling_price` |
 * | `comissao`               | `commission_rate` |
 * | `taxa_frete`             | `shipping_fee` |
 * | `aliquota`               | `tax_rate` |
 * | `embalagem`              | `packaging_cost` |
 * | `publicidade`            | `advertising_cost` (null → 0) |
 */
export type GestaoSeedSourceRow = {
  aliquota: number | null;
  canal: string;
  comissao: number | null;
  custo: number | null;
  devolucoes: number | null;
  embalagem: number | null;
  publicidade: number | null;
  produto: string;
  pdv: number | null;
  sku: string | null;
  taxa_frete: number | null;
  venda_liquida: number | null;
  vendas: number | null;
};

export type GestaoSeedSource = {
  gestao_abril: GestaoSeedSourceRow[];
  gestao_maio: GestaoSeedSourceRow[];
};

export type GestaoSeedProductRow = {
  isActive: boolean;
  name: string;
  organizationId: string;
  sellingPrice: string;
  sku: string;
};

export type GestaoSeedPerformanceRow = {
  advertisingCost: string;
  channel: string;
  companyCode: string;
  commissionRate: string;
  nameKey: string;
  organizationId: string;
  packagingCost: string;
  productName: string;
  referenceMonth: string;
  returnsQuantity: number;
  salePrice: string;
  salesQuantity: number;
  shippingFee: string;
  sku: string;
  taxRate: string;
  unitCost: string;
  userId: string;
};

export type GestaoSeedRows = {
  companyCode: string;
  companyName: string;
  performanceRows: GestaoSeedPerformanceRow[];
  productRows: GestaoSeedProductRow[];
};

const MONTH_REFERENCE = {
  gestao_abril: "2026-04-01",
  gestao_maio: "2026-05-01",
} as const;

const COMPANY_CODE = "GESTAO";
const COMPANY_NAME = "Gestao Abril e Maio";

export function buildGestaoSeedRows(
  source: GestaoSeedSource,
  context = {
    organizationId: "00000000-0000-0000-0000-000000000000",
    userId: "00000000-0000-0000-0000-000000000000",
  },
): GestaoSeedRows {
  const legacySkuCounts = new Map<string, number>();
  const performanceRows: GestaoSeedPerformanceRow[] = [];
  const productRows: GestaoSeedProductRow[] = [];

  for (const [monthKey, referenceMonth] of Object.entries(MONTH_REFERENCE) as [
    keyof typeof MONTH_REFERENCE,
    (typeof MONTH_REFERENCE)[keyof typeof MONTH_REFERENCE],
  ][]) {
    for (const row of source[monthKey]) {
      const nameKey = normalizeName(row.produto);
      const trimmedSku = row.sku?.trim() ?? "";
      const sku =
        trimmedSku.length > 0
          ? trimmedSku
          : (() => {
              const legacyKey = `${referenceMonth}:${nameKey}`;
              const nextCount = (legacySkuCounts.get(legacyKey) ?? 0) + 1;
              legacySkuCounts.set(legacyKey, nextCount);
              return `${nameKey}-${referenceMonth}-${nextCount}`;
            })();
      const productName = row.produto.trim();

      productRows.push({
        isActive: true,
        name: productName,
        organizationId: context.organizationId,
        sellingPrice: formatMoney(row.pdv),
        sku,
      });

      performanceRows.push({
        advertisingCost: formatMoney(row.publicidade),
        channel: row.canal.trim(),
        companyCode: COMPANY_CODE,
        commissionRate: formatRate(row.comissao),
        nameKey,
        organizationId: context.organizationId,
        packagingCost: formatMoney(row.embalagem),
        productName,
        referenceMonth,
        returnsQuantity: Math.max(0, row.devolucoes ?? 0),
        salePrice: formatMoney(row.pdv),
        salesQuantity: Math.max(0, row.vendas ?? row.venda_liquida ?? 0),
        shippingFee: formatMoney(row.taxa_frete),
        sku,
        taxRate: formatRate(row.aliquota),
        unitCost: formatMoney(row.custo),
        userId: context.userId,
      });
    }
  }

  return {
    companyCode: COMPANY_CODE,
    companyName: COMPANY_NAME,
    performanceRows,
    productRows,
  };
}

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase();
}

function formatMoney(value: number | null) {
  return (value ?? 0).toFixed(2);
}

function formatRate(value: number | null) {
  return String(value ?? 0);
}
