import { z } from "zod";

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export class SyncProviderDto {
  static schema = z.object({
    provider: z.enum(["mercadolivre", "shopee", "shein"]),
  });

  provider!: "mercadolivre" | "shopee" | "shein";
}

export class RunSyncDto {
  static schema = z.object({
    endDate: z.string().trim().regex(isoDatePattern),
    provider: z.enum(["mercadolivre", "shopee", "shein"]),
    startDate: z.string().trim().regex(isoDatePattern),
  });

  endDate!: string;
  provider!: "mercadolivre" | "shopee" | "shein";
  startDate!: string;
}
