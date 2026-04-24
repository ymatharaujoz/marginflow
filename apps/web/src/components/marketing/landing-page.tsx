"use client";

import Link from "next/link";
import { Container } from "@marginflow/ui";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { scrollToLandingSection } from "@/components/marketing/scroll-to-landing-section";

const easeOut = [0.16, 1, 0.3, 1] as const;

function IconOrb({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#e0f2fe] to-[#f0f9ff] text-[#007bff] shadow-[0_0_24px_rgba(0,212,255,0.25)] ring-1 ring-[#bae6fd]/60">
      {children}
    </span>
  );
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4 text-[#00d4ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ProgressRow({
  label,
  value,
  delay,
}: {
  label: string;
  value: number;
  delay: number;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs font-medium text-[#64748b]">
        <span>{label}</span>
        <span className="tabular-nums text-[#0f172a]">{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#e2e8f0]">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-[#007bff] to-[#00d4ff]"
          initial={reduceMotion ? { width: `${value}%` } : { width: 0 }}
          whileInView={reduceMotion ? undefined : { width: `${value}%` }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 1.1, delay, ease: easeOut }}
        />
      </div>
    </div>
  );
}

export function LandingPage() {
  const reduceMotion = useReducedMotion();
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const smoothProgress = useSpring(scrollYProgress, { damping: 28, stiffness: 120 });
  const dashboardY = useTransform(smoothProgress, [0, 1], reduceMotion ? [0, 0] : [0, -18]);

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) {
      return;
    }
    const run = () => scrollToLandingSection(hash);
    window.requestAnimationFrame(run);
  }, []);

  const fadeUp = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 24 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: reduceMotion ? 0 : 0.08 * i, duration: 0.65, ease: easeOut },
    }),
  };

  const featureCards = [
    {
      title: "Inteligência de margem",
      body: "Acompanhe margem bruta e lucro líquido em uma única visualização para entender o que realmente impulsiona o desempenho.",
      icon: (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7-6.3-4.6-6.3 4.6 2.3-7-6-4.6h7.6z" />
        </svg>
      ),
    },
    {
      title: "Monitoramento de vendas",
      body: "Veja quantidade de vendas, tendência de pedidos e movimentação de faturamento com visibilidade quase em tempo real.",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" d="M4 19h16M7 15l3-3 3 2 4-5" />
        </svg>
      ),
    },
    {
      title: "Performance de POS",
      body: "Compare o desempenho dos pontos de venda, identifique os melhores canais e encontre rapidamente lojas com baixa performance.",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 4v6c0 5-3.5 9-7 10-3.5-1-7-5-7-10V7l7-4z" />
        </svg>
      ),
    },
    {
      title: "Dashboards executivos",
      body: "Use dashboards visuais e gráficos pensados para empresários que precisam de respostas rápidas, não de mais abas em planilhas.",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" d="M6 18V8M12 18V4M18 18v-8" />
        </svg>
      ),
    },
    {
      title: "Integrações com marketplaces",
      body: "Centralize seus números com conectores para canais como Mercado Livre, Shopee e Amazon.",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="10" />
          <path strokeLinecap="round" d="M2 12h20M12 2a15 15 0 010 20" />
        </svg>
      ),
    },
    {
      title: "Alertas para decisão",
      body: "Identifique variações incomuns em lucro, margem ou volume de vendas antes que se tornem problemas operacionais caros.",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
  ];

  const integrations = [
    {
      name: "Mercado Livre",
      body: "Unifique pedidos, faturamento e margens com leitura consistente do canal.",
    },
    {
      name: "Shopee",
      body: "Acompanhe performance e lucro com o mesmo modelo financeiro dos demais canais.",
    },
    {
      name: "Amazon",
      body: "Prepare a visão consolidada enquanto o conector evolui no roteiro do produto.",
    },
  ];

  const steps = [
    {
      title: "Captura",
      body: "Receba dados dos marketplaces e pontos de venda em um único fluxo.",
    },
    {
      title: "Consolidação",
      body: "Agrupe lucro, margem e quantidade de vendas sem retrabalho manual.",
    },
    {
      title: "Decisão",
      body: "Use o dashboard para agir rápido com base em números centralizados.",
    },
  ];

  const plans = [
    {
      name: "Inicial",
      slug: "inicial",
      monthlyPrice: "R$ 24",
      annualPrice: "R$ 19",
      suffix: "/ usuário",
      description: "Para quem está começando a profissionalizar a leitura de lucro e margem.",
      cta: "Escolher Inicial",
      href: "/sign-in",
      featured: false,
      features: [
        "Dashboard financeiro principal",
        "Métricas de vendas e lucro",
        "Gráficos essenciais",
        "Suporte por email",
      ],
    },
    {
      name: "Pro",
      slug: "pro",
      monthlyPrice: "R$ 79",
      annualPrice: "R$ 63",
      suffix: "/ usuário",
      description: "Para operações que precisam de análise mais profunda e ritmo semanal de decisão.",
      cta: "Escolher Pro",
      href: "/sign-in",
      featured: true,
      features: [
        "Análise avançada de margem",
        "Detalhamento de lucro líquido",
        "Acompanhamento de POS",
        "Suporte prioritário",
      ],
    },
    {
      name: "Enterprise",
      slug: "enterprise",
      monthlyPrice: "Personalizado",
      annualPrice: "Personalizado",
      suffix: "",
      description: "Para grupos com integrações específicas, SLAs e onboarding dedicado.",
      cta: "Falar com vendas",
      href: "/sign-in",
      featured: false,
      features: [
        "Integrações personalizadas",
        "Onboarding dedicado",
        "Relatórios executivos",
        "SLAs customizados",
      ],
    },
  ];

  return (
    <main>
      <Container className="max-w-7xl pt-10 md:pt-14">
        <section
          ref={heroRef}
          className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-10"
        >
          <div>
            <motion.p
              custom={0}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="inline-flex rounded-full border border-[#7dd3fc] bg-[#f0f9ff] px-4 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#0369a1]"
            >
              Visibilidade financeira premium
            </motion.p>
            <motion.h1
              custom={1}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="mt-6 max-w-2xl font-[family-name:var(--font-marketing-display)] text-4xl font-semibold leading-[1.12] tracking-tight text-[#0f172a] md:text-5xl lg:text-[3.15rem]"
            >
              Veja os números que realmente movem o seu negócio.
            </motion.h1>
            <motion.p
              custom={2}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="mt-6 max-w-xl text-base leading-relaxed text-[#64748b] md:text-lg"
            >
              O MarginFlow entrega uma plataforma premium para acompanhar margem, lucro líquido, resultados de POS,
              quantidade de vendas e desempenho por canal em um dashboard moderno e intuitivo.
            </motion.p>
            <motion.div
              custom={3}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="mt-8 flex flex-wrap gap-3"
            >
              <Link
                href="#demo"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#e2e8f0] bg-white px-6 py-2.5 text-sm font-semibold text-[#334155] shadow-[0_8px_28px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_36px_rgba(15,23,42,0.1)]"
              >
                Agendar demonstração
              </Link>
              <a
                href="#planos"
                className="inline-flex min-h-11 items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold text-[#007bff] underline-offset-4 hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToLandingSection("planos");
                }}
              >
                Ver planos
              </a>
            </motion.div>
            <motion.div
              custom={4}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="mt-10 grid gap-4 sm:grid-cols-3"
            >
              {[
                { value: "+18,4%", label: "Mais clareza sobre a margem" },
                { value: "24/7", label: "Acesso aos indicadores do negócio" },
                { value: "+10 painéis", label: "Para lucro, vendas e POS" },
              ].map((card) => (
                <motion.article
                  key={card.label}
                  whileHover={reduceMotion ? undefined : { y: -4 }}
                  transition={{ type: "spring", stiffness: 400, damping: 22 }}
                  className="rounded-2xl border border-[#e2e8f0] bg-white/90 p-5 shadow-[0_10px_36px_rgba(15,23,42,0.06)] backdrop-blur-sm"
                >
                  <p className="text-2xl font-bold tabular-nums tracking-tight text-[#0f172a]">{card.value}</p>
                  <p className="mt-2 text-xs font-medium leading-relaxed text-[#64748b]">{card.label}</p>
                </motion.article>
              ))}
            </motion.div>
          </div>

          <motion.div style={{ y: dashboardY }} className="relative lg:pl-4">
            <div
              className="pointer-events-none absolute -right-8 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-[#00d4ff]/20 blur-3xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -left-4 top-12 h-56 w-56 rounded-full bg-[#007bff]/15 blur-3xl"
              aria-hidden
            />
            <motion.article
              initial={reduceMotion ? false : { opacity: 0, x: 36 }}
              animate={reduceMotion ? undefined : { opacity: 1, x: 0 }}
              transition={{ duration: 0.85, ease: easeOut, delay: 0.15 }}
              className="relative rounded-[1.75rem] border border-[#e2e8f0] bg-white p-6 shadow-[0_28px_80px_rgba(15,23,42,0.12)] md:p-8"
            >
              <motion.div
                animate={reduceMotion ? undefined : { y: [0, -6, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                      Visão geral do desempenho
                    </p>
                    <h2 className="mt-2 font-[family-name:var(--font-marketing-display)] text-xl font-semibold text-[#0f172a] md:text-2xl">
                      Dashboard do negócio em abril
                    </h2>
                  </div>
                  <span className="rounded-full bg-[#dcfce7] px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-[#166534]">
                    Atualizado ao vivo
                  </span>
                </div>

                <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.05fr]">
                  <div className="space-y-5">
                    <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#64748b]">Métricas principais</p>
                    <ProgressRow label="Lucro líquido" value={84} delay={0.1} />
                    <ProgressRow label="Margem" value={78} delay={0.22} />
                    <ProgressRow label="Quantidade de vendas" value={91} delay={0.34} />
                    <div className="rounded-xl bg-[#f8fafc] p-4 text-sm leading-relaxed text-[#64748b]">
                      <span className="font-semibold text-[#0f172a]">Roteiro de integrações:</span> Mercado Livre, Shopee e
                      Amazon em um único fluxo de leitura.
                    </div>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="rounded-2xl border border-[#e2e8f0] bg-gradient-to-br from-[#f8fafc] to-white p-5">
                      <p className="text-xs font-medium text-[#64748b]">Lucro líquido</p>
                      <p className="mt-2 text-3xl font-bold tracking-tight text-[#0f172a]">R$ 48,2 mil</p>
                      <p className="mt-2 text-sm font-medium text-[#007bff]">Alta de 12,6% vs. mês anterior</p>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-[#e2e8f0] bg-white p-4">
                        <p className="text-xs text-[#64748b]">Margem operacional</p>
                        <p className="mt-2 text-2xl font-bold text-[#0f172a]">18,7%</p>
                        <p className="mt-1 text-sm font-semibold text-[#16a34a]">+2,1 pts</p>
                      </div>
                      <div className="rounded-2xl border border-[#e2e8f0] bg-white p-4">
                        <p className="text-xs text-[#64748b]">Vendas na semana</p>
                        <p className="mt-2 text-2xl font-bold text-[#0f172a]">1.284</p>
                        <p className="mt-1 text-xs text-[#64748b]">Pedidos</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.article>
          </motion.div>
        </section>
      </Container>

      <Container className="max-w-7xl pt-20 md:pt-28">
        <section id="recursos" className="scroll-mt-28 text-center">
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex rounded-full border border-[#7dd3fc] bg-white px-4 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#0369a1]"
          >
            Feito para clareza do negócio
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="mx-auto mt-5 max-w-4xl font-[family-name:var(--font-marketing-display)] text-3xl font-semibold leading-tight text-[#0f172a] md:text-4xl"
          >
            Tudo o que o empresário precisa para entender lucro, vendas e desempenho por canal.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mx-auto mt-5 max-w-2xl text-base text-[#64748b] md:text-lg"
          >
            De métricas ao vivo a gráficos executivos, cada bloco foi desenhado para ajudar você a tomar decisões comerciais
            com mais rapidez.
          </motion.p>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featureCards.map((card, i) => (
              <motion.article
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.55, delay: reduceMotion ? 0 : i * 0.06 }}
                whileHover={reduceMotion ? undefined : { y: -6, transition: { duration: 0.25 } }}
                className="flex flex-col rounded-2xl border border-[#e2e8f0] bg-white/95 p-6 text-left shadow-[0_12px_40px_rgba(15,23,42,0.06)]"
              >
                <IconOrb>{card.icon}</IconOrb>
                <h3 className="mt-5 text-lg font-bold text-[#0f172a]">{card.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[#64748b]">{card.body}</p>
              </motion.article>
            ))}
          </div>
        </section>
      </Container>

      <Container className="max-w-7xl pt-20 md:pt-28">
        <section className="rounded-[2rem] border border-[#e2e8f0] bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.07)] backdrop-blur-sm md:p-10 lg:p-12">
          <div className="text-center">
            <span className="inline-flex rounded-full border border-[#7dd3fc] bg-[#f0f9ff] px-4 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#0369a1]">
              Integrações
            </span>
            <h2 className="mx-auto mt-5 max-w-3xl font-[family-name:var(--font-marketing-display)] text-3xl font-semibold text-[#0f172a] md:text-[2.15rem]">
              Uma área de integrações mais limpa, clara e preparada para crescer.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[#64748b]">
              Em vez de misturar cards e blocos pesados, a seção apresenta os marketplaces de forma organizada e explica o
              valor da centralização com um fluxo visual simples.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {integrations.map((item, i) => (
              <motion.article
                key={item.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: reduceMotion ? 0 : i * 0.08 }}
                whileHover={reduceMotion ? undefined : { y: -4 }}
                className="rounded-2xl border border-[#e2e8f0] bg-gradient-to-b from-white to-[#f8fafc] p-5 shadow-[0_8px_28px_rgba(15,23,42,0.05)]"
              >
                <div className="flex items-start gap-3">
                  <IconOrb>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14v10a2 2 0 01-2 2H7a2 2 0 01-2-2V9z" />
                    </svg>
                  </IconOrb>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-[#0f172a]">{item.name}</h3>
                        <p className="text-xs text-[#64748b]">Marketplace</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-[#ffedd5] px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-[#c2410c]">
                        Planejado
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-[#64748b]">{item.body}</p>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
          <div className="mt-8 rounded-2xl border border-[#e2e8f0] bg-[#f1f5f9]/80 p-5 md:p-6">
            <div className="grid gap-4 md:grid-cols-3">
              {steps.map((step, i) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: reduceMotion ? 0 : 0.1 + i * 0.06 }}
                  className="rounded-xl border border-white/80 bg-white/90 p-4 shadow-sm"
                >
                  <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-[#007bff]">
                    {i + 1}. {step.title}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-[#64748b]">{step.body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </Container>

      <Container className="max-w-7xl pt-20 md:pt-28">
        <section id="planos" className="scroll-mt-28 text-center">
          <span className="inline-flex rounded-full bg-[#e0f2fe] px-4 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#0369a1]">
            Planos flexíveis
          </span>
          <h2 className="mx-auto mt-5 max-w-3xl font-[family-name:var(--font-marketing-display)] text-3xl font-semibold text-[#0f172a] md:text-4xl">
            Escolha o plano ideal para o momento da sua empresa.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[#64748b]">
            Comece com visibilidade essencial, avance para análises mais profundas e evolua para relatórios personalizados
            conforme o negócio cresce.
          </p>

          <div className="mx-auto mt-8 inline-flex rounded-full border border-[#e2e8f0] bg-white p-1 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
            {(["monthly", "annual"] as const).map((key) => {
              const active = billing === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setBilling(key)}
                  className={[
                    "relative rounded-full px-6 py-2.5 text-sm font-semibold transition",
                    active ? "text-white" : "text-[#64748b] hover:text-[#0f172a]",
                  ].join(" ")}
                >
                  {active ? (
                    <span className="absolute inset-0 rounded-full bg-gradient-to-r from-[#007bff] to-[#00d4ff] shadow-[0_4px_20px_rgba(0,123,255,0.35)]" />
                  ) : null}
                  <span className="relative">{key === "monthly" ? "Mensal" : "Anual"}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-sm font-medium text-[#007bff]">
            Economize 20% no plano anual e ganhe onboarding prioritário.
          </p>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {plans.map((plan, i) => {
              const price = billing === "monthly" ? plan.monthlyPrice : plan.annualPrice;
              return (
                <motion.article
                  key={plan.slug}
                  initial={{ opacity: 0, y: 22 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: reduceMotion ? 0 : i * 0.08 }}
                  whileHover={reduceMotion ? undefined : { y: -8 }}
                  className={[
                    "relative flex flex-col rounded-[1.5rem] border bg-white p-7 text-left shadow-[0_16px_48px_rgba(15,23,42,0.08)]",
                    plan.featured
                      ? "border-[#7dd3fc] ring-2 ring-[#bae6fd]/60"
                      : "border-[#e2e8f0]",
                  ].join(" ")}
                >
                  {plan.featured ? (
                    <span className="absolute right-5 top-5 rounded-full bg-[#e0f2fe] px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-[#0369a1]">
                      Mais popular
                    </span>
                  ) : null}
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#1e3a5f]">{plan.name}</p>
                  <div className="mt-4 flex flex-wrap items-baseline gap-1">
                    <span className="text-4xl font-bold tracking-tight text-[#0f172a]">{price}</span>
                    {plan.suffix ? <span className="text-sm text-[#64748b]">{plan.suffix}</span> : null}
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-[#64748b]">{plan.description}</p>
                  <Link
                    href={plan.href}
                    className={[
                      "mt-8 inline-flex min-h-11 w-full items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition",
                      plan.featured
                        ? "bg-gradient-to-r from-[#007bff] to-[#00d4ff] text-white shadow-[0_12px_32px_rgba(0,123,255,0.35)] hover:brightness-[1.05]"
                        : "border border-[#e2e8f0] bg-white text-[#334155] hover:border-[#cbd5e1] hover:bg-[#f8fafc]",
                    ].join(" ")}
                  >
                    {plan.cta}
                  </Link>
                  <ul className="mt-8 space-y-3 text-sm text-[#64748b]">
                    {plan.features.map((f) => (
                      <li key={f} className="flex gap-2">
                        <CheckIcon />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </motion.article>
              );
            })}
          </div>
        </section>
      </Container>

      <Container className="max-w-7xl pt-20 md:pb-4 md:pt-28">
        <motion.section
          id="demo"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.65, ease: easeOut }}
          className="rounded-[2rem] border border-[#e2e8f0] bg-gradient-to-r from-[#e0f2fe] to-[#fffbeb] p-8 shadow-[0_24px_64px_rgba(15,23,42,0.1)] md:p-10"
        >
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1e40af]">
                Pronto para elevar sua visibilidade?
              </p>
              <h2 className="mt-4 font-[family-name:var(--font-marketing-display)] text-2xl font-semibold leading-tight text-[#0f172a] md:text-3xl">
                Dê ao seu negócio uma visão mais clara sobre lucro, margem e performance de vendas.
              </h2>
            </div>
            <motion.div whileHover={reduceMotion ? undefined : { scale: 1.03 }} whileTap={{ scale: 0.98 }}>
              <Link
                href="/sign-in"
                className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full border border-[#e2e8f0] bg-white px-8 py-3 text-sm font-semibold text-[#334155] shadow-[0_10px_32px_rgba(15,23,42,0.08)] transition hover:shadow-[0_14px_40px_rgba(15,23,42,0.12)]"
              >
                Agendar demonstração
              </Link>
            </motion.div>
          </div>
        </motion.section>
      </Container>
    </main>
  );
}
