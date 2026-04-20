import { validateClientEnv, type ClientEnv } from "@marginflow/validation/env";

export function readPublicEnv(
  source: Record<string, string | undefined> = process.env,
): ClientEnv {
  return validateClientEnv({
    NEXT_PUBLIC_APP_URL: source.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_API_BASE_URL: source.NEXT_PUBLIC_API_BASE_URL,
  });
}

export function getWebEnv(source: Record<string, string | undefined> = process.env): ClientEnv {
  return readPublicEnv(source);
}
