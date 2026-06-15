import { describe, expect, it } from "vitest";
import type { AuthState } from "@lucreii/types";
import {
  buildRemoteAuthCookieHeader,
  createSignedWebAuthSession,
  readSignedWebAuthSession,
} from "./web-auth-session";

const authState: AuthState = {
  onboardingStatus: "complete",
  organization: {
    id: "org_123",
    name: "Lucreii",
    role: "owner",
    slug: "lucreii",
  },
  session: {
    expiresAt: "2026-12-31T00:00:00.000Z",
    id: "session_123",
  },
  user: {
    email: "owner@lucreii.local",
    emailVerified: true,
    id: "user_123",
    image: null,
    name: "Mateus",
  },
};

describe("web auth session", () => {
  it("round-trips signed web auth session payload", () => {
    const value = createSignedWebAuthSession(
      {
        authState,
        remoteSessionToken: "remote_session_token_123",
      },
      "web-session-secret",
    );

    expect(readSignedWebAuthSession(value, "web-session-secret")).toEqual({
      authState,
      remoteSessionToken: "remote_session_token_123",
    });
  });

  it("builds the internal api auth cookie header from mirrored session token", () => {
    expect(buildRemoteAuthCookieHeader("remote_session_token_123")).toBe(
      "lucreii_api_session=remote_session_token_123",
    );
  });
});
