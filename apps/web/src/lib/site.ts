import type { Metadata } from "next";
import { readPublicEnv } from "@/lib/env";

export const siteConfig = {
  defaultDescription:
    "MarginFlow centraliza para vendedores de marketplaces faturamento, taxas, custos e lucro real em um só lugar.",
  defaultTitle: "MarginFlow",
  domainFallback: "https://marginflow.vercel.app",
  name: "MarginFlow",
};

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
      "Receita de marketplace, taxas, frete, anúncios e custos manuais num único modelo",
      "Lucro por produto e por canal na mesma leitura",
      "Status da última sincronização com mensagens claras de disponibilidade",
    ],
    title: "Centro financeiro",
  },
  {
    items: [
      "Login Google com escopo por organização",
      "Rotas protegidas e entrada no app com entitlement",
      "Contratos TypeScript compartilhados entre frontend, backend e schema",
    ],
    title: "Base operacional sólida",
  },
  {
    items: [
      "Site público pronto para SEO em Next.js",
      "API NestJS para auth, billing e sincronização",
      "Schema Drizzle evolutivo sobre Postgres",
    ],
    title: "Pronto para evoluir o produto",
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

export const pricingPlans = [
  {
    annualPrice: "US$ 79",
    annualSuffix: "/mês cobrado anualmente",
    ctaHref: "/sign-in",
    ctaLabel: "Começar plano anual",
    description:
      "Para operações que precisam de ritmo semanal de decisão e custo anual menor.",
    features: [
      "Um workspace com modelo organizacional pensado para time",
      "Visão financeira Mercado Livre e Shopee",
      "Sync manual em janelas com histórico",
      "Acesso ao app condicionado à assinatura e espelho de billing",
    ],
    monthlyPrice: "US$ 99",
    monthlySuffix: "/mês",
    name: "Crescimento",
  },
  {
    annualPrice: "Sob consulta",
    annualSuffix: "várias lojas",
    ctaHref: "/sign-in",
    ctaLabel: "Falar sobre implantação",
    description:
      "Para marcas com onboarding mais denso, governança e planejamento de expansão.",
    features: [
      "Tudo do plano Crescimento",
      "Onboarding prioritário financeiro",
      "Apoio a revisões multi-canal",
      "Planejamento das fases de automação",
    ],
    monthlyPrice: "Sob consulta",
    monthlySuffix: "escopo sob medida",
    name: "Escala",
  },
];

export const publicRoutes = [
  {
    changeFrequency: "weekly" as const,
    description:
      "MarginFlow — visibilidade financeira para marketplaces, preços e chamada principal.",
    path: "/",
    priority: 1,
    title: "MarginFlow | Clareza financeira para sellers",
  },
  {
    changeFrequency: "weekly" as const,
    description: "Panorama das funcionalidades: painéis, sync e métricas de lucro.",
    path: "/features",
    priority: 0.8,
    title: "Recursos | MarginFlow",
  },
  {
    changeFrequency: "weekly" as const,
    description: "Planos de assinatura MarginFlow mensal e anual.",
    path: "/pricing",
    priority: 0.8,
    title: "Preços | MarginFlow",
  },
  {
    changeFrequency: "weekly" as const,
    description: "Integrações Mercado Livre, Shopee e entradas manuais de custo.",
    path: "/integrations",
    priority: 0.75,
    title: "Integrações | MarginFlow",
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
