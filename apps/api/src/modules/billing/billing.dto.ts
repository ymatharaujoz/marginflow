import { z } from "zod";
import {
  BILLING_INTERVALS,
  BILLING_PLAN_CODES,
  type BillingInterval,
  type BillingPlanCode,
} from "./billing.types";

export class CreateCheckoutRequestDto {
  static schema = z.object({
    interval: z.enum(BILLING_INTERVALS),
    planCode: z.enum(BILLING_PLAN_CODES),
  });

  interval!: BillingInterval;
  planCode!: BillingPlanCode;
}

export class ConfirmCheckoutRequestDto {
  static schema = z.object({
    sessionId: z.string().min(10).regex(/^cs_/),
  });

  sessionId!: string;
}
