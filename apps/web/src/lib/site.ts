import type { Metadata } from "next";
import { BILLING_PLANS } from "@lucreii/types";
import { readPublicEnv } from "@/lib/env";

/** Canonical URL fallback when `NEXT_PUBLIC_APP_URL` is invalid. */
export const SITE_DOMAIN_FALLBACK = "https://lucreii.vercel.app";

export function resolveSiteConfig(source: Record<string, string | undefined> = process.env) {
  const env = readPublicEnv(source);
  const name = env.NEXT_PUBLIC_APP_NAME;
  return {
    defaultDescription: `${name} Ã© a plataforma de analytics para sellers que querem vender mais e lucrar mais. Centralize mÃ©tricas de Mercado Livre, Shopee, TikTok, Shein em um sÃ³ lugar. TikTok e Shein em breve.`,
    defaultTitle: name,
    domainFallback: SITE_DOMAIN_FALLBACK,
    icon: env.NEXT_PUBLIC_APP_ICON,
    name,
    priceAnnualLabel: env.NEXT_PUBLIC_PRICE_ANNUAL_LABEL,
    priceMonthlyLabel: env.NEXT_PUBLIC_PRICE_MONTHLY_LABEL,
  };
}

/** e.g. `Recursos | MyApp` */
export function sitePageTitle(segment: string, source: Record<string, string | undefined> = process.env) {
  return `${segment} | ${readPublicEnv(source).NEXT_PUBLIC_APP_NAME}`;
}

/** e.g. `MyApp | Tagline for the home page` */
export function brandSeoTitle(tagline: string, source: Record<string, string | undefined> = process.env) {
  return `${readPublicEnv(source).NEXT_PUBLIC_APP_NAME} | ${tagline}`;
}

/** In-page sections on the marketing homepage (`/`). Header/footer use these instead of separate routes. */
export const marketingLandingNav = [
  { sectionId: "recursos", label: "Recursos" },
  { sectionId: "integracoes", label: "IntegraÃ§Ãµes" },
  { sectionId: "depoimentos", label: "Depoimentos" },
  { sectionId: "planos", label: "Planos" },
] as const;

const WHATSAPP_DEFAULT_MESSAGE = "Olá, gostaria de saber mais sobre a plataforma Lucreii.";

/** WhatsApp deep link for "Fale conosco" CTAs. Prefer `NEXT_PUBLIC_WHATSAPP_PHONE` (digits only, e.g. 5511999999999). Falls back to `NEXT_PUBLIC_WHATSAPP_DEMO_URL` if set. */
export function getWhatsappDemoUrl(source: Record<string, string | undefined> = process.env): string | undefined {
  const phone = source.NEXT_PUBLIC_WHATSAPP_PHONE?.trim();
  if (phone && /^\d{10,15}$/.test(phone)) {
    return `https://wa.me/${phone}?text=${encodeURIComponent(WHATSAPP_DEFAULT_MESSAGE)}`;
  }

  const raw = source.NEXT_PUBLIC_WHATSAPP_DEMO_URL;
  return typeof raw === "string" && /^https?:\/\//i.test(raw) ? raw : undefined;
}

export const heroMetrics = [
  { label: "Canais de marketplace em uma visÃ£o", value: "3" },
  { label: "Janelas diÃ¡rias de sincronizaÃ§Ã£o (V1)", value: "3" },
  { label: "Sinais financeiros em destaque", value: "12+" },
];

export const valueCards = [
  {
    body: "Receita, taxas, frete, anÃºncios e custos em um fluxo centrado em finanÃ§as, em vez de dez planilhas.",
    eyebrow: "VisÃ£o unificada",
    title: "Veja a margem real, nÃ£o sÃ³ vendas bonitas.",
  },
  {
    body: "Acompanhe qual SKU, canal e campanha puxam a margem de contribuiÃ§Ã£o antes do caixa evaporar.",
    eyebrow: "Motor de lucratividade",
    title: "Descubra onde vale investir mais.",
  },
  {
    body: "Janelas de sync manuais deixam o V1 simples hoje e abrem espaÃ§o para automaÃ§Ã£o depois, sem rewrite.",
    eyebrow: "OperaÃ§Ã£o enxuta",
    title: "Comece controlado. Escala depois.",
  },
];

