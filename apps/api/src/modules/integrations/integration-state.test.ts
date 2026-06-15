import { describe, expect, it } from "vitest";
import {
  createSignedIntegrationState,
  readSignedIntegrationState,
} from "./integration-state";

describe("integration-state", () => {
  it("round-trips signed integration callback state", () => {
    const state = createSignedIntegrationState(
      {
        organizationId: "org_123",
        provider: "mercadolivre",
      },
      "secret",
    );

    expect(readSignedIntegrationState(state, "secret")).toEqual(
      expect.objectContaining({
        organizationId: "org_123",
        provider: "mercadolivre",
      }),
    );
  });

  it("rejects state signed with a different secret", () => {
    const state = createSignedIntegrationState(
      {
        organizationId: "org_123",
        provider: "mercadolivre",
      },
      "secret",
    );

    expect(() => readSignedIntegrationState(state, "other-secret")).toThrow(
      "Invalid integration callback state.",
    );
  });

  it("round-trips optional oauth metadata such as PKCE verifier", () => {
    const state = createSignedIntegrationState(
      {
        codeVerifier: "verifier_123",
        organizationId: "org_123",
        provider: "mercadolivre",
      },
      "secret",
    );

    expect(readSignedIntegrationState(state, "secret")).toEqual(
      expect.objectContaining({
        codeVerifier: "verifier_123",
        organizationId: "org_123",
        provider: "mercadolivre",
      }),
    );
  });
});
