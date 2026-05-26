"use client";

import { createAuthClient } from "better-auth/react";
import { getClientPublicEnv } from "@/lib/env";

export function resolveAuthBaseUrl(apiBaseUrl: string) {
  const trimmedBaseUrl = apiBaseUrl.replace(/\/+$/, "");
  return `${trimmedBaseUrl}/auth`;
}

export function buildGoogleAuthStartUrl(apiBaseUrl: string, callbackURL: string) {
  const trimmedBaseUrl = apiBaseUrl.replace(/\/+$/, "");
  const searchParams = new URLSearchParams({ next: toNextPath(callbackURL) });
  return `${trimmedBaseUrl}/auth/start/google?${searchParams.toString()}`;
}

function toNextPath(callbackURL: string) {
  try {
    const url = new URL(callbackURL);
    const nextPath = `${url.pathname}${url.search}`;

    if (nextPath.startsWith("//")) {
      return "/app";
    }

    return nextPath.startsWith("/") ? nextPath : "/app";
  } catch {
    if (callbackURL.startsWith("/") && !callbackURL.startsWith("//")) {
      return callbackURL;
    }

    return "/app";
  }
}

const baseURL = resolveAuthBaseUrl(getClientPublicEnv().NEXT_PUBLIC_API_BASE_URL);

export const authClient = createAuthClient({
  baseURL,
  fetchOptions: {
    credentials: "include",
  },
});

export const { signIn, signOut, useSession } = authClient;

export type WebSession = typeof authClient.$Infer.Session;
