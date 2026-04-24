import type { Metadata } from "next";
import { readPublicEnv } from "@/lib/env";

export const siteConfig = {
  defaultDescription:
    "MarginFlow gives marketplace sellers one command center for revenue, fees, costs, and true profit clarity.",
  defaultTitle: "MarginFlow",
  domainFallback: "https://marginflow.vercel.app",
  name: "MarginFlow",
};

/** In-page sections on the marketing homepage (`/`). Header/footer use these instead of separate routes. */
export const marketingLandingNav = [
  { sectionId: "recursos", label: "Recursos" },
  { sectionId: "planos", label: "Planos" },
] as const;

export const heroMetrics = [
  { label: "Marketplace channels in one view", value: "3" },
  { label: "Daily sync windows for V1", value: "3" },
  { label: "Finance signals shown at a glance", value: "12+" },
];

export const valueCards = [
  {
    body: "Revenue, fees, shipping, ads, and costs land in one finance-first workspace instead of ten spreadsheets.",
    eyebrow: "Unified visibility",
    title: "See margin truth, not vanity sales.",
  },
  {
    body: "Track which SKU, channel, and campaign drive contribution margin before cash disappears silently.",
    eyebrow: "Profitability engine",
    title: "Find what deserves more budget.",
  },
  {
    body: "Manual sync windows keep V1 operationally simple now while preserving clean seams for future automation.",
    eyebrow: "Lean operations",
    title: "Start controlled. Scale later without rewrite.",
  },
];

export const featureGroups = [
  {
    items: [
      "Marketplace revenue, fees, shipping, ads, and manual costs in one model",
      "Product-level and channel-level profitability views",
      "Recent sync status with clear availability messaging",
    ],
    title: "Financial command center",
  },
  {
    items: [
      "Google sign-in with organization-scoped access",
      "Protected app routes and entitlement-aware app entry",
      "Shared TypeScript contracts across frontend, backend, and schema",
    ],
    title: "Strong operational baseline",
  },
  {
    items: [
      "SEO-ready public site on Next.js",
      "NestJS API boundary for auth, billing, and sync orchestration",
      "Drizzle-backed Postgres schema prepared for growth",
    ],
    title: "Built for real product evolution",
  },
];

export const integrationHighlights = [
  {
    detail: "Bring order history, fee signals, and product context into one normalized workflow.",
    provider: "Mercado Livre",
  },
  {
    detail: "Mirror store performance with same finance model so comparisons stay honest.",
    provider: "Shopee",
  },
  {
    detail: "Layer manual product costs, ad spend, and expenses on top of marketplace data.",
    provider: "Manual inputs",
  },
];

export const pricingPlans = [
  {
    annualPrice: "$79",
    annualSuffix: "/month billed annually",
    ctaHref: "/sign-in",
    ctaLabel: "Start annual plan",
    description:
      "For operators who want steady weekly decision support and lower yearly cost.",
    features: [
      "One workspace with team-ready organization model",
      "Mercado Livre and Shopee finance visibility",
      "Manual sync windows with history tracking",
      "Subscription-gated app access and billing mirror",
    ],
    monthlyPrice: "$99",
    monthlySuffix: "/month",
    name: "Growth",
  },
  {
    annualPrice: "Custom",
    annualSuffix: "multi-store setup",
    ctaHref: "/sign-in",
    ctaLabel: "Talk through rollout",
    description:
      "For brands preparing deeper operational reviews, launch support, and rollout planning.",
    features: [
      "Everything in Growth",
      "Priority onboarding for finance setup",
      "Support for multi-channel operating reviews",
      "Launch planning for future automation phases",
    ],
    monthlyPrice: "Custom",
    monthlySuffix: "tailored scope",
    name: "Scale",
  },
];

export const publicRoutes = [
  {
    changeFrequency: "weekly" as const,
    description:
      "MarginFlow homepage for marketplace finance visibility, pricing overview, and clear CTA.",
    path: "/",
    priority: 1,
    title: "MarginFlow | Financial clarity for marketplace sellers",
  },
  {
    changeFrequency: "weekly" as const,
    description: "Feature overview for dashboards, sync control, and profitability analytics.",
    path: "/features",
    priority: 0.8,
    title: "Features | MarginFlow",
  },
  {
    changeFrequency: "weekly" as const,
    description: "Pricing options for MarginFlow monthly and annual subscription plans.",
    path: "/pricing",
    priority: 0.8,
    title: "Pricing | MarginFlow",
  },
  {
    changeFrequency: "weekly" as const,
    description: "Marketplace integration overview for Mercado Livre, Shopee, and manual cost inputs.",
    path: "/integrations",
    priority: 0.75,
    title: "Integrations | MarginFlow",
  },
];

export function getSiteUrl(source: Record<string, string | undefined> = process.env) {
  try {
    return new URL(readPublicEnv(source).NEXT_PUBLIC_APP_URL);
  } catch {
    return new URL(siteConfig.domainFallback);
  }
}

export function buildAbsoluteUrl(path: string, source: Record<string, string | undefined> = process.env) {
  return new URL(path, getSiteUrl(source)).toString();
}

type MetadataInput = {
  description: string;
  keywords?: string[];
  path: string;
  title: string;
};

export function createPageMetadata({ description, keywords, path, title }: MetadataInput): Metadata {
  const url = buildAbsoluteUrl(path);

  return {
    alternates: {
      canonical: url,
    },
    description,
    keywords,
    openGraph: {
      description,
      siteName: siteConfig.name,
      title,
      type: "website",
      url,
    },
    title,
  };
}
