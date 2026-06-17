"use client";

import { getClientPublicEnv } from "@/lib/env";

type AuthApiEnvelope<T> = {
  data: T | null;
  error: {
    message?: string;
  } | null;
};

type AuthClientResult<T> = Promise<{
  data: T | null;
  error: {
    message: string;
  } | null;
}>;

export function resolveAuthBaseUrl(apiBaseUrl: string) {
  const trimmedBaseUrl = apiBaseUrl.replace(/\/+$/, "");
  return `${trimmedBaseUrl}/auth`;
}

export function buildWebAuthCompleteUrl(appBaseUrl: string, ticket: string, callbackURL: string) {
  const trimmedBaseUrl = appBaseUrl.replace(/\/+$/, "");
  const searchParams = new URLSearchParams({ ticket, next: toNextPath(callbackURL) });
  return `${trimmedBaseUrl}/auth/complete?${searchParams.toString()}`;
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

async function postAuth<T>(path: string, body?: unknown): AuthClientResult<T> {
  const response = await fetch(`${baseURL}/${path}`, {
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });

  const payload = (await response.json().catch(() => null)) as AuthApiEnvelope<T> | null;

  if (!response.ok) {
    return {
      data: null,
      error: {
        message: payload?.error?.message ?? "Authentication request failed.",
      },
    };
  }

  return {
    data: payload?.data ?? null,
    error: null,
  };
}

export const authClient = {
  signIn: {
    email(input: {
      email: string;
      password: string;
      rememberMe?: boolean;
    }) {
      return postAuth<{ sessionId: string; ticket: string }>("sign-in", {
        email: input.email,
        password: input.password,
      });
    },
  },
  signOut() {
    return postAuth<{ success: boolean }>("sign-out");
  },
  signUp: {
    email(input: {
      email: string;
      name: string;
      password: string;
    }) {
      return postAuth<{ sessionId: string; ticket: string }>("sign-up", input);
    },
  },
};
