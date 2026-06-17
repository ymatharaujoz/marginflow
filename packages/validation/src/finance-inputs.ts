import { z } from "zod";

const moneyPattern = /^\d+(?:\.\d{1,2})?$/;
const ratePattern = /^(?:0(?:\.\d{1,6})?|1(?:\.0{1,6})?)$/;
const referenceMonthPattern = /^\d{4}-\d{2}-01$/;
const repeatedDigitsPattern = /^(\d)\1{13}$/;

function moneyField(label: string) {
  return z
    .string()
    .trim()
    .regex(moneyPattern, `${label} must be a decimal amount with up to 2 places.`);
}

function rateField(label: string) {
  return z
    .string()
    .trim()
    .regex(ratePattern, `${label} must be a decimal rate between 0 and 1.`);
}

function optionalNotesField() {
  return z
    .string()
    .trim()
    .max(2000)
    .transform((value) => (value.length > 0 ? value : null))
    .nullable()
    .or(z.literal("").transform(() => null));
}

function isValidCnpj(value: string) {
  if (value.length !== 14 || repeatedDigitsPattern.test(value)) {
    return false;
  }

  const digits = value.split("").map((digit) => Number.parseInt(digit, 10));
  const firstWeights = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const secondWeights = [6, ...firstWeights];
  const firstRemainder =
    firstWeights.reduce((sum, weight, index) => sum + digits[index]! * weight, 0) % 11;
  const firstDigit = firstRemainder < 2 ? 0 : 11 - firstRemainder;

  if (digits[12] !== firstDigit) {
    return false;
  }

  const secondRemainder =
    secondWeights.reduce((sum, weight, index) => sum + digits[index]! * weight, 0) % 11;
  const secondDigit = secondRemainder < 2 ? 0 : 11 - secondRemainder;

  return digits[13] === secondDigit;
}

const companyRazaoSocialField = z.string().trim().min(2).max(255);
const companyCnpjField = z
  .string()
  .trim()
  .transform((value) => value.replace(/\D/g, ""))
  .refine((value) => value.length === 14, "CNPJ must have 14 digits.")
  .refine((value) => isValidCnpj(value), "CNPJ must be valid.");

export const companyFormSchema = z.object({
  cnpj: companyCnpjField,
  fixedCostDefault: moneyField("Fixed cost default").default("0"),
  isActive: z.boolean().default(true),
  razaoSocial: companyRazaoSocialField,
  taxRateDefault: rateField("Tax rate default").default("0"),
});

export const companyUpdateSchema = z
  .object({
    cnpj: companyCnpjField.optional(),
    fixedCostDefault: moneyField("Fixed cost default").optional(),
    isActive: z.boolean().optional(),
    razaoSocial: companyRazaoSocialField.optional(),
    taxRateDefault: rateField("Tax rate default").optional(),
  })
  .refine(
  (value) => Object.keys(value).length > 0,
  "At least one company field must be provided.",
);

export const performanceFiltersSchema = z.object({
  channel: z.string().trim().min(2).max(120).optional(),
  companyId: z.string().uuid(),
  referenceMonth: z
    .string()
    .trim()
    .regex(referenceMonthPattern, "Reference month must be the first day of the month."),
  sku: z.string().trim().min(1).max(128).optional(),
});

const performanceBaseSchema = z.object({
  advertisingCost: moneyField("Advertising cost"),
  channel: z.string().trim().min(2).max(120),
  commissionRate: rateField("Commission rate"),
  companyId: z.string().uuid(),
  notes: optionalNotesField().default(null),
  packagingCost: moneyField("Packaging cost"),
  productName: z.string().trim().min(2).max(255),
  referenceMonth: z
    .string()
    .trim()
    .regex(referenceMonthPattern, "Reference month must be the first day of the month."),
  returnsQuantity: z.number().int().min(0),
  salePrice: moneyField("Sale price"),
  salesQuantity: z.number().int().min(0),
  shippingFee: moneyField("Shipping fee"),
  sku: z.string().trim().min(1).max(128),
  unitCost: moneyField("Unit cost"),
});

export const performanceFormSchema = performanceBaseSchema
  .refine((value) => value.returnsQuantity <= value.salesQuantity, {
    message: "Returns quantity cannot exceed sales quantity.",
    path: ["returnsQuantity"],
  });

export const performanceUpdateSchema = performanceBaseSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, "At least one performance field must be provided.")
  .refine(
    (value) =>
      value.returnsQuantity === undefined ||
      value.salesQuantity === undefined ||
      value.returnsQuantity <= value.salesQuantity,
    {
      message: "Returns quantity cannot exceed sales quantity.",
      path: ["returnsQuantity"],
    },
  );

export const fixedCostFiltersSchema = z.object({
  companyId: z.string().uuid(),
  referenceMonth: z
    .string()
    .trim()
    .regex(referenceMonthPattern, "Reference month must be the first day of the month."),
});

export const fixedCostFormSchema = z.object({
  amount: moneyField("Fixed cost amount"),
  category: z.string().trim().min(2).max(120).default("general"),
  companyId: z.string().uuid(),
  isRecurring: z.boolean().default(true),
  name: z.string().trim().min(2).max(255),
  notes: optionalNotesField().default(null),
  referenceMonth: z
    .string()
    .trim()
    .regex(referenceMonthPattern, "Reference month must be the first day of the month."),
});

export const fixedCostUpdateSchema = fixedCostFormSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one fixed cost field must be provided.",
);

export type CompanyFormInput = z.infer<typeof companyFormSchema>;
export type CompanyUpdateInput = z.infer<typeof companyUpdateSchema>;
export type PerformanceFiltersInput = z.infer<typeof performanceFiltersSchema>;
export type ProductMonthlyPerformanceFormInput = z.infer<typeof performanceFormSchema>;
export type ProductMonthlyPerformanceUpdateInput = z.infer<typeof performanceUpdateSchema>;
export type FixedCostFiltersInput = z.infer<typeof fixedCostFiltersSchema>;
export type FixedCostFormInput = z.infer<typeof fixedCostFormSchema>;
export type FixedCostUpdateInput = z.infer<typeof fixedCostUpdateSchema>;
