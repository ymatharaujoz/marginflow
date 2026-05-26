import { fromNodeHeaders } from "better-auth/node";
import type { FastifyReply, FastifyRequest } from "fastify";

type BetterAuthHandler = {
  handler: (request: Request) => Promise<Response>;
};

const OAUTH_START_FAILURE_CODE = "oauth_start_failed";

function readHeaderValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getSetCookieHeaders(response: Response) {
  const headers = response.headers as Headers & {
    getSetCookie?: () => string[];
  };

  const setCookieValues = headers.getSetCookie?.();
  if (setCookieValues && setCookieValues.length > 0) {
    return setCookieValues;
  }

  const singleValue = response.headers.get("set-cookie");
  return singleValue ? [singleValue] : [];
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

export function buildBetterAuthFinalizeUrl({
  nextPath,
  request,
}: {
  nextPath: string;
  request: FastifyRequest;
}) {
  const finalizeUrl = new URL("/auth/finalize", buildAbsoluteRequestUrl(request).origin);

  finalizeUrl.searchParams.set("next", sanitizeNextPath(nextPath));
  return finalizeUrl.toString();
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

export function readBetterAuthSessionTokenFromCookieHeader(cookieHeader: string | string[] | undefined) {
  const rawCookieHeader = readHeaderValue(cookieHeader);

  if (!rawCookieHeader) {
    return null;
  }

  const match = rawCookieHeader.match(/(?:^|;\s*)(?:__Secure-)?better-auth\.session_token=([^;]+)/i);
  return match?.[1] ?? null;
}

export function buildAbsoluteRequestUrl(request: FastifyRequest) {
  const host = readHeaderValue(request.headers["x-forwarded-host"]) ?? request.headers.host ?? "localhost";
  const protocol =
    readHeaderValue(request.headers["x-forwarded-proto"]) ?? request.protocol ?? "http";

  return new URL(request.url, `${protocol}://${host}`);
}

export function applyBetterAuthResponse(reply: FastifyReply, response: Response) {
  reply.status(response.status);

  const setCookieHeaders = getSetCookieHeaders(response);
  if (setCookieHeaders.length > 0) {
    reply.raw.setHeader("set-cookie", setCookieHeaders);
  }

  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      return;
    }

    reply.header(key, value);
  });
}

export async function proxyBetterAuthResponse(reply: FastifyReply, response: Response) {
  applyBetterAuthResponse(reply, response);
  return reply.send(response.body ? await response.text() : null);
}

export async function startBetterAuthSocialSignIn({
  auth,
  nextPath,
  provider,
  reply,
  request,
  webAppOrigin,
}: {
  auth: BetterAuthHandler;
  nextPath?: string;
  provider: string;
  reply: FastifyReply;
  request: FastifyRequest;
  webAppOrigin: string;
}) {
  const authUrl = new URL("/auth/sign-in/social", buildAbsoluteRequestUrl(request).origin);
  const headers = fromNodeHeaders(request.headers);
  headers.set("content-type", "application/json");

  const authRequest = new Request(authUrl.toString(), {
    method: "POST",
    headers,
    body: JSON.stringify({
      provider,
      callbackURL: buildBetterAuthFinalizeUrl({
        nextPath: sanitizeNextPath(nextPath),
        request,
      }),
    }),
  });

  const response = await auth.handler(authRequest);
  const location = response.headers.get("location");

  if (!location) {
    const fallbackUrl = new URL("/sign-in", webAppOrigin);
    fallbackUrl.searchParams.set("auth_error", OAUTH_START_FAILURE_CODE);
    reply.status(302);
    reply.header("location", fallbackUrl.toString());
    return reply.send();
  }

  applyBetterAuthResponse(reply, response);
  reply.status(302);
  reply.header("location", location);
  return reply.send();
}
