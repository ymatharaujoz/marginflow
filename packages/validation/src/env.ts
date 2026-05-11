import { z } from "zod";

export const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  DATABASE_MIGRATION_URL: z.string().url().optional(),
  BETTER_AUTH_SECRET: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_PRICE_MONTHLY: z.string().min(1),
  STRIPE_PRICE_ANNUAL: z.string().min(1),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
});

export const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_API_BASE_URL: z.string().url(),
  /** e.g. https://wa.me/5511999999999?text=... for “Agendar demonstração” on marketing */
  NEXT_PUBLIC_WHATSAPP_DEMO_URL: z.string().url().optional(),
  /** Product name across marketing and app shell (default applied in `readPublicEnv` if omitted). */
  NEXT_PUBLIC_APP_NAME: z.string().min(1).max(120).optional(),
  /** Short mark in the logo tile (letter, monogram, or emoji; default `M`). */
  NEXT_PUBLIC_APP_ICON: z.string().min(1).max(24).optional(),
  /** Display label for the monthly plan price (e.g. `US$ 99`). */
  NEXT_PUBLIC_PRICE_MONTHLY_LABEL: z.string().min(1).max(40).optional(),
  /** Display label for the annual plan’s per-month equivalent (e.g. `US$ 79`). */
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
