import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const host = getSiteUrl().toString();

  return {
    host,
    rules: [
      {
        allow: ["/", "/features", "/pricing", "/integrations"],
        disallow: ["/app", "/sign-in"],
        userAgent: "*",
      },
    ],
    sitemap: `${host}sitemap.xml`,
  };
}
