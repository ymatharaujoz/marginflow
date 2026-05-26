import { describe, expect, it } from "vitest";
import { buildGoogleAuthStartUrl, resolveAuthBaseUrl } from "./auth-client";

describe("resolveAuthBaseUrl", () => {
  it("appends the custom auth base path", () => {
    expect(resolveAuthBaseUrl("http://localhost:4000")).toBe("http://localhost:4000/auth");
  });

  it("avoids double slashes when the API base already ends with a slash", () => {
    expect(resolveAuthBaseUrl("http://localhost:4000/")).toBe("http://localhost:4000/auth");
  });
});

describe("buildGoogleAuthStartUrl", () => {
  it("builds the first-party auth start route with the callback URL", () => {
    expect(buildGoogleAuthStartUrl("https://marginflow-web.vercel.app/api", "https://marginflow-web.vercel.app/app")).toBe(
      "https://marginflow-web.vercel.app/api/auth/start/google?callbackURL=https%3A%2F%2Fmarginflow-web.vercel.app%2Fapp",
    );
  });
});
