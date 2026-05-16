"use client";

import Link from "next/link";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { scrollToLandingSection } from "@/components/marketing/scroll-to-landing-section";
import { PUBLIC_BRAND } from "@/lib/public-branding";
import { getWhatsappDemoUrl, pricingPlans } from "@/lib/site";
import { HeroMetrics } from "./hero-metrics";
import { MarketplaceLogosBar } from "./marketplace-icons";
import { DashboardShowcase } from "./dashboard-showcase";
import { SocialProof } from "./social-proof";
import { IntegrationsSection } from "./integrations-section";
import { ParticleCanvas } from "@/components/auth/particle-canvas";

const easeOut = [0.16, 1, 0.3, 1] as const;

function ScheduleDemoLink({ className }: { className: string }) {
  const wa = getWhatsappDemoUrl();
  if (wa) {
    return (
      <a href={wa} target="_blank" rel="noopener noreferrer" className={className}>
        Agendar demonstração
      </a>
    );
  }
  return (
    <Link
      href="#demo"
      className={className}
      onClick={(e) => {
        e.preventDefault();
        scrollToLandingSection("demo");
      }}
    >
      Agendar demonstração
    </Link>
  );
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function IconOrb({ children, color = "accent" }: { children: React.ReactNode; color?: string }) {
  const colorClasses: Record<string, string> = {
    accent: "from-accent/20 to-accent/5 text-accent",
    blue: "from-blue-500/20 to-blue-500/5 text-blue-600",
    purple: "from-purple-500/20 to-purple-500/5 text-purple-600",
    green: "from-green-500/20 to-green-500/5 text-green-600",
    orange: "from-orange-500/20 to-orange-500/5 text-orange-600",
    pink: "from-pink-500/20 to-pink-500/5 text-pink-600",
    cyan: "from-cyan-500/20 to-cyan-500/5 text-cyan-600",
    indigo: "from-indigo-500/20 to-indigo-500/5 text-indigo-600",
  };

  return (
    <span
      className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${colorClasses[color] || colorClasses.accent} shadow-sm ring-1 ring-black/5`}
    >
      {children}
    </span>
  );
}

// Hero Dashboard Preview Component — matches real app layout
function HeroDashboardPreview() {
  const reduceMotion = useReducedMotion();

  const kpiCards = [
    { label: "Faturamento", value: "R$ 124,5 mil", sub: "847 pedidos · 1.203 un", positive: true },
    { label: "Margem Média", value: "23,4%", sub: "Margem saudável", positive: true },
    { label: "Ponto de Equilíbrio", value: "R$ 98,2 mil", sub: "Meta atingida", positive: true },
    { label: "Lucro Líquido", value: "R$ 48,2 mil", sub: "38,7% do faturamento", positive: true },
  ];

  const channelData = [
    { name: "Mercado Livre", profit: "R$ 32,1 mil", color: "bg-yellow-400" },
    { name: "Shopee", profit: "R$ 16,1 mil", color: "bg-orange-500" },
  ];

  const insights = [
    { type: "growth", text: "Lucratividade positiva: lucro líquido de R$ 48,2 mil" },
    { type: "alert", text: "3 produtos com margem negativa precisam de atenção" },
    { type: "info", text: "Progresso até ponto de equilíbrio: 126% da meta" },
  ];

  const topProducts = [
    { name: "Fone Bluetooth Pro", channel: "MELI", health: "Escalável", profit: "R$ 8.450", margin: "32%" },
    { name: "Smart Watch X1", channel: "MELI", health: "Saudável", profit: "R$ 12.300", margin: "28%" },
    { name: "Carregador Turbo", channel: "SHPE", health: "Saudável", profit: "R$ 4.680", margin: "41%" },
  ];

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.3, ease: easeOut }}
      className="relative"
    >
      {/* Glow effect */}
      <div className="absolute -inset-4 rounded-3xl bg-accent/10 blur-3xl" />

      {/* Dashboard Card */}
      <div className="relative rounded-2xl border border-border bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-gradient-to-br from-accent to-accent-strong" />
            <span className="text-sm font-semibold text-foreground">{PUBLIC_BRAND.name}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs text-muted-foreground">Ao vivo</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Title */}
          <div className="mb-3">
            <p className="text-[10px] text-muted-foreground">Visão geral - Maio 2026</p>
            <h3 className="text-base font-bold text-foreground">Dashboard do negócio</h3>
          </div>

          {/* KPI Cards — matching real app financial indicators */}
          <div className="mb-4 grid grid-cols-2 gap-3">
            {kpiCards.map((kpi, i) => (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.08, duration: 0.5 }}
                className="rounded-xl border border-border bg-white p-3 shadow-sm"
              >
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{kpi.label}</p>
                <p className="mt-1 text-base font-bold text-foreground md:text-lg">{kpi.value}</p>
                <p className={`mt-0.5 text-[10px] font-medium ${kpi.positive ? "text-success" : "text-error"}`}>
                  {kpi.sub}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Charts row — matching real app layout */}
          <div className="grid gap-2 md:grid-cols-2">
            {/* Line Chart mock */}
            <div className="rounded-xl border border-border bg-white p-3 shadow-sm">
              <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Evolução Financeira
              </p>
              <p className="mb-2 text-[10px] text-muted-foreground">Receita bruta vs Lucro</p>
              <div className="relative h-20">
                <svg viewBox="0 0 200 60" className="h-full w-full" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="heroArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0e7a6f" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#0e7a6f" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,52 Q20,48 40,40 T80,32 T120,24 T160,20 T200,12 L200,60 L0,60 Z"
                    fill="url(#heroArea)"
                  />
                  <path
                    d="M0,52 Q20,48 40,40 T80,32 T120,24 T160,20 T200,12"
                    fill="none"
                    stroke="#0e7a6f"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M0,56 Q20,53 40,50 T80,44 T120,38 T160,34 T200,28"
                    fill="none"
                    stroke="#141c22"
                    strokeWidth="1.5"
                    strokeDasharray="4 2"
                  />
                </svg>
              </div>
              <div className="mt-1 flex justify-between text-[9px] text-muted-foreground">
                <span>1º</span>
                <span>10º</span>
                <span>20º</span>
                <span>25º</span>
              </div>
            </div>

            {/* Channel Performance */}
            <div className="rounded-xl border border-border bg-white p-3 shadow-sm">
              <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Performance por Canal
              </p>
              <p className="mb-2 text-[10px] text-muted-foreground">Lucro por marketplace</p>
              <div className="space-y-2">
                {channelData.map((ch) => (
                  <div key={ch.name} className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full ${ch.color}`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium text-foreground">{ch.name}</span>
                        <span className="text-[10px] font-bold text-foreground">{ch.profit}</span>
                      </div>
                      <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-gray-100">
                        <motion.div
                          className={`h-full rounded-full ${ch.color}`}
                          initial={{ width: 0 }}
                          animate={{ width: ch.name === "Mercado Livre" ? "66%" : "34%" }}
                          transition={{ duration: 1, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Insights */}
          <div className="mt-2 rounded-xl border border-accent/20 bg-gradient-to-br from-accent/[0.03] to-transparent p-3">
            <div className="flex items-center gap-1.5">
              <div className="flex h-4 w-4 items-center justify-center rounded-full bg-accent/10">
                <svg className="h-2 w-2 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <span className="text-[10px] font-semibold text-accent">Insights</span>
            </div>
            <ul className="mt-1.5 space-y-1">
              {insights.map((insight, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1 + i * 0.1 }}
                  className="flex items-start gap-1.5 text-[10px] text-muted-foreground"
                >
                  <span className={`mt-1 h-1 w-1 shrink-0 rounded-full ${
                    insight.type === "alert" ? "bg-warning" : insight.type === "info" ? "bg-info" : "bg-success"
                  }`} />
                  {insight.text}
                </motion.li>
              ))}
            </ul>
          </div>

          {/* Top Products — compact (2 rows) */}
          <div className="mt-2 rounded-xl border border-border bg-white p-3 shadow-sm">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Top Produtos
            </p>
            <div className="grid grid-cols-4 gap-1 border-b border-border pb-1 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
              <span className="col-span-2">Produto</span>
              <span>Saúde</span>
              <span className="text-right">Lucro</span>
            </div>
            <div className="mt-1 space-y-1">
              {topProducts.slice(0, 2).map((p, i) => (
                <motion.div
                  key={p.name}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.2 + i * 0.06 }}
                  className="grid grid-cols-4 gap-1 text-[10px]"
                >
                  <span className="col-span-2 truncate font-medium text-foreground">{p.name}</span>
                  <span className={`text-[9px] font-medium ${
                    p.health === "Escalável" ? "text-accent" : "text-success"
                  }`}>{p.health}</span>
                  <span className="text-right font-medium text-accent">{p.profit}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating badge */}
      <motion.div
        className="absolute -right-3 top-8 hidden rounded-xl border border-border bg-white p-3 shadow-lg md:block"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10">
            <svg className="h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">Meta batida!</p>
            <p className="text-[10px] text-muted-foreground">Lucro: +18% do planejado</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Feature Card Component
function FeatureCard({
  title,
  description,
  icon,
  color,
  index,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  index: number;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{
        duration: 0.5,
        delay: reduceMotion ? 0 : index * 0.05,
        ease: easeOut,
      }}
      whileHover={reduceMotion ? undefined : { y: -4, transition: { duration: 0.2 } }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-white p-6 shadow-sm transition-all duration-300 hover:border-accent/20 hover:shadow-lg"
    >
      <IconOrb color={color}>{icon}</IconOrb>
      <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>

      {/* Hover indicator */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-2xl bg-accent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </motion.div>
  );
}

// Pricing Card Component
function PricingCard({
  name,
  price,
  suffix,
  description,
  features,
  featured = false,
  cta,
  href,
  delay,
}: {
  name: string;
  price: string;
  suffix: string;
  description: string;
  features: string[];
  featured?: boolean;
  cta: string;
  href: string;
  delay: number;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{
        duration: 0.6,
        delay: reduceMotion ? 0 : delay,
        ease: easeOut,
      }}
      whileHover={reduceMotion ? undefined : { y: -8, transition: { duration: 0.2 } }}
      className={`relative flex flex-col rounded-2xl border p-6 shadow-sm transition-all duration-300 hover:shadow-xl ${
        featured
          ? "border-accent bg-gradient-to-b from-white to-accent/[0.02] ring-1 ring-accent/20"
          : "border-border bg-white"
      }`}
    >
      {featured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-accent px-4 py-1 text-xs font-semibold text-white shadow-md">
            Mais popular
          </span>
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{name}</h3>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-4xl font-bold text-foreground">{price}</span>
          <span className="text-sm text-muted-foreground">{suffix}</span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>

      <Link
        href={href}
        className={`mb-6 inline-flex h-11 items-center justify-center rounded-xl px-6 text-sm font-semibold transition-all ${
          featured
            ? "bg-accent text-white shadow-md hover:bg-accent-strong hover:shadow-lg"
            : "border border-border bg-white text-foreground hover:border-accent/30 hover:bg-accent/[0.02]"
        }`}
      >
        {cta}
      </Link>

      <ul className="mt-auto space-y-3">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-sm text-muted-foreground">
            <CheckIcon />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

export function LandingPage() {
  const reduceMotion = useReducedMotion();
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const smoothProgress = useSpring(scrollYProgress, { damping: 28, stiffness: 120 });
  const dashboardY = useTransform(smoothProgress, [0, 1], reduceMotion ? [0, 0] : [0, -30]);

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;
    const run = () => scrollToLandingSection(hash);
    window.requestAnimationFrame(run);
  }, []);

  const features = [
    {
      title: "Dashboard em Tempo Real",
      description: "Acompanhe receita, lucro e margem em tempo real com atualizações automáticas a cada sincronização",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: "accent",
    },
    {
      title: "Gestão de Lucro por SKU",
      description: "Saiba exatamente quanto cada produto está lucrando, considerando todos os custos e taxas",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      color: "blue",
    },
    {
      title: "Analytics Avançado",
      description: "Gráficos detalhados de vendas, comparativos por período e análise de tendências de crescimento",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
      ),
      color: "purple",
    },
    {
      title: "Insights com IA",
      description: "Receba recomendações inteligentes sobre preços, estoque e oportunidades de crescimento",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      color: "orange",
    },
    {
      title: "Performance de Anúncios",
      description: "Acompanhe o ROI de seus anúncios e otimize seus investimentos em marketing",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
        </svg>
      ),
      color: "pink",
    },
    {
      title: "Comparativos entre Marketplaces",
      description: "Compare a performance do seu negócio entre Mercado Livre, Shopee e Amazon em uma única visão",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
        </svg>
      ),
      color: "cyan",
    },
    {
      title: "Alertas Automáticos",
      description: "Seja notificado quando produtos atingirem margem negativa ou quando houver variações anormais",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
      color: "indigo",
    },
    {
      title: "Relatórios Inteligentes",
      description: "Gere relatórios executivos em PDF com os indicadores mais importantes do seu negócio",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: "green",
    },
  ];

  const plans = pricingPlans
    .filter((plan) => plan.name === "Crescimento")
    .map((plan) => ({
      ...plan,
      featured: true,
      cta: plan.ctaLabel,
      href: plan.ctaHref,
      features: [...plan.features],
    }));

  return (
    <main className="relative">
      {/* Particles across entire page */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <ParticleCanvas />
      </div>

      {/* Hero Section */}
      <section ref={heroRef} className="relative pt-20 md:pt-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Hero Content */}
            <div className="flex max-w-2xl flex-col justify-start pt-4">
              {/* Eyebrow */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: easeOut }}
                className="inline-flex items-center rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-accent"
              >
                Plataforma de Analytics para Sellers
              </motion.p>

              {/* Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1, ease: easeOut }}
                className="mt-6 text-4xl font-bold leading-[1.1] tracking-tight text-foreground md:text-5xl lg:text-6xl"
              >
                Descubra onde seu
                <br />
                <span className="text-accent">dinheiro está indo</span>
              </motion.h1>

              {/* Subheadline */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2, ease: easeOut }}
                className="mt-6 text-lg leading-relaxed text-muted-foreground md:text-xl"
              >
                Dashboard de lucro real com custos, taxas e comissões já descontados. Acompanhe margem, 
                vendas e performance por canal — Mercado Livre, Shopee e Amazon — em tempo real
              </motion.p>

              {/* CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3, ease: easeOut }}
                className="mt-8 flex flex-wrap gap-4"
              >
                <Link
                  href="/sign-in"
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-accent px-8 text-sm font-semibold text-white shadow-md transition-all hover:bg-accent-strong hover:shadow-lg active:scale-[0.98]"
                >
                  Começar Gratuitamente
                </Link>
                <ScheduleDemoLink className="inline-flex h-12 items-center justify-center rounded-xl border border-border bg-white px-8 text-sm font-semibold text-foreground transition-all hover:border-accent/30 hover:bg-accent/[0.02] active:scale-[0.98]" />
              </motion.div>

              {/* Marketplace Logos */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4, ease: easeOut }}
                className="mt-10"
              >
                <MarketplaceLogosBar />
              </motion.div>

              {/* Hero Metrics */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5, ease: easeOut }}
                className="mt-10"
              >
                <HeroMetrics />
              </motion.div>
            </div>

            {/* Hero Dashboard Preview */}
            <motion.div style={{ y: dashboardY }} className="flex items-start justify-center lg:pl-8">
              <div className="w-full max-w-[480px]">
                <HeroDashboardPreview />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Dashboard Showcase Section */}
      <DashboardShowcase />

      {/* Features Section */}
      <section id="recursos" className="scroll-mt-28 py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: easeOut }}
            className="mb-16 text-center"
          >
            <span className="inline-flex items-center rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-accent">
              Recursos
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground md:text-4xl lg:text-5xl">
              Tudo que você precisa para escalar
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              De métricas ao vivo a insights com IA, cada funcionalidade foi pensada para ajudar você a vender
              mais e lucrar mais
            </p>
          </motion.div>

          {/* Features Grid */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <FeatureCard
                key={feature.title}
                title={feature.title}
                description={feature.description}
                icon={feature.icon}
                color={feature.color}
                index={index}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Integrations Section */}
      <IntegrationsSection />

      {/* Social Proof Section */}
      <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background:
              "linear-gradient(to bottom, transparent 0%, var(--background-elevated) 10%, var(--surface-strong) 50%, var(--background-soft) 100%)",
          }}
        />
        <div className="relative z-10">
          <SocialProof />
        </div>
      </div>

      {/* Pricing Section */}
      <section id="planos" className="scroll-mt-28 py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: easeOut }}
            className="mb-12 text-center"
          >
            <span className="inline-flex items-center rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-accent">
              Planos
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground md:text-4xl lg:text-5xl">
              Escolha o plano ideal para você
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Comece gratuitamente e evolua conforme seu negócio cresce. Sem taxa de configuração, cancele quando
              quiser
            </p>
          </motion.div>

          {/* Billing Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-12 flex flex-col items-center gap-4"
          >
            <div className="inline-flex items-center rounded-full border border-border bg-white p-1 shadow-sm">
              {(["monthly", "annual"] as const).map((key) => {
                const active = billing === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setBilling(key)}
                    className={`relative rounded-full px-6 py-2.5 text-sm font-semibold transition-all ${
                      active ? "text-white" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="billing-pill"
                        className="absolute inset-0 rounded-full bg-accent shadow-md"
                        transition={{ type: "spring", stiffness: 400, damping: 35 }}
                      />
                    )}
                    <span className="relative">{key === "monthly" ? "Mensal" : "Anual"}</span>
                  </button>
                );
              })}
            </div>
            {billing === "annual" && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm font-medium text-accent"
              >
                Economize 20% no plano anual
              </motion.p>
            )}
          </motion.div>

          {/* Pricing Cards */}
          <div className="mx-auto grid max-w-sm gap-6">
            {plans.map((plan, index) => (
              <PricingCard
                key={plan.name}
                name={plan.name}
                price={billing === "monthly" ? plan.monthlyPrice : plan.annualPrice}
                suffix={billing === "monthly" ? plan.monthlySuffix : plan.annualSuffix}
                description={plan.description}
                features={plan.features}
                featured={plan.featured}
                cta={plan.cta}
                href="/sign-in"
                delay={index * 0.1}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section id="demo" className="relative py-24 md:py-32">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background:
              "linear-gradient(to bottom, var(--background-soft) 0%, rgba(14, 122, 111, 0.05) 45%, var(--background) 100%)",
          }}
        />

        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: easeOut }}
          >
            <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl lg:text-5xl">
              Pronto para ver o lucro real do seu negócio?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
              Junte-se a centenas de sellers profissionais que já descobriram onde estavam perdendo dinheiro
            </p>

            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/sign-in"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-accent px-8 text-sm font-semibold text-white shadow-lg transition-all hover:bg-accent-strong hover:shadow-xl active:scale-[0.98]"
              >
                Começar Agora
              </Link>
              <ScheduleDemoLink className="inline-flex h-12 items-center justify-center rounded-xl border border-border bg-white px-8 text-sm font-semibold text-foreground transition-all hover:border-accent/30 hover:bg-accent/[0.02] active:scale-[0.98]" />
            </div>

            <p className="mt-6 text-sm text-muted-foreground">
              Configuração em 5 minutos. Cancele quando quiser. Sem cartão de crédito.
            </p>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
