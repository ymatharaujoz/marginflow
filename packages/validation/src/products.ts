import { z } from "zod";

const decimalPattern = /^\d+(?:\.\d{1,2})?$/;
const optionalDateField = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a YYYY-MM-DD date.")
  .nullable();
const optionalReferenceMonthField = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-01$/, "Expected the first day of a month.")
  .optional();

function decimalField(label: string) {
  return z
    .string()
    .trim()
    .regex(decimalPattern, `${label} must be a decimal amount with up to 2 places.`);
}

function optionalTrimmedString(max: number) {
  return z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value.length > 0 ? value : null))
    .nullable()
    .or(z.literal("").transform(() => null));
}

function optionalQueryString(max: number) {
  return z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value.length > 0 ? value : undefined))
    .optional();
}

function optionalSpreadsheetMoneyField(label: string) {
  return z.preprocess((value) => {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (typeof value === "string" && value.trim().length === 0) {
      return undefined;
    }

    return value;
  }, z.coerce
    .number({
      error: (issue) =>
        issue.code === "invalid_type"
          ? `${label} deve ser um número válido`
          : undefined,
    })
    .nonnegative({
      error: `${label} deve ser maior ou igual a zero`,
    })
    .optional());
}

function spreadsheetMoneyField(label: string) {
  return z.coerce
    .number({
      error: (issue) =>
        issue.code === "invalid_type"
          ? `${label} deve ser um número válido`
          : undefined,
    })
    .nonnegative({
      error: `${label} deve ser maior ou igual a zero`,
    });
}

export const productFormSchema = z.object({
  isActive: z.boolean().default(true),
  name: z.string().trim().min(1).max(255),
  sellingPrice: decimalField("Selling price"),
  sku: optionalTrimmedString(128).default(null),
});

export const productUpdateSchema = productFormSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one product field must be provided.",
);

export const productManualCreateSchema = z.object({
  initialFinance: z.object({
    packagingCost: decimalField("Packaging cost"),
    unitCost: decimalField("Unit cost"),
  }),
  product: z.object({
    isActive: z.boolean().default(true),
    name: z.string().trim().min(1).max(255),
    sellingPrice: decimalField("Selling price"),
    sku: z.string().trim().min(1).max(128),
  }),
});

export const productCatalogFinanceUpdateSchema = z.object({
  packagingCost: decimalField("Packaging cost"),
  unitCost: decimalField("Unit cost"),
});

export const productCostFormSchema = z.object({
  amount: decimalField("Product cost"),
  costType: z.string().trim().min(1).max(32),
  currency: z.string().trim().min(3).max(8).default("BRL"),
  effectiveFrom: optionalDateField.default(null),
  notes: optionalTrimmedString(2000).default(null),
  productId: z.string().uuid(),
});

export const productCostUpdateSchema = productCostFormSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one product cost field must be provided.",
);

export const adCostFormSchema = z.object({
  amount: decimalField("Ad cost"),
  channel: z.string().trim().min(1).max(64),
  currency: z.string().trim().min(3).max(8).default("BRL"),
  notes: optionalTrimmedString(2000).default(null),
  productId: z
    .string()
    .trim()
    .transform((value) => (value.length > 0 ? value : null))
    .nullable()
    .refine((value) => value === null || z.uuid().safeParse(value).success, "Invalid product id.")
    .default(null),
  spentAt: optionalDateField.default(null),
});

export const adCostUpdateSchema = adCostFormSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one ad cost field must be provided.",
);

export const manualExpenseFormSchema = z.object({
  amount: decimalField("Expense amount"),
  category: z.string().trim().min(1).max(64),
  currency: z.string().trim().min(3).max(8).default("BRL"),
  incurredAt: optionalDateField.default(null),
  notes: optionalTrimmedString(2000).default(null),
});

export const manualExpenseUpdateSchema = manualExpenseFormSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one expense field must be provided.",
);

export const syncedProductLinkSchema = z.object({
  productId: z.string().uuid(),
});

export const productAnalyticsQuerySchema = z.object({
  companyId: z
    .string()
    .trim()
    .transform((value) => (value.length > 0 ? value : undefined))
    .optional()
    .refine((value) => value === undefined || z.uuid().safeParse(value).success, "Invalid company id."),
  referenceMonth: optionalReferenceMonthField,
});

export const productCatalogExportQuerySchema = z.object({
  marketplaces: z
    .preprocess((value) => {
      if (Array.isArray(value)) {
        return value;
      }

      if (typeof value !== "string") {
        return [];
      }

      return value
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    }, z.array(z.enum(["mercadolivre", "shopee", "shein"])).default([]))
    .optional(),
  search: optionalQueryString(255),
});

export const productImportRowSchema = z.object({
  PRODUTO: z
    .string({
      error: (issue) =>
        issue.code === "invalid_type"
          ? "Nome do produto é obrigatório"
          : undefined,
    })
    .trim()
    .min(1, "Nome do produto é obrigatório")
    .max(255),
  SKU: z
    .coerce
    .string({
      error: (issue) =>
        issue.code === "invalid_type" ? "SKU é obrigatório" : undefined,
    })
    .trim()
    .min(1, "SKU é obrigatório")
    .max(128),
  "PREÇO DE VENDA": spreadsheetMoneyField("Preço de venda"),
  "CUSTO UNITÁRIO": spreadsheetMoneyField("Custo unitário"),
  EMBALAGEM: spreadsheetMoneyField("Embalagem"),
  STATUS: z.coerce
    .number({
      error: (issue) =>
        issue.code === "invalid_type"
          ? "STATUS deve ser um número (0 ou 1)"
          : undefined,
    })
    .refine((v) => v === 0 || v === 1, "STATUS deve ser 0 (inativo) ou 1 (ativo)"),
});

export const productSpreadsheetUpdateRowSchema = z.object({
  ID: z.preprocess(
    (value) => (typeof value === "string" ? value : String(value ?? "")),
    z
      .string({
        error: (issue) =>
          issue.code === "invalid_type"
            ? "ID é obrigatório"
            : undefined,
      })
      .trim()
      .uuid("ID deve ser um identificador válido (UUID)"),
  ),
  "CUSTO UNITÁRIO": optionalSpreadsheetMoneyField("Custo unitário"),
  EMBALAGEM: optionalSpreadsheetMoneyField("Embalagem"),
});

export type ProductFormInput = z.infer<typeof productFormSchema>;
export type ProductImportRowInput = z.infer<typeof productImportRowSchema>;
export type ProductSpreadsheetUpdateRowInput = z.infer<
  typeof productSpreadsheetUpdateRowSchema
>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
export type ProductManualCreateInput = z.infer<typeof productManualCreateSchema>;
export type ProductCatalogFinanceUpdateInput = z.infer<
  typeof productCatalogFinanceUpdateSchema
>;
export type ProductCostFormInput = z.infer<typeof productCostFormSchema>;
export type ProductCostUpdateInput = z.infer<typeof productCostUpdateSchema>;
export type AdCostFormInput = z.infer<typeof adCostFormSchema>;
export type AdCostUpdateInput = z.infer<typeof adCostUpdateSchema>;
export type ManualExpenseFormInput = z.infer<typeof manualExpenseFormSchema>;
export type ManualExpenseUpdateInput = z.infer<typeof manualExpenseUpdateSchema>;
export type SyncedProductLinkInput = z.infer<typeof syncedProductLinkSchema>;
export type ProductAnalyticsQueryInput = z.infer<typeof productAnalyticsQuerySchema>;
export type ProductCatalogExportQueryInput = z.infer<
  typeof productCatalogExportQuerySchema
>;
