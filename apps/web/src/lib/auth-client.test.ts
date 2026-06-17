import { describe, expect, it } from "vitest";
import {
  buildWebAuthCompleteUrl,
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

describe("buildWebAuthCompleteUrl", () => {
  it("builds web auth complete route with sanitized next path and ticket", () => {
    expect(
      buildWebAuthCompleteUrl(
        "https://www.lucreii.com.br",
        "ticket_123_ticket_123",
        "https://marginflow-web.vercel.app/app",
      ),
    ).toBe(
      "https://www.lucreii.com.br/auth/complete?ticket=ticket_123_ticket_123&next=%2Fapp",
    );
  });
});
