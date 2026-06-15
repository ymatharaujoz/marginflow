import {
  syncedProductLinkSchema,
  type SyncedProductLinkInput,
} from "@lucreii/validation";
import { z } from "zod";

export class IntegrationProviderParamDto {
  static schema = z.object({
    provider: z.enum(["mercadolivre", "shopee"]),
  });

  provider!: "mercadolivre" | "shopee";
}

export class MercadoLivreCallbackQueryDto {
  static schema = z.object({
    code: z.string().min(1).optional(),
    error: z.string().min(1).optional(),
    error_description: z.string().min(1).optional(),
    state: z.string().min(1).optional(),
  });

  code?: string;
  error?: string;
  error_description?: string;
  state?: string;
}

export class MercadoLivreNotificationDto {
  static schema = z
    .object({
      _id: z.string().min(1).optional(),
      application_id: z.union([z.string(), z.number()]).optional(),
      attempts: z.number().int().nonnegative().optional(),
      resource: z.string().min(1).optional(),
      sent: z.string().min(1).optional(),
      topic: z.string().min(1).optional(),
      user_id: z.union([z.string(), z.number()]).optional(),
    })
    .passthrough();

  _id?: string;
  application_id?: string | number;
  attempts?: number;
  resource?: string;
  sent?: string;
  topic?: string;
  user_id?: string | number;
}

export class ShopeeCallbackQueryDto {
  static schema = z.object({
    code: z.string().min(1).optional(),
    shop_id: z.union([z.string(), z.number()]).optional(),
    state: z.string().min(1).optional(),
  });

  code?: string;
  shop_id?: string | number;
  state?: string;
}

export class ShopeeNotificationDto {
  static schema = z
    .object({
      code: z.number().int().optional(),
      data: z.record(z.string(), z.unknown()).optional(),
      shop_id: z.union([z.string(), z.number()]).optional(),
      timestamp: z.number().int().optional(),
    })
    .passthrough();

  code?: number;
  data?: Record<string, unknown>;
  shop_id?: string | number;
  timestamp?: number;
}

export class IntegrationExternalProductParamDto {
  static schema = z.object({
    externalProductId: z.string().trim().min(1),
    provider: z.enum(["mercadolivre", "shopee"]),
  });

  externalProductId!: string;
  provider!: "mercadolivre" | "shopee";
}

export class LinkSyncedProductRequestDto implements SyncedProductLinkInput {
  static schema = syncedProductLinkSchema;

  productId!: string;
}
