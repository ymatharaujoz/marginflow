import type { Metadata } from "next";
import { readPublicEnv } from "@/lib/env";

/** Canonical URL fallback when `NEXT_PUBLIC_APP_URL` is invalid. */
export const SITE_DOMAIN_FALLBACK = "https://marginflow.vercel.app";

export function resolveSiteConfig(source: Record<string, string | undefined> = process.env) {
  const env = readPublicEnv(source);
  const name = env.NEXT_PUBLIC_APP_NAME;
  return {
    defaultDescription: `${name} é a plataforma de analytics para sellers que querem vender mais e lucrar mais. Centralize métricas de Mercado Livre, Shopee e Amazon em um só lugar.`,
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
  { sectionId: "planos", label: "Planos" },
] as const;

/** WhatsApp deep link for demo CTAs. Set `NEXT_PUBLIC_WHATSAPP_DEMO_URL` (e.g. `https://wa.me/5511…`). */
export function getWhatsappDemoUrl(source: Record<string, string | undefined> = process.env): string | undefined {
  const raw = source.NEXT_PUBLIC_WHATSAPP_DEMO_URL;
  return typeof raw === "string" && /^https?:\/\//i.test(raw) ? raw : undefined;
}

export const heroMetrics = [
  { label: "Canais de marketplace em uma visão", value: "3" },
  { label: "Janelas diárias de sincronização (V1)", value: "3" },
  { label: "Sinais financeiros em destaque", value: "12+" },
];

export const valueCards = [
  {
    body: "Receita, taxas, frete, anúncios e custos em um fluxo centrado em finanças, em vez de dez planilhas.",
    eyebrow: "Visão unificada",
    title: "Veja a margem real, não só vendas bonitas.",
  },
  {
    body: "Acompanhe qual SKU, canal e campanha puxam a margem de contribuição antes do caixa evaporar.",
    eyebrow: "Motor de lucratividade",
    title: "Descubra onde vale investir mais.",
  },
  {
    body: "Janelas de sync manuais deixam o V1 simples hoje e abrem espaço para automação depois, sem rewrite.",
    eyebrow: "Operação enxuta",
    title: "Comece controlado. Escala depois.",
  },
];

export const featureGroups = [
  {
    items: [
      "Dashboard em tempo real com métricas de receita, lucro e margem",
      "Gestão de lucro por SKU considerando todos os custos",
      "Analytics avançado com gráficos e tendências",
      "Insights com IA para otimização de preços",
      "Performance de anúncios e ROI por campanha",
      "Comparativos entre marketplaces",
    ],
    title: "Analytics Completo",
  },
  {
    items: [
      "Alertas automáticos de margem negativa",
      "Relatórios executivos em PDF",
      "Integração com Mercado Livre, Shopee e Amazon",
      "Sincronização manual em janelas diárias",
      "Histórico completo de vendas e métricas",
    ],
    title: "Gestão Profissional",
  },
  {
    items: [
      "Login seguro com Google",
      "Acesso protegido por assinatura",
      "API para integrações customizadas",
      "Suporte prioritário no plano Growth",
      "Onboarding dedicado no plano Scale",
    ],
    title: "Segurança & Suporte",
  },
];

export const integrationHighlights = [
  {
    detail: "Reúna pedidos, taxas e contextualização de SKU num fluxo normalizado.",
    provider: "Mercado Livre",
  },
  {
    detail: "Compare lojas no mesmo modelo financeiro para decisões íntegras entre canais.",
    provider: "Shopee",
  },
  {
    detail: "Sobre custos de produtos, ads e fixos aos dados vindos dos marketplaces.",
    provider: "Inputs manuais",
  },
];

const pricingPlansTemplate = [
  {
    annualPrice: "R$ 63",
    annualSuffix: "/mês cobrado anualmente",
    ctaHref: "/sign-in",
    ctaLabel: "Começar Gratuitamente",
    description: "Para operações que precisam de ritmo semanal de decisão e custo anual menor.",
    features: [
      "Produtos ilimitados",
      "Múltiplos marketplaces",
      "Dashboard em tempo real",
      "Analytics avançado",
      "Insights com IA",
      "Suporte prioritário",
    ],
    monthlyPrice: "R$ 79",
    monthlySuffix: "/mês",
    name: "Crescimento",
  },
  {
    annualPrice: "Sob consulta",
    annualSuffix: "escopo customizado",
    ctaHref: "/sign-in",
    ctaLabel: "Falar com Vendas",
    description: "Para marcas com onboarding mais denso, governança e planejamento de expansão.",
    features: [
      "Tudo do plano Crescimento",
      "API access",
      "Onboarding dedicado",
      "Relatórios customizados",
      "SLA garantido",
      "Gerente de conta",
    ],
    monthlyPrice: "Sob consulta",
    monthlySuffix: "escopo customizado",
    name: "Escala",
  },
] as const;

export function getPricingPlans(source: Record<string, string | undefined> = process.env) {
  const env = readPublicEnv(source);
  const [growth, scale] = pricingPlansTemplate;
  return [
    {
      ...growth,
      annualPrice: env.NEXT_PUBLIC_PRICE_ANNUAL_LABEL || growth.annualPrice,
      monthlyPrice: env.NEXT_PUBLIC_PRICE_MONTHLY_LABEL || growth.monthlyPrice,
    },
    { ...scale },
  ];
}

export const pricingPlans = getPricingPlans();

export function getPublicRoutes(source: Record<string, string | undefined> = process.env) {
  const name = readPublicEnv(source).NEXT_PUBLIC_APP_NAME;
  return [
    {
      changeFrequency: "weekly" as const,
      description: `${name} — visibilidade financeira para marketplaces, preços e chamada principal.`,
      path: "/",
      priority: 1,
      title: `${name} | Venda mais. Lucre mais.`,
    },
    {
      changeFrequency: "weekly" as const,
      description: "Panorama das funcionalidades: dashboard, analytics, insights com IA e métricas de lucro.",
      path: "/features",
      priority: 0.8,
      title: `Recursos | ${name}`,
    },
    {
      changeFrequency: "weekly" as const,
      description: `Planos de assinatura ${name} mensal e anual. Comece gratuitamente.`,
      path: "/pricing",
      priority: 0.8,
      title: `Preços | ${name}`,
    },
    {
      changeFrequency: "weekly" as const,
      description: "Integrações Mercado Livre, Shopee, Amazon e entradas manuais de custo.",
      path: "/integrations",
      priority: 0.75,
      title: `Integrações | ${name}`,
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
