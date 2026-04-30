import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { IntegrationProviderSlug } from "@marginflow/types";
import { IntegrationProviderError } from "./integrations.types";

type SignedStatePayload = {
  issuedAt: number;
  nonce: string;
  organizationId: string;
  provider: IntegrationProviderSlug;
};

const STATE_TTL_MS = 15 * 60 * 1000;

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function createSignedIntegrationState(
  input: {
    organizationId: string;
    provider: IntegrationProviderSlug;
  },
  secret: string,
) {
  const payload: SignedStatePayload = {
    issuedAt: Date.now(),
    nonce: randomUUID(),
    organizationId: input.organizationId,
    provider: input.provider,
  };
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = signPayload(encodedPayload, secret);

  return `${encodedPayload}.${signature}`;
}

export function readSignedIntegrationState(
  value: string,
  secret: string,
) {
  const [encodedPayload, providedSignature] = value.split(".");

  if (!encodedPayload || !providedSignature) {
    throw new IntegrationProviderError("Missing integration callback state.", "callback_invalid");
  }

  const expectedSignature = signPayload(encodedPayload, secret);
  const providedBytes = Buffer.from(providedSignature, "utf8");
  const expectedBytes = Buffer.from(expectedSignature, "utf8");

  if (
    providedBytes.length !== expectedBytes.length ||
    !timingSafeEqual(providedBytes, expectedBytes)
  ) {
    throw new IntegrationProviderError("Invalid integration callback state.", "callback_invalid");
  }

  const payload = JSON.parse(fromBase64Url(encodedPayload)) as SignedStatePayload;

  if (Date.now() - payload.issuedAt > STATE_TTL_MS) {
    throw new IntegrationProviderError("Integration callback state expired.", "callback_invalid");
  }

  return payload;
}
