import { z } from "zod";

const decimalPattern = /^\d+(?:\.\d{1,2})?$/;
const decimalRatePattern = /^(?:0(?:\.\d{1,6})?|1(?:\.0{1,6})?)$/;
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

function decimalRateField(label: string) {
  return z
    .string()
    .trim()
    .regex(decimalRatePattern, `${label} must be a decimal rate between 0 and 1.`);
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
    taxRate: decimalRateField("Tax rate"),
    unitCost: decimalField("Unit cost"),
  }),
  product: z.object({
    isActive: z.boolean().default(true),
    name: z.string().trim().min(1).max(255),
    sellingPrice: decimalField("Selling price"),
    sku: z.string().trim().min(1).max(128),
  }),
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

export const productImportRowSchema = z.object({
  PRODUTO: z.string().trim().min(1, "Nome do produto é obrigatório").max(255),
  SKU: z.coerce.string().trim().min(1, "SKU é obrigatório").max(128),
  "PREÇO DE VENDA": z.coerce.number().nonnegative("Preço de venda deve ser >= 0"),
  "CUSTO UNITÁRIO": z.coerce.number().nonnegative("Custo unitário deve ser >= 0"),
  EMBALAGEM: z.coerce.number().nonnegative("Embalagem deve ser >= 0"),
  IMPOSTO: z.coerce.number().min(0, "Imposto deve ser >= 0").max(100, "Imposto deve ser <= 100"),
  STATUS: z.coerce.number().refine((v) => v === 0 || v === 1, "STATUS deve ser 0 ou 1"),
});

export type ProductFormInput = z.infer<typeof productFormSchema>;
export type ProductImportRowInput = z.infer<typeof productImportRowSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
export type ProductManualCreateInput = z.infer<typeof productManualCreateSchema>;
export type ProductCostFormInput = z.infer<typeof productCostFormSchema>;
export type ProductCostUpdateInput = z.infer<typeof productCostUpdateSchema>;
export type AdCostFormInput = z.infer<typeof adCostFormSchema>;
export type AdCostUpdateInput = z.infer<typeof adCostUpdateSchema>;
export type ManualExpenseFormInput = z.infer<typeof manualExpenseFormSchema>;
export type ManualExpenseUpdateInput = z.infer<typeof manualExpenseUpdateSchema>;
export type SyncedProductLinkInput = z.infer<typeof syncedProductLinkSchema>;
export type ProductAnalyticsQueryInput = z.infer<typeof productAnalyticsQuerySchema>;
