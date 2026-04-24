import { describe, expect, it } from "vitest";
import { buildAbsoluteUrl, createPageMetadata, getSiteUrl } from "@/lib/site";

describe("site helpers", () => {
  it("uses public app url when available", () => {
    const siteUrl = getSiteUrl({
      NEXT_PUBLIC_API_BASE_URL: "http://localhost:4000",
      NEXT_PUBLIC_APP_URL: "https://app.marginflow.test",
    });

    expect(siteUrl.toString()).toBe("https://app.marginflow.test/");
  });

  it("falls back to default domain when env missing", () => {
    const siteUrl = getSiteUrl({});

    expect(siteUrl.toString()).toBe("https://marginflow.vercel.app/");
  });

  it("builds canonical metadata", () => {
    const metadata = createPageMetadata({
      description: "Profit clarity for marketplace operators.",
      path: "/pricing",
      title: "Pricing | MarginFlow",
    });

    expect(metadata.alternates?.canonical).toBe("https://marginflow.vercel.app/pricing");
    expect(metadata.openGraph).toEqual(
      expect.objectContaining({
        title: "Pricing | MarginFlow",
        url: "https://marginflow.vercel.app/pricing",
      }),
    );
  });

  it("builds absolute urls from route paths", () => {
    expect(buildAbsoluteUrl("/integrations")).toBe("https://marginflow.vercel.app/integrations");
  });
});
