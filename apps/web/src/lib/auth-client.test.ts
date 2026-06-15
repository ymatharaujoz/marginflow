import { describe, expect, it } from "vitest";
import {
  buildAuthFinalizeUrl,
  resolveAuthBaseUrl,
} from "./auth-client";

describe("resolveAuthBaseUrl", () => {
  it("appends the custom auth base path", () => {
    expect(resolveAuthBaseUrl("http://localhost:4000")).toBe("http://localhost:4000/auth");
  });

  it("avoids double slashes when the API base already ends with a slash", () => {
    expect(resolveAuthBaseUrl("http://localhost:4000/")).toBe("http://localhost:4000/auth");
  });
});

describe("buildAuthFinalizeUrl", () => {
  it("builds auth finalize route with sanitized next path", () => {
    expect(buildAuthFinalizeUrl("https://marginflow-production.up.railway.app", "https://marginflow-web.vercel.app/app")).toBe(
      "https://marginflow-production.up.railway.app/auth/finalize?next=%2Fapp",
    );
  });
});
