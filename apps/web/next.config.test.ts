import { describe, expect, it } from "vitest";
import nextConfig from "./next.config";

describe("next.config", () => {
  it("does not add a Vercel rewrite for API auth flow", async () => {
    expect(nextConfig.rewrites).toBeUndefined();
  });

  it("allows secure Mercado Livre product images", () => {
    expect(nextConfig.images?.remotePatterns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          hostname: "**.mlstatic.com",
          protocol: "https",
        }),
      ]),
    );
  });
});
