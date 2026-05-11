import { headers } from "next/headers";
import type { AuthState } from "@marginflow/types";
import { authStateApiResponseSchema } from "@marginflow/validation";
import { getWebEnv } from "@/lib/env";
import { parseApiContract } from "@/lib/api/contract";

export type ServerAuthState = AuthState;

export async function readServerAuthState(): Promise<ServerAuthState | null> {
  const headerStore = await headers();
  const cookie = headerStore.get("cookie");

  const response = await fetch(`${getWebEnv().NEXT_PUBLIC_API_BASE_URL}/auth-state/me`, {
    cache: "no-store",
    headers: cookie
      ? {
          cookie,
        }
      : undefined,
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    const errorBody = await response.text();

    throw new Error(
      `Auth state request failed with status ${response.status}.${errorBody ? ` ${errorBody}` : ""}`,
    );
  }

  const payload = await response.json();

  return parseApiContract("/auth-state/me", payload, authStateApiResponseSchema).data;
}
