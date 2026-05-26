import { validateClientEnv } from "@marginflow/validation/env";

/** Same defaults documented in `.env.example` and used in `auth-client.ts`. */
const DEFAULT_PUBLIC_APP_URL = "http://localhost:3000";
const DEFAULT_PUBLIC_API_BASE_URL = "http://localhost:4000";
const REQUIRED_PUBLIC_ENV_KEYS = ["NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_API_BASE_URL"] as const;
let hasLoggedProductionEnvDiagnostic = false;

function pickNonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function extractMissingRequiredPublicEnv(error: unknown): string[] {
  if (!error || typeof error !== "object" || !("issues" in error) || !Array.isArray(error.issues)) {
    return [];
  }

  return error.issues
    .map((issue) => {
      if (!issue || typeof issue !== "object" || !("path" in issue) || !Array.isArray(issue.path)) {
        return undefined;
      }

      const [key] = issue.path;
      if (typeof key !== "string" || !REQUIRED_PUBLIC_ENV_KEYS.includes(key as (typeof REQUIRED_PUBLIC_ENV_KEYS)[number])) {
        return undefined;
      }

      return typeof issue.message === "string" && issue.message.includes("received undefined") ? key : undefined;
    })
    .filter((key): key is string => Boolean(key));
}

function logProductionEnvDiagnostic(source: Record<string, string | undefined>, missingKeys: string[]) {
  if (hasLoggedProductionEnvDiagnostic || typeof window !== "undefined") {
    return;
  }

  hasLoggedProductionEnvDiagnostic = true;
  console.error("[marginflow/web] Missing required public environment variables in production.", {
    missingKeys,
    nodeEnv: source.NODE_ENV ?? process.env.NODE_ENV,
    vercelEnv: pickNonEmpty(source.VERCEL_ENV) ?? pickNonEmpty(process.env.VERCEL_ENV),
    vercelProjectProductionUrl:
      pickNonEmpty(source.VERCEL_PROJECT_PRODUCTION_URL) ?? pickNonEmpty(process.env.VERCEL_PROJECT_PRODUCTION_URL),
    vercelUrl: pickNonEmpty(source.VERCEL_URL) ?? pickNonEmpty(process.env.VERCEL_URL),
    NEXT_PUBLIC_API_BASE_URL: typeof source.NEXT_PUBLIC_API_BASE_URL === "string",
    NEXT_PUBLIC_APP_URL: typeof source.NEXT_PUBLIC_APP_URL === "string",
  });
}

function buildPublicEnvValidationError({
  cause,
  missingKeys,
  nodeEnv,
}: {
  cause: unknown;
  missingKeys: string[];
  nodeEnv: string | undefined;
}) {
  const missingDetail = missingKeys.length > 0 ? ` Missing: ${missingKeys.join(", ")}.` : "";
  const productionGuidance =
    nodeEnv === "production"
      ? " Configure them in Vercel Project Settings > Environment Variables for the active environment and redeploy."
      : "";

  return new Error(`Invalid public environment configuration.${missingDetail}${productionGuidance}`, {
    cause: cause instanceof Error ? cause : undefined,
  });
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

  const candidateEnv = {
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
  };

  try {
    const merged = validateClientEnv(candidateEnv);

    return {
      ...merged,
      NEXT_PUBLIC_APP_NAME: merged.NEXT_PUBLIC_APP_NAME ?? "MarginFlow",
      NEXT_PUBLIC_APP_ICON: merged.NEXT_PUBLIC_APP_ICON ?? "M",
      NEXT_PUBLIC_PRICE_MONTHLY_LABEL: merged.NEXT_PUBLIC_PRICE_MONTHLY_LABEL ?? "R$ 99",
      NEXT_PUBLIC_PRICE_ANNUAL_LABEL: merged.NEXT_PUBLIC_PRICE_ANNUAL_LABEL ?? "R$ 79",
    };
  } catch (error) {
    const missingKeys = extractMissingRequiredPublicEnv(error);
    if (nodeEnv === "production" && missingKeys.length > 0) {
      logProductionEnvDiagnostic(source, missingKeys);
    }

    throw buildPublicEnvValidationError({ cause: error, missingKeys, nodeEnv });
  }
}

export function getWebEnv(source: Record<string, string | undefined> = process.env) {
  return readPublicEnv(source);
}

/**
 * Client-safe helper: use direct `process.env.NEXT_PUBLIC_*` access so Next.js can inline
 * the values into browser bundles during build.
 */
export function getClientPublicEnv() {
  return readPublicEnv({
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_APP_ICON: process.env.NEXT_PUBLIC_APP_ICON,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_PRICE_ANNUAL_LABEL: process.env.NEXT_PUBLIC_PRICE_ANNUAL_LABEL,
    NEXT_PUBLIC_PRICE_MONTHLY_LABEL: process.env.NEXT_PUBLIC_PRICE_MONTHLY_LABEL,
    NEXT_PUBLIC_WHATSAPP_DEMO_URL: process.env.NEXT_PUBLIC_WHATSAPP_DEMO_URL,
  });
}

export function resetPublicEnvDiagnosticsForTests() {
  hasLoggedProductionEnvDiagnostic = false;
}

export type WebPublicEnv = ReturnType<typeof readPublicEnv>;
