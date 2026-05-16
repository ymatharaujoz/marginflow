"use client";

import { motion, useReducedMotion, useInView } from "framer-motion";
import { useRef } from "react";

// Simple line chart component
function LineChart() {
  const reduceMotion = useReducedMotion();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const points = [30, 45, 35, 55, 48, 62, 58, 75, 68, 82, 78, 88];
  const maxValue = Math.max(...points);
  const minValue = Math.min(...points);
  const range = maxValue - minValue;

  const pathD = points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * 100;
      const y = 100 - ((point - minValue) / range) * 80 - 10;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  const areaD = `${pathD} L 100 100 L 0 100 Z`;

  return (
    <div ref={ref} className="relative h-40 w-full">
      <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible" preserveAspectRatio="none">
        {/* Area under line */}
        <motion.path
          d={areaD}
          fill="url(#areaGradient)"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 0.3 } : { opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 1, delay: 0.5 }}
        />

        {/* Line */}
        <motion.path
          d={pathD}
          fill="none"
          stroke="#0e7a6f"
          strokeWidth="0.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: reduceMotion ? 1 : 0 }}
          animate={isInView ? { pathLength: 1 } : { pathLength: 0 }}
          transition={{ duration: reduceMotion ? 0 : 1.5, ease: [0.16, 1, 0.3, 1] }}
        />

        {/* Gradient definition */}
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0e7a6f" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0e7a6f" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Data points */}
        {points.map((point, index) => {
          const x = (index / (points.length - 1)) * 100;
          const y = 100 - ((point - minValue) / range) * 80 - 10;
          return (
            <motion.circle
              key={index}
              cx={x}
              cy={y}
              r="1"
              fill="#0e7a6f"
              initial={{ opacity: 0, scale: 0 }}
              animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
              transition={{
                duration: 0.3,
                delay: reduceMotion ? 0 : 0.8 + index * 0.05,
              }}
            />
          );
        })}
      </svg>

      {/* X-axis labels */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] text-muted-foreground">
        <span>Jan</span>
        <span>Fev</span>
        <span>Mar</span>
        <span>Abr</span>
        <span>Mai</span>
        <span>Jun</span>
      </div>
    </div>
  );
}

