import { createHmac, timingSafeEqual } from "node:crypto";
import type { AuthState } from "@marginflow/types";

export const WEB_AUTH_SESSION_COOKIE_NAME = "marginflow.web_session";

export type WebAuthSessionPayload = {
  authState: AuthState;
  remoteSessionToken: string;
};

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createSignedWebAuthSession(
  payload: WebAuthSessionPayload,
  secret: string,
) {
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = sign(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

export function readSignedWebAuthSession(
  value: string,
  secret: string,
): WebAuthSessionPayload {
  const [encodedPayload, signature] = value.split(".");

  if (!encodedPayload || !signature) {
    throw new Error("Invalid web auth session.");
  }

  const expectedSignature = sign(encodedPayload, secret);
  const isValid = timingSafeEqual(
    Buffer.from(signature, "utf8"),
    Buffer.from(expectedSignature, "utf8"),
  );

  if (!isValid) {
    throw new Error("Invalid web auth session.");
  }

  return JSON.parse(fromBase64Url(encodedPayload)) as WebAuthSessionPayload;
}

export function buildRemoteAuthCookieHeader(remoteSessionToken: string) {
  return `marginflow_api_session=${remoteSessionToken}`;
}

export function getWebSessionSecret(source: Record<string, string | undefined> = process.env) {
  const explicitSecret = source.WEB_SESSION_SECRET?.trim();
  if (explicitSecret) {
    return explicitSecret;
  }

  const authSessionSecret = source.AUTH_SESSION_SECRET?.trim();
  if (authSessionSecret) {
    return authSessionSecret;
  }

  const fallbackSecret = source.BETTER_AUTH_SECRET?.trim();
  if (fallbackSecret) {
    return fallbackSecret;
  }

  if ((source.NODE_ENV ?? process.env.NODE_ENV) === "production") {
    throw new Error(
      "Missing web session secret. Set WEB_SESSION_SECRET (preferred) or BETTER_AUTH_SECRET in the Vercel project.",
    );
  }

  return "marginflow-web-session-dev-secret";
}