export const featureGroups = [
  {
    items: [
      "Dashboard em tempo real com mÃ©tricas de receita, lucro e margem",
      "GestÃ£o de lucro por SKU considerando todos os custos",
      "Analytics avanÃ§ado com grÃ¡ficos e tendÃªncias",
      "Insights com IA para otimizaÃ§Ã£o de preÃ§os",
      "Performance de anÃºncios e ROI por campanha",
      "Comparativos entre marketplaces",
    ],
    title: "Analytics Completo",
  },
  {
    items: [
      "Alertas automÃ¡ticos de margem negativa",
      "RelatÃ³rios executivos em PDF",
      "IntegraÃ§Ã£o com Mercado Livre, Shopee, TikTok e Shein (os dois Ãºltimos em breve)",
      "SincronizaÃ§Ã£o manual em janelas diÃ¡rias",
      "HistÃ³rico completo de vendas e mÃ©tricas",
    ],
    title: "GestÃ£o Profissional",
  },
  {
    items: [
      "Login seguro com e-mail e senha",
      "Acesso protegido por assinatura",
      "API para integraÃ§Ãµes customizadas",
      "Suporte prioritÃ¡rio no plano Growth",
      "Onboarding dedicado no plano Scale",
    ],
    title: "SeguranÃ§a & Suporte",
  },
];

export const integrationHighlights = [
  {
    detail: "ReÃºna pedidos, taxas e contextualizaÃ§Ã£o de SKU num fluxo normalizado.",
    provider: "Mercado Livre",
  },
  {
    detail: "Compare lojas no mesmo modelo financeiro para decisÃµes Ã­ntegras entre canais.",
    provider: "Shopee",
  },
  {
    detail: "IntegraÃ§Ã£o em construÃ§Ã£o. Em breve sincronize pedidos, produtos e mÃ©tricas do TikTok.",
    provider: "TikTok â€” em breve",
  },
  {
    detail: "IntegraÃ§Ã£o em construÃ§Ã£o. Em breve sincronize pedidos, produtos e mÃ©tricas da Shein.",
    provider: "Shein â€” em breve",
  },
  {
    detail: "Sobre custos de produtos, ads e fixos aos dados vindos dos marketplaces.",
    provider: "Inputs manuais",
  },
];

export function getPricingPlans() {
  return BILLING_PLANS.map((plan) => ({
    ...plan,
    ctaHref: "/sign-in",
    ctaLabel: plan.code === "start" ? "Começar gratuitamente" : "Assinar",
  }));
}

export const pricingPlans = getPricingPlans();

export function getPublicRoutes(source: Record<string, string | undefined> = process.env) {
  const name = readPublicEnv(source).NEXT_PUBLIC_APP_NAME;
  return [
    {
      changeFrequency: "weekly" as const,
      description: `${name} â€” visibilidade financeira para marketplaces, preÃ§os e chamada principal.`,
      path: "/",
      priority: 1,
      title: `${name} | Venda mais. Lucre mais.`,
    },


    {
      changeFrequency: "weekly" as const,
      description: "IntegraÃ§Ãµes Mercado Livre, Shopee, TikTok, Shein e entradas manuais de custo. TikTok e Shein em breve.",
      path: "/integrations",
      priority: 0.75,
      title: `IntegraÃ§Ãµes | ${name}`,
    },
  ];
}

export const publicRoutes = getPublicRoutes();

export function getSiteUrl(source: Record<string, string | undefined> = process.env) {
  try {
    return new URL(readPublicEnv(source).NEXT_PUBLIC_APP_URL);
  } catch {
    return new URL(SITE_DOMAIN_FALLBACK);
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
  const siteName = readPublicEnv().NEXT_PUBLIC_APP_NAME;

  return {
    alternates: {
      canonical: url,
    },
    description,
    keywords,
    openGraph: {
      description,
      siteName,
      title,
      type: "website",
      url,
    },
    title,
  };
}