// Performance metrics card - replacing bar chart with meaningful KPIs
function PerformanceMetricsCard() {
  const reduceMotion = useReducedMotion();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const metrics = [
    {
      label: "Taxa de Conversão",
      value: "4.2%",
      change: "+0.8%",
      positive: true,
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      label: "Ticket Médio",
      value: "R$ 156",
      change: "+12%",
      positive: true,
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      label: "Taxa de Retorno",
      value: "2.1%",
      change: "-0.3%",
      positive: true,
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
      color: "text-info",
      bgColor: "bg-info/10",
    },
  ];

  return (
    <div ref={ref} className="grid grid-cols-3 gap-4">
      {metrics.map((metric, index) => (
        <motion.div
          key={metric.label}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{
            duration: reduceMotion ? 0 : 0.5,
            delay: reduceMotion ? 0 : index * 0.1,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="flex flex-col items-center text-center"
        >
          <div className={`flex h-10 w-10 items-center justify-center rounded-full ${metric.bgColor} ${metric.color}`}>
            {metric.icon}
          </div>
          <p className="mt-3 text-2xl font-bold text-foreground">{metric.value}</p>
          <p className="text-xs text-muted-foreground">{metric.label}</p>
          <span className={`mt-1 text-xs font-medium ${metric.positive ? "text-success" : "text-error"}`}>
            {metric.change}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

// Mini table for top products
function TopProductsTable() {
  const products = [
    { name: "Fone Bluetooth Pro", sales: 234, profit: "R$ 8.450", margin: "32%" },
    { name: "Smart Watch X1", sales: 189, profit: "R$ 12.300", margin: "28%" },
    { name: "Carregador Turbo", sales: 156, profit: "R$ 4.680", margin: "41%" },
    { name: "Mouse Gamer RGB", sales: 134, profit: "R$ 3.890", margin: "35%" },
    { name: "Teclado Mecânico", sales: 98, profit: "R$ 7.840", margin: "29%" },
  ];

  return (
    <div className="w-full">
      <div className="grid grid-cols-4 gap-2 border-b border-border pb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        <span>Produto</span>
        <span className="text-right">Vendas</span>
        <span className="text-right">Lucro</span>
        <span className="text-right">Margem</span>
      </div>
      <div className="mt-2 space-y-2">
        {products.map((product, index) => (
          <motion.div
            key={product.name}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.05 }}
            className="grid grid-cols-4 gap-2 text-xs"
          >
            <span className="truncate font-medium text-foreground">{product.name}</span>
            <span className="text-right tabular-nums text-muted-foreground">{product.sales}</span>
            <span className="text-right tabular-nums font-medium text-accent">{product.profit}</span>
            <span className="text-right tabular-nums text-success">{product.margin}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// AI Insights card
function AIInsightsCard() {
  const insights = [
    "Sua margem no Mercado Livre está 12% acima da média do mercado",
    "3 produtos estão com margem negativa e precisam de atenção",
    "O ticket médio cresceu 8% em relação ao mês anterior",
  ];

  return (
    <div className="rounded-xl border border-accent/20 bg-gradient-to-br from-accent/[0.03] to-transparent p-4">
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/10">
          <svg className="h-3.5 w-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
            />
          </svg>
        </div>
        <span className="text-xs font-semibold text-accent">Insights com IA</span>
      </div>
      <ul className="mt-3 space-y-2">
        {insights.map((insight, index) => (
          <motion.li
            key={index}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className="flex items-start gap-2 text-xs text-muted-foreground"
          >
            <span className="mt-1.5 h-1 w-1 rounded-full bg-accent" />
            {insight}
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

// Main Dashboard Showcase Component
export function DashboardShowcase() {
  const reduceMotion = useReducedMotion();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="relative overflow-hidden py-24 md:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "linear-gradient(to bottom, transparent 0%, var(--background) 8%, var(--background-soft) 24%, var(--background-elevated) 100%)",
        }}
      />
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-16 text-center"
        >
          <span className="inline-flex items-center rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-accent">
            Dashboard
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground md:text-4xl lg:text-5xl">
            Seu negócio em números reais
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Não adivinhe. Veja lucro real, margem por produto, comparativo entre canais e insights 
            automáticos — tudo atualizado em tempo real
          </p>
        </motion.div>

        {/* Dashboard Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{
            duration: reduceMotion ? 0 : 0.8,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="relative mx-auto max-w-6xl"
        >
          {/* Glow effect behind dashboard */}
          <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-accent/5 via-accent/10 to-accent/5 blur-2xl" />

          {/* Dashboard Container */}
          <div className="relative overflow-hidden rounded-2xl border border-border bg-white shadow-2xl">
            {/* Dashboard Header */}
            <div className="border-b border-border bg-white px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-accent to-accent-strong" />
                  <span className="font-semibold text-foreground">Dashboard</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                  <span className="text-xs text-muted-foreground">Dados atualizados há 5 min</span>
                </div>
              </div>
            </div>

            {/* Dashboard Content */}
            <div className="p-6">
              {/* KPI Cards Row */}
              <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                {[
                  { label: "Receita Total", value: "R$ 124.560", change: "+15%", positive: true },
                  { label: "Lucro Líquido", value: "R$ 48.230", change: "+12%", positive: true },
                  { label: "Margem Média", value: "23.4%", change: "+2.1%", positive: true },
                  { label: "Total de Vendas", value: "1.847", change: "+8%", positive: true },
                ].map((kpi, index) => (
                  <motion.div
                    key={kpi.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                    transition={{
                      duration: 0.5,
                      delay: reduceMotion ? 0 : index * 0.1,
                    }}
                    className="rounded-xl border border-border bg-white p-4 shadow-sm transition-all hover:border-accent/20 hover:shadow-md"
                  >
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                    <p className="mt-1 text-xl font-bold text-foreground">{kpi.value}</p>
                    <p className={`mt-1 text-xs font-medium ${kpi.positive ? "text-success" : "text-error"}`}>
                      {kpi.change} vs mês anterior
                    </p>
                  </motion.div>
                ))}
              </div>

              {/* Charts Row */}
              <div className="mb-6 grid gap-6 lg:grid-cols-2">
                {/* Line Chart Card */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="rounded-xl border border-border bg-white p-5 shadow-sm"
                >
                  <h3 className="mb-4 text-sm font-semibold text-foreground">Evolução de Vendas</h3>
                  <LineChart />
                </motion.div>

                {/* Performance Metrics Card */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="rounded-xl border border-border bg-white p-5 shadow-sm"
                >
                  <h3 className="mb-4 text-sm font-semibold text-foreground">Métricas de Performance</h3>
                  <PerformanceMetricsCard />
                </motion.div>
              </div>

              {/* Bottom Row */}
              <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                {/* Top Products Table */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                  className="rounded-xl border border-border bg-white p-5 shadow-sm"
                >
                  <h3 className="mb-4 text-sm font-semibold text-foreground">Top Produtos</h3>
                  <TopProductsTable />
                </motion.div>

                {/* AI Insights */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                >
                  <AIInsightsCard />
                </motion.div>
              </div>
            </div>
          </div>

          {/* Floating elements */}
          <motion.div
            className="absolute -right-4 top-20 hidden rounded-lg border border-border bg-white p-3 shadow-lg lg:block"
            animate={{
              y: [0, -10, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10">
                <svg className="h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-medium text-foreground">Meta atingida!</p>
                <p className="text-[10px] text-muted-foreground">+23% vs meta mensal</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="absolute -left-4 bottom-32 hidden rounded-lg border border-border bg-white p-3 shadow-lg lg:block"
            animate={{
              y: [0, 10, 0],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1,
            }}
          >
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-accent" />
              <p className="text-xs font-medium text-foreground">Sync realizado</p>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">Há 5 minutos</p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
