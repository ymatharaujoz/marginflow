import { describe, expect, it } from "vitest";
import { resolveAuthBaseUrl } from "./auth-client";

describe("resolveAuthBaseUrl", () => {
  it("appends the custom auth base path", () => {
    expect(resolveAuthBaseUrl("http://localhost:4000")).toBe("http://localhost:4000/auth");
  });

  it("avoids double slashes when the API base already ends with a slash", () => {
    expect(resolveAuthBaseUrl("http://localhost:4000/")).toBe("http://localhost:4000/auth");
  });
});
