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
    expect(buildGoogleAuthStartUrl("https://marginflow-production.up.railway.app", "https://marginflow-web.vercel.app/app")).toBe(
      "https://marginflow-production.up.railway.app/auth/start/google?next=%2Fapp",
    );
  });
});
