import { describe, expect, it } from "vitest";
import { buildAbsoluteUrl, createPageMetadata, getSiteUrl, getWhatsappDemoUrl } from "@/lib/site";

describe("site helpers", () => {
  it("uses public app url when available", () => {
    const siteUrl = getSiteUrl({
      NEXT_PUBLIC_API_BASE_URL: "http://localhost:4000",
      NEXT_PUBLIC_APP_URL: "https://app.lucreii.test",
    });

    expect(siteUrl.toString()).toBe("https://app.lucreii.test/");
  });

  it("falls back to localhost when env missing outside production", () => {
    const siteUrl = getSiteUrl({});

    expect(siteUrl.toString()).toBe("http://localhost:3000/");
  });

  it("builds canonical metadata", () => {
    const metadata = createPageMetadata({
      description: "Profit clarity for marketplace operators.",
      path: "/",
      title: "Lucreii | Venda mais. Lucre mais.",
    });

    expect(metadata.alternates?.canonical).toBe("http://localhost:3000/");
    expect(metadata.openGraph).toEqual(
      expect.objectContaining({
        siteName: "Lucreii",
        title: "Lucreii | Venda mais. Lucre mais.",
        url: "http://localhost:3000/",
      }),
    );
  });

  it("builds absolute urls from route paths", () => {
    expect(buildAbsoluteUrl("/integrations")).toBe("http://localhost:3000/integrations");
  });

  it("builds whatsapp link from phone env with encoded default message", () => {
    const url = getWhatsappDemoUrl({
      NEXT_PUBLIC_WHATSAPP_PHONE: "5511999999999",
    });

    expect(url).toBe(
      "https://wa.me/5511999999999?text=Ol%C3%A1%2C%20gostaria%20de%20saber%20mais%20sobre%20a%20plataforma%20Lucreii.",
    );
  });

  it("falls back to legacy whatsapp demo url when phone is not set", () => {
    const url = getWhatsappDemoUrl({
      NEXT_PUBLIC_WHATSAPP_DEMO_URL: "https://wa.me/5511888888888?text=legacy",
    });

    expect(url).toBe("https://wa.me/5511888888888?text=legacy");
  });

  it("returns undefined when no whatsapp env is set", () => {
    expect(getWhatsappDemoUrl({})).toBeUndefined();
  });

  it("ignores invalid whatsapp phone values", () => {
    expect(getWhatsappDemoUrl({ NEXT_PUBLIC_WHATSAPP_PHONE: "+55 11 99999-9999" })).toBeUndefined();
  });
});
