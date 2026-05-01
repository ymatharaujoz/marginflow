import { validateClientEnv, type ClientEnv } from "@marginflow/validation/env";

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
export function readPublicEnv(
  source: Record<string, string | undefined> = process.env,
): ClientEnv {
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
  });

  return merged;
}

export function getWebEnv(source: Record<string, string | undefined> = process.env): ClientEnv {
  return readPublicEnv(source);
}
