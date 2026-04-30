import { z } from "zod";

export class SyncProviderDto {
  static schema = z.object({
    provider: z.enum(["mercadolivre", "shopee"]),
  });

  provider!: "mercadolivre" | "shopee";
}

export class RunSyncDto {
  static schema = z.object({
    provider: z.enum(["mercadolivre", "shopee"]),
  });

  provider!: "mercadolivre" | "shopee";
}
