"use client";

import { createAuthClient } from "better-auth/react";
import { getWebEnv } from "@/lib/env";

export function resolveAuthBaseUrl(apiBaseUrl: string) {
  const trimmedBaseUrl = apiBaseUrl.replace(/\/+$/, "");
  return `${trimmedBaseUrl}/auth`;
}

const baseURL = resolveAuthBaseUrl(getWebEnv().NEXT_PUBLIC_API_BASE_URL);

export const authClient = createAuthClient({
  baseURL,
  fetchOptions: {
    credentials: "include",
  },
});

export const { signIn, signOut, useSession } = authClient;

export type WebSession = typeof authClient.$Infer.Session;
