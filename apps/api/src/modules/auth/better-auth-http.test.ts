import { describe, expect, it } from "vitest";
import {
  buildBetterAuthFinalizeUrl,
  buildWebAuthCompleteRedirectUrl,
  readBetterAuthSessionTokenFromCookieHeader,
} from "./better-auth-http";

describe("buildBetterAuthFinalizeUrl", () => {
  it("routes Better Auth back to a first-party Railway finalize endpoint", () => {
    expect(
      buildBetterAuthFinalizeUrl({
        nextPath: "/app",
        request: {
          headers: {
            host: "marginflow-production.up.railway.app",
            "x-forwarded-proto": "https",
          },
          protocol: "https",
          url: "/auth/start/google?next=%2Fapp",
        } as never,
      }),
    ).toBe("https://marginflow-production.up.railway.app/auth/finalize?next=%2Fapp");
  });
});

describe("buildWebAuthCompleteRedirectUrl", () => {
  it("rewrites successful finalize redirects to the Vercel auth completion route", () => {
    expect(
      buildWebAuthCompleteRedirectUrl({
        nextPath: "/app",
        ticket: "ticket_123",
        webAppOrigin: "https://marginflow-web.vercel.app",
      }),
    ).toBe(
      "https://marginflow-web.vercel.app/auth/complete?ticket=ticket_123&next=%2Fapp",
    );
  });
});

describe("readBetterAuthSessionTokenFromCookieHeader", () => {
  it("extracts the Better Auth session token from the browser cookie header", () => {
    expect(
      readBetterAuthSessionTokenFromCookieHeader(
        "foo=bar; __Secure-better-auth.session_token=token_123; another=value",
      ),
    ).toBe("token_123");
  });
});
