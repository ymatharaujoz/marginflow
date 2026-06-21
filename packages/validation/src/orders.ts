import { z } from "zod";
import { createApiSuccessResponseSchema } from "./protected-app";

const decimalPattern = /^-?\d+(?:\.\d{1,2})?$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function decimalField(label: string) {
  return z
    .string()
    .trim()
    .regex(
      decimalPattern,
      `${label} must be a decimal amount with up to 2 places.`,
    );
}

function isoDateField(label: string) {
  return z
    .string()
    .trim()
    .regex(datePattern, `${label} must be a YYYY-MM-DD date.`);
}

function isoDateTimeField(label: string) {
  return z
    .string()
    .trim()
    .min(1, `${label} must be a non-empty ISO date time.`);
}

const integrationProviderSchema = z.enum(["mercadolivre", "shopee"]);

export const orderListFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().min(1).optional(),
  provider: integrationProviderSchema.optional(),
  status: z.string().trim().min(1).optional(),
});

export const orderListItemSchema = z.object({
  id: z.string().trim().min(1),
  orderId: z.string().trim().min(1),
  provider: integrationProviderSchema,
  status: z.string().trim().min(1),
  statusLabel: z.string().trim().min(1),
  orderedAt: isoDateTimeField("Ordered at").nullable(),
  orderDate: isoDateField("Order date").nullable(),
  createdAt: isoDateTimeField("Created at"),
  currency: z.string().trim().min(1),
  shippingAmount: decimalField("Shipping amount"),
  tariffAmount: decimalField("Tariff amount"),
  fixedCostAmount: decimalField("Fixed cost amount"),
  totalFees: decimalField("Total fees"),
  totalWithFees: decimalField("Total with fees"),
  totalWithoutFees: decimalField("Total without fees"),
  itemsSold: z.number().int().min(0),
});

export const ordersListResponseSchema = z.object({
  items: z.array(orderListItemSchema),
  page: z.coerce.number().int().min(1),
  pageSize: z.coerce.number().int().min(1),
  totalItems: z.coerce.number().int().min(0),
  totalPages: z.coerce.number().int().min(1),
});

export const orderLineItemSchema = z.object({
  id: z.string().trim().min(1),
  linkedProductId: z.string().trim().min(1).nullable(),
  imageUrl: z.string().trim().url().nullable().optional(),
  productName: z.string().trim().min(1),
  sku: z.string().trim().min(1).nullable(),
  quantity: z.number().int().min(0),
  unitPrice: decimalField("Unit price"),
  totalPrice: decimalField("Total price"),
});

export const orderDetailsSchema = z.object({
  order: orderListItemSchema,
  items: z.array(orderLineItemSchema),
});

export const ordersListApiResponseSchema =
  createApiSuccessResponseSchema(ordersListResponseSchema);
export const orderDetailsApiResponseSchema =
  createApiSuccessResponseSchema(orderDetailsSchema);

export type OrderListFiltersInput = z.infer<typeof orderListFiltersSchema>;
