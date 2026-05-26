import { fromNodeHeaders } from "better-auth/node";
import type { FastifyReply, FastifyRequest } from "fastify";

type BetterAuthHandler = {
  handler: (request: Request) => Promise<Response>;
};

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
  callbackURL,
  provider,
  reply,
  request,
}: {
  auth: BetterAuthHandler;
  callbackURL?: string;
  provider: string;
  reply: FastifyReply;
  request: FastifyRequest;
}) {
  const authUrl = new URL("/auth/sign-in/social", buildAbsoluteRequestUrl(request).origin);
  const headers = fromNodeHeaders(request.headers);
  headers.set("content-type", "application/json");

  const authRequest = new Request(authUrl.toString(), {
    method: "POST",
    headers,
    body: JSON.stringify({
      provider,
      ...(callbackURL ? { callbackURL } : {}),
    }),
  });

  const response = await auth.handler(authRequest);
  const location = response.headers.get("location");

  if (!location) {
    return proxyBetterAuthResponse(reply, response);
  }

  applyBetterAuthResponse(reply, response);
  reply.status(302);
  reply.header("location", location);
  return reply.send();
}
