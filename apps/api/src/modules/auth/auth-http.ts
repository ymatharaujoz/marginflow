import { randomBytes } from "node:crypto";
import type { FastifyRequest } from "fastify";

export const API_AUTH_SESSION_COOKIE_NAME = "lucreii_api_session";
export const AUTH_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export type ApiSessionCookieSameSite = "Lax" | "None";
export type ApiSessionCookiePolicy = {
  sameSite: ApiSessionCookieSameSite;
  secure: boolean;
};

function readHeaderValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function decodeCookieValue(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function sanitizeNextPath(input: string | null | undefined) {
  if (!input || !input.startsWith("/")) {
    return "/app";
  }

  if (input.startsWith("//")) {
    return "/app";
  }

  return input;
}

export function buildAbsoluteRequestUrl(request: FastifyRequest) {
  const host = readHeaderValue(request.headers["x-forwarded-host"]) ?? request.headers.host ?? "localhost";
  const protocol =
    readHeaderValue(request.headers["x-forwarded-proto"]) ?? request.protocol ?? "http";

  return new URL(request.url, `${protocol}://${host}`);
}

export function buildWebAuthCompleteRedirectUrl({
  nextPath,
  ticket,
  webAppOrigin,
}: {
  nextPath: string;
  ticket: string;
  webAppOrigin: string;
}) {
  const redirectUrl = new URL("/auth/complete", webAppOrigin);
  redirectUrl.searchParams.set("ticket", ticket);
  redirectUrl.searchParams.set("next", sanitizeNextPath(nextPath));
  return redirectUrl.toString();
}

export function readApiSessionTokenFromCookieHeader(cookieHeader: string | string[] | undefined) {
  const rawCookieHeader = readHeaderValue(cookieHeader);

  if (!rawCookieHeader) {
    return null;
  }

  const match = rawCookieHeader.match(
    new RegExp(`(?:^|;\\s*)${API_AUTH_SESSION_COOKIE_NAME}=([^;]+)`, "i"),
  );

  return match?.[1] ? decodeCookieValue(match[1]) : null;
}

export function buildApiSessionRequestCookieHeader(sessionToken: string) {
  return `${API_AUTH_SESSION_COOKIE_NAME}=${sessionToken}`;
}

export function resolveApiSessionCookiePolicy({
  isHttps = false,
  nodeEnv,
}: {
  isHttps?: boolean;
  nodeEnv?: string;
}): ApiSessionCookiePolicy {
  if (nodeEnv === "production") {
    return {
      sameSite: "None",
      secure: true,
    };
  }

  if (isHttps) {
    return {
      sameSite: "None",
      secure: true,
    };
  }

  return {
    sameSite: "Lax",
    secure: false,
  };
}

export function buildSetApiSessionCookie({
  expiresAt,
  secure,
  sessionToken,
  sameSite,
}: {
  expiresAt: Date;
  secure: boolean;
  sessionToken: string;
  sameSite: ApiSessionCookieSameSite;
}) {
  return [
    `${API_AUTH_SESSION_COOKIE_NAME}=${encodeURIComponent(sessionToken)}`,
    "Path=/",
    "HttpOnly",
    `SameSite=${sameSite}`,
    `Expires=${expiresAt.toUTCString()}`,
    ...(secure ? ["Secure"] : []),
  ].join("; ");
}

export function buildClearApiSessionCookie({ secure, sameSite }: ApiSessionCookiePolicy) {
  return [
    `${API_AUTH_SESSION_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    `SameSite=${sameSite}`,
    "Max-Age=0",
    ...(secure ? ["Secure"] : []),
  ].join("; ");
}

export function createAuthSessionToken() {
  return randomBytes(32).toString("base64url");
}
