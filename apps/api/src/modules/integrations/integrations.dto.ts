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
