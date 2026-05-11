"use client";

import Link from "next/link";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { scrollToLandingSection } from "@/components/marketing/scroll-to-landing-section";
import { PUBLIC_BRAND } from "@/lib/public-branding";
import { getWhatsappDemoUrl } from "@/lib/site";
import { HeroMetrics, ProgressMetrics, DashboardMetrics } from "./hero-metrics";
import { HeroIntegrationLine, MarketplaceLogosBar } from "./marketplace-icons";
import { DashboardShowcase } from "./dashboard-showcase";
import { SocialProof } from "./social-proof";
import { IntegrationsSection } from "./integrations-section";

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

// Hero Dashboard Preview Component
function HeroDashboardPreview() {
  const reduceMotion = useReducedMotion();

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
      <div className="relative overflow-hidden rounded-2xl border border-border bg-white shadow-2xl">
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
        <div className="p-5">
          <div className="mb-4">
            <p className="text-xs text-muted-foreground">Visão geral - Maio 2026</p>
            <h3 className="text-lg font-bold text-foreground">Dashboard do negócio</h3>
          </div>

          <DashboardMetrics />

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="mb-3 text-xs font-medium text-muted-foreground">Métricas de performance</p>
              <ProgressMetrics />
            </div>

            <div className="rounded-xl border border-border bg-gradient-to-br from-accent/5 to-transparent p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/10">
                  <svg className="h-3 w-3 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-accent">Dica do dia</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Seus produtos no Mercado Livre têm margem 15% maior que na Shopee. Considere redirecionar
                anúncios.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Floating badge */}
      <motion.div
        className="absolute -right-4 top-10 hidden rounded-xl border border-border bg-white p-3 shadow-lg md:block"
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
      className="group relative flex flex-col rounded-2xl border border-border bg-white p-6 shadow-sm transition-all duration-300 hover:border-accent/20 hover:shadow-lg"
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
  period,
  description,
  features,
  featured = false,
  cta,
  href,
  delay,
}: {
  name: string;
  price: string;
  period: string;
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
          <span className="text-sm text-muted-foreground">/{period}</span>
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
      description: "Acompanhe receita, lucro e margem em tempo real com atualizações automáticas a cada sincronização.",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: "accent",
    },
    {
      title: "Gestão de Lucro por SKU",
      description: "Saiba exatamente quanto cada produto está lucrando, considerando todos os custos e taxas.",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      color: "blue",
    },
    {
      title: "Analytics Avançado",
      description: "Gráficos detalhados de vendas, comparativos por período e análise de tendências de crescimento.",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
      ),
      color: "purple",
    },
    {
      title: "Insights com IA",
      description: "Receba recomendações inteligentes sobre preços, estoque e oportunidades de crescimento.",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      color: "orange",
    },
    {
      title: "Performance de Anúncios",
      description: "Acompanhe o ROI de seus anúncios e otimize seus investimentos em marketing.",
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
      description: "Compare a performance do seu negócio entre Mercado Livre, Shopee e Amazon em uma única visão.",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
        </svg>
      ),
      color: "cyan",
    },
    {
      title: "Alertas Automáticos",
      description: "Seja notificado quando produtos atingirem margem negativa ou quando houver variações anormais.",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
      color: "indigo",
    },
    {
      title: "Relatórios Inteligentes",
      description: "Gere relatórios executivos em PDF com os indicadores mais importantes do seu negócio.",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: "green",
    },
  ];

  const plans = [
    {
      name: "Starter",
      monthlyPrice: "R$ 29",
      annualPrice: "R$ 24",
      description: "Perfeito para quem está começando a profissionalizar a operação.",
      features: [
        "Até 100 produtos",
        "1 marketplace",
        "Dashboard essencial",
        "Sincronização manual",
        "Suporte por email",
      ],
      cta: "Começar Gratuitamente",
      featured: false,
    },
    {
      name: "Growth",
      monthlyPrice: "R$ 79",
      annualPrice: "R$ 63",
      description: "Para operações que precisam escalar com dados e insights.",
      features: [
        "Produtos ilimitados",
        "Múltiplos marketplaces",
        "Analytics avançado",
        "Insights com IA",
        "Suporte prioritário",
        "Relatórios executivos",
      ],
      cta: "Começar Gratuitamente",
      featured: true,
    },
    {
      name: "Scale",
      monthlyPrice: "R$ 149",
      annualPrice: "R$ 119",
      description: "Para empresas com operação complexa e equipes grandes.",
      features: [
        "Tudo do plano Growth",
        "API access",
        "Onboarding dedicado",
        "Relatórios customizados",
        "SLA garantido",
        "Gerente de conta",
      ],
      cta: "Falar com Vendas",
      featured: false,
    },
  ];

  return (
    <main className="relative">
      {/* Hero Section */}
      <section ref={heroRef} className="relative pt-20 md:pt-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Hero Content */}
            <div className="max-w-2xl">
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
                Venda mais.
                <br />
                <span className="text-accent">Lucre mais.</span>
              </motion.h1>

              {/* Subheadline */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2, ease: easeOut }}
                className="mt-6 text-lg leading-relaxed text-muted-foreground md:text-xl"
              >
                A única plataforma que centraliza métricas de vendas, lucro, margem e performance de todos os
                seus marketplaces em um só lugar.
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
            <motion.div style={{ y: dashboardY }} className="lg:pl-8">
              <HeroDashboardPreview />
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
              mais e lucrar mais.
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
              Comece gratuitamente e evolua conforme seu negócio cresce. Sem taxa de setup, cancele quando
              quiser.
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
          <div className="grid gap-6 lg:grid-cols-3">
            {plans.map((plan, index) => (
              <PricingCard
                key={plan.name}
                name={plan.name}
                price={billing === "monthly" ? plan.monthlyPrice : plan.annualPrice}
                period={billing === "monthly" ? "mês" : "mês"}
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
              Junte-se a centenas de sellers profissionais que já descobriram onde estavam perdendo dinheiro.
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
              Setup em 2 minutos. Cancele quando quiser. Sem cartão de crédito.
            </p>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
