import { validateClientEnv } from "@marginflow/validation/env";

/** Same defaults documented in `.env.example` and used in `auth-client.ts`. */
const DEFAULT_PUBLIC_APP_URL = "http://localhost:3000";
const DEFAULT_PUBLIC_API_BASE_URL = "http://localhost:4000";

function pickNonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Validates `NEXT_PUBLIC_*` URLs.
 * Outside \`NODE_ENV === "production"\` (development, tests, previews), fills missing URLs with localhost
 * defaults so client-side `fetch` bundles do not explode when Turborepo or ad-hoc shells omit env.
 * Production builds must still provide real URLs in the environment embedded at compile time.
 */
export function readPublicEnv(source: Record<string, string | undefined> = process.env) {
  const nodeEnv = source.NODE_ENV ?? process.env.NODE_ENV;
  const useLocalDefaults = nodeEnv !== "production";

  const merged = validateClientEnv({
    NEXT_PUBLIC_APP_URL:
      pickNonEmpty(source.NEXT_PUBLIC_APP_URL) ??
      (useLocalDefaults ? DEFAULT_PUBLIC_APP_URL : undefined),
    NEXT_PUBLIC_API_BASE_URL:
      pickNonEmpty(source.NEXT_PUBLIC_API_BASE_URL) ??
      (useLocalDefaults ? DEFAULT_PUBLIC_API_BASE_URL : undefined),
    NEXT_PUBLIC_WHATSAPP_DEMO_URL: pickNonEmpty(source.NEXT_PUBLIC_WHATSAPP_DEMO_URL),
    NEXT_PUBLIC_APP_NAME: pickNonEmpty(source.NEXT_PUBLIC_APP_NAME),
    NEXT_PUBLIC_APP_ICON: pickNonEmpty(source.NEXT_PUBLIC_APP_ICON),
    NEXT_PUBLIC_PRICE_MONTHLY_LABEL: pickNonEmpty(source.NEXT_PUBLIC_PRICE_MONTHLY_LABEL),
    NEXT_PUBLIC_PRICE_ANNUAL_LABEL: pickNonEmpty(source.NEXT_PUBLIC_PRICE_ANNUAL_LABEL),
  });

  return {
    ...merged,
    NEXT_PUBLIC_APP_NAME: merged.NEXT_PUBLIC_APP_NAME ?? "MarginFlow",
    NEXT_PUBLIC_APP_ICON: merged.NEXT_PUBLIC_APP_ICON ?? "M",
    NEXT_PUBLIC_PRICE_MONTHLY_LABEL: merged.NEXT_PUBLIC_PRICE_MONTHLY_LABEL ?? "R$ 99",
    NEXT_PUBLIC_PRICE_ANNUAL_LABEL: merged.NEXT_PUBLIC_PRICE_ANNUAL_LABEL ?? "R$ 79",
  };
}

export function getWebEnv(source: Record<string, string | undefined> = process.env) {
  return readPublicEnv(source);
}

export type WebPublicEnv = ReturnType<typeof readPublicEnv>;
