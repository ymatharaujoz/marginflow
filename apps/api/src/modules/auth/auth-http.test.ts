import { describe, expect, it } from "vitest";
import { buildClearApiSessionCookie, buildSetApiSessionCookie } from "./auth-http";

describe("auth session cookies", () => {
  it("uses SameSite=None and Secure for HTTPS requests", () => {
    const cookie = buildSetApiSessionCookie({
      expiresAt: new Date("2099-12-31T00:00:00.000Z"),
      secure: true,
      sessionToken: "session_token_123",
    });

    expect(cookie).toContain("SameSite=None");
    expect(cookie).toContain("Secure");
  });

  it("keeps SameSite=Lax without Secure for local HTTP requests", () => {
    const cookie = buildSetApiSessionCookie({
      expiresAt: new Date("2099-12-31T00:00:00.000Z"),
      secure: false,
      sessionToken: "session_token_123",
    });

    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).not.toContain("Secure");
  });

  it("clears HTTPS cookies with SameSite=None and Secure", () => {
    const cookie = buildClearApiSessionCookie({ secure: true });

    expect(cookie).toContain("SameSite=None");
    expect(cookie).toContain("Secure");
  });
});
