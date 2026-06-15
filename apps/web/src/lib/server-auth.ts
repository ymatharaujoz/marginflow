import type { AuthState } from "@lucreii/types";
import { authStateApiResponseSchema } from "@lucreii/validation";
import { getWebEnv } from "@/lib/env";
import { parseApiContract } from "@/lib/api/contract";
import { buildRemoteAuthHeaders, readServerWebAuthSession } from "@/lib/server-session";

export type ServerAuthState = AuthState;
type ReadServerAuthStateOptions = {
  mode?: "strict" | "soft";
};

function logSoftAuthStateFailure(details: {
  body?: string;
  contentType?: string | null;
  endpoint: string;
  error: unknown;
  status?: number;
}) {
  console.error("[lucreii/web] Auth state request failed in soft mode.", {
    bodyPreview: details.body?.slice(0, 200),
    contentType: details.contentType ?? null,
    endpoint: details.endpoint,
    error: details.error instanceof Error ? details.error.message : String(details.error),
    status: details.status ?? null,
  });
}

export async function readServerAuthState(
  options: ReadServerAuthStateOptions = {},
): Promise<ServerAuthState | null> {
  const mode = options.mode ?? "strict";
  const webSession = await readServerWebAuthSession();

  if (!webSession) {
    return null;
  }

  const endpoint = `${getWebEnv().NEXT_PUBLIC_API_BASE_URL}/auth-state/me`;

  const response = await fetch(endpoint, {
    cache: "no-store",
    headers: buildRemoteAuthHeaders(webSession.remoteSessionToken),
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    const errorBody = await response.text();
    const error = new Error(
      `Auth state request failed with status ${response.status}.${errorBody ? ` ${errorBody}` : ""}`,
    );

    if (mode === "soft") {
      logSoftAuthStateFailure({
        body: errorBody,
        contentType: response.headers.get("content-type"),
        endpoint,
        error,
        status: response.status,
      });
      return webSession.authState;
    }

    throw error;
  }

  try {
    const payload = await response.json();

    return parseApiContract("/auth-state/me", payload, authStateApiResponseSchema).data;
  } catch (error) {
    if (mode === "soft") {
      logSoftAuthStateFailure({
        contentType: response.headers.get("content-type"),
        endpoint,
        error,
        status: response.status,
      });
      return webSession.authState;
    }

    throw error;
  }
}
