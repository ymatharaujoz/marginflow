import { z } from "zod";

const DEFAULT_STRIPE_PRICES = {
  businessAnnual: "price_1TiiJBAcc6lqNf7osFGYo2ko",
  businessMonthly: "price_1TiiItAcc6lqNf7oYZv2jHVt",
  proAnnual: "price_1TiiICAcc6lqNf7olbaW6UZw",
  proMonthly: "price_1TiiI0Acc6lqNf7oijT1DqqH",
  startAnnual: "price_1TiiHfAcc6lqNf7o1HBx8o6c",
  startMonthly: "price_1TiiHEAcc6lqNf7obNTfV2UF",
} as const;

export const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  DATABASE_MIGRATION_URL: z.string().url().optional(),
  BETTER_AUTH_SECRET: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_PRICE_START_MONTHLY: z
    .string()
    .min(1)
    .default(DEFAULT_STRIPE_PRICES.startMonthly),
  STRIPE_PRICE_START_ANNUAL: z
    .string()
    .min(1)
    .default(DEFAULT_STRIPE_PRICES.startAnnual),
  STRIPE_PRICE_PRO_MONTHLY: z
    .string()
    .min(1)
    .default(DEFAULT_STRIPE_PRICES.proMonthly),
  STRIPE_PRICE_PRO_ANNUAL: z
    .string()
    .min(1)
    .default(DEFAULT_STRIPE_PRICES.proAnnual),
  STRIPE_PRICE_BUSINESS_MONTHLY: z
    .string()
    .min(1)
    .default(DEFAULT_STRIPE_PRICES.businessMonthly),
  STRIPE_PRICE_BUSINESS_ANNUAL: z
    .string()
    .min(1)
    .default(DEFAULT_STRIPE_PRICES.businessAnnual),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
});

export const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_API_BASE_URL: z.string().url(),
  NEXT_PUBLIC_WHATSAPP_PHONE: z
    .string()
    .regex(/^\d{10,15}$/, "WhatsApp phone must contain only digits (e.g. 5511999999999)")
    .optional(),
  NEXT_PUBLIC_WHATSAPP_DEMO_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_NAME: z.string().min(1).max(120).optional(),
  NEXT_PUBLIC_APP_ICON: z.string().min(1).max(24).optional(),
  NEXT_PUBLIC_PRICE_MONTHLY_LABEL: z.string().min(1).max(40).optional(),
  NEXT_PUBLIC_PRICE_ANNUAL_LABEL: z.string().min(1).max(40).optional(),
});

export function validateServerEnv(input: Record<string, string | undefined>) {
  return serverEnvSchema.parse(input);
}

export function validateClientEnv(input: Record<string, string | undefined>) {
  return clientEnvSchema.parse(input);
}

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;
