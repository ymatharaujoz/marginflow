import { z } from "zod";
import { BILLING_INTERVALS, type BillingInterval } from "./billing.types";

export class CreateCheckoutRequestDto {
  static schema = z.object({
    interval: z.enum(BILLING_INTERVALS),
  });

  interval!: BillingInterval;
}

export class ConfirmCheckoutRequestDto {
  static schema = z.object({
    sessionId: z.string().min(10).regex(/^cs_/),
  });

  sessionId!: string;
}
