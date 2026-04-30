import { z } from "zod";

const decimalPattern = /^\d+(?:\.\d{1,2})?$/;
const optionalDateField = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a YYYY-MM-DD date.")
  .nullable();

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

export type ProductFormInput = z.infer<typeof productFormSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
export type ProductCostFormInput = z.infer<typeof productCostFormSchema>;
export type ProductCostUpdateInput = z.infer<typeof productCostUpdateSchema>;
export type AdCostFormInput = z.infer<typeof adCostFormSchema>;
export type AdCostUpdateInput = z.infer<typeof adCostUpdateSchema>;
export type ManualExpenseFormInput = z.infer<typeof manualExpenseFormSchema>;
export type ManualExpenseUpdateInput = z.infer<typeof manualExpenseUpdateSchema>;
