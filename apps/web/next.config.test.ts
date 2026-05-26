import { describe, expect, it } from "vitest";
import nextConfig from "./next.config";

describe("next.config", () => {
  it("proxies public /api requests to the configured upstream API base URL", async () => {
    const rewrites = await nextConfig.rewrites?.();

    expect(rewrites).toEqual([
      {
        destination: "https://marginflow-production.up.railway.app/:path*",
        source: "/api/:path*",
      },
    ]);
  });
});
