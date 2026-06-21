import { z } from "zod";

export class SyncProviderDto {
  static schema = z.object({
    provider: z.enum(["mercadolivre", "shopee", "shein"]),
  });

  provider!: "mercadolivre" | "shopee" | "shein";
}

export class RunSyncDto {
  static schema = z.object({
    provider: z.enum(["mercadolivre", "shopee", "shein"]),
  });

  provider!: "mercadolivre" | "shopee" | "shein";
}
