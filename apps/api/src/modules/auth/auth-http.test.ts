import { describe, expect, it } from "vitest";
import {
  buildClearApiSessionCookie,
  buildSetApiSessionCookie,
  resolveApiSessionCookiePolicy,
} from "./auth-http";

describe("auth session cookies", () => {
  it("forces SameSite=None and Secure in production", () => {
    const policy = resolveApiSessionCookiePolicy({ nodeEnv: "production" });
    const cookie = buildSetApiSessionCookie({
      expiresAt: new Date("2099-12-31T00:00:00.000Z"),
      secure: policy.secure,
      sessionToken: "session_token_123",
      sameSite: policy.sameSite,
    });

    expect(cookie).toContain("SameSite=None");
    expect(cookie).toContain("Secure");
  });

  it("keeps SameSite=Lax without Secure outside production", () => {
    const policy = resolveApiSessionCookiePolicy({ nodeEnv: "development" });
    const cookie = buildSetApiSessionCookie({
      expiresAt: new Date("2099-12-31T00:00:00.000Z"),
      secure: policy.secure,
      sessionToken: "session_token_123",
      sameSite: policy.sameSite,
    });

    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).not.toContain("Secure");
  });

  it("clears production cookies with SameSite=None and Secure", () => {
    const policy = resolveApiSessionCookiePolicy({ nodeEnv: "production" });
    const cookie = buildClearApiSessionCookie(policy);

    expect(cookie).toContain("SameSite=None");
    expect(cookie).toContain("Secure");
  });

  it("can still infer secure cookies from HTTPS requests outside production", () => {
    const policy = resolveApiSessionCookiePolicy({ isHttps: true, nodeEnv: "test" });

    expect(policy).toEqual({
      sameSite: "None",
      secure: true,
    });
  });
});
