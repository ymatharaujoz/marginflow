"use client";

import { motion, useReducedMotion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";

interface MetricCardProps {
  value: string;
  label: string;
  suffix?: string;
  prefix?: string;
  delay: number;
  highlight?: boolean;
}

function AnimatedCounter({ 
  value, 
  prefix = "", 
  suffix = "" 
}: { 
  value: string; 
  prefix?: string; 
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const reduceMotion = useReducedMotion();
  
  const numericValue = parseFloat(value.replace(/[^0-9.]/g, "")) || 0;
  const isPercentage = value.includes("%");
  const isDecimal = value.includes(".");
  const isCurrency = prefix.includes("R$");
  
  const formattedTarget = isCurrency 
    ? numericValue.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    : isDecimal
      ? numericValue.toFixed(1)
      : Math.round(numericValue).toLocaleString("pt-BR");

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {isInView && !reduceMotion ? (
        <CountUpAnimation 
          target={numericValue} 
          isDecimal={isDecimal} 
          isCurrency={isCurrency}
          duration={2000}
        />
      ) : (
        formattedTarget
      )}
      {isPercentage ? "%" : ""}
      {suffix}
    </span>
  );
}

function CountUpAnimation({ 
  target, 
  isDecimal, 
  isCurrency,
  duration = 2000 
}: { 
  target: number; 
  isDecimal: boolean; 
  isCurrency: boolean;
  duration?: number;
}) {
  const [count, setCount] = useState(0);
  const startTime = useRef<number | null>(null);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp;
      const elapsed = timestamp - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(target * eased);

      if (progress < 1) {
        rafId.current = requestAnimationFrame(animate);
      }
    };

    rafId.current = requestAnimationFrame(animate);

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [target, duration]);

  const formatted = isCurrency 
    ? count.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    : isDecimal
      ? count.toFixed(1)
      : Math.round(count).toLocaleString("pt-BR");

  return <>{formatted}</>;
}

function MetricCard({ value, label, suffix = "", prefix = "", delay, highlight = false }: MetricCardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.7,
        delay: delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      whileHover={reduceMotion ? undefined : { y: -4, transition: { duration: 0.2 } }}
      className={`group relative flex flex-col overflow-hidden rounded-xl border p-4 shadow-sm transition-all duration-300 ${
        highlight 
          ? "border-accent/20 bg-gradient-to-br from-accent/[0.04] to-white hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5" 
          : "border-border bg-white hover:border-accent/20 hover:shadow-md"
      }`}
    >
      {/* Animated gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.03] to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      
      {/* Top accent line for highlighted card */}
      {highlight && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-accent/0 via-accent/40 to-accent/0" />
      )}

      <div className="relative flex flex-1 flex-col">
        <p className={`text-xl font-bold tracking-tight md:text-2xl ${highlight ? "text-accent" : "text-foreground"}`}>
          <AnimatedCounter value={value} prefix={prefix} suffix={suffix} />
        </p>
        <p className="mt-2 flex-1 text-xs font-medium leading-relaxed text-muted-foreground">{label}</p>
        
        {/* Mini indicator */}
        <motion.div 
          className="mt-3 flex items-center gap-1.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + 0.5 }}
        >
          <div className={`h-1.5 w-1.5 rounded-full ${highlight ? "bg-accent" : "bg-success"} animate-pulse`} />
          <span className="text-[10px] font-medium text-muted-foreground/60">
            {highlight ? "Tempo real" : "Atualizado"}
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}

interface HeroMetricsProps {
  metrics?: Array<{
    value: string;
    label: string;
    prefix?: string;
    suffix?: string;
    highlight?: boolean;
  }>;
}

const defaultMetrics = [
  { value: "18.4", label: "Aumento médio na margem de lucro", prefix: "+", suffix: "%", highlight: true },
  { value: "15", label: "Empresas usando a plataforma", suffix: "+", highlight: false },
  { value: "3", label: "Marketplaces integrados", suffix: "+", highlight: false },
  { value: "3", label: "Minutos para começar a usar", prefix: "", suffix: " min", highlight: false },
];

export function HeroMetrics({ metrics = defaultMetrics }: HeroMetricsProps) {
  return (
    <div className="grid grid-cols-2 items-stretch gap-3 sm:grid-cols-4">
      {metrics.map((metric, index) => (
        <MetricCard
          key={metric.label}
          value={metric.value}
          label={metric.label}
          prefix={metric.prefix}
          suffix={metric.suffix}
          highlight={metric.highlight}
          delay={0.5 + index * 0.12}
        />
      ))}
    </div>
  );
}

// Dashboard preview metrics (used in the hero dashboard mockup)
export function DashboardMetrics() {
  const metrics = [
    { label: "Lucro Líquido", value: "R$ 48,2 mil", change: "+12.6%", positive: true },
    { label: "Margem Bruta", value: "23.4%", change: "+2.1 p.p.", positive: true },
    { label: "Vendas", value: "1.284", change: "+8.3%", positive: true },
    { label: "Ticket Médio", value: "R$ 156", change: "-1.2%", positive: false },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {metrics.map((metric, index) => (
        <motion.div
          key={metric.label}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            duration: 0.6,
            delay: 0.8 + index * 0.12,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="rounded-xl border border-border bg-white/95 p-3 shadow-sm"
        >
          <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
          <p className="mt-1 text-lg font-bold text-foreground md:text-xl">{metric.value}</p>
          <p
            className={`mt-0.5 text-xs font-medium ${
              metric.positive ? "text-success" : "text-error"
            }`}
          >
            {metric.change} vs mês anterior
          </p>
        </motion.div>
      ))}
    </div>
  );
}

// Animated progress bars for the dashboard preview
export function ProgressMetrics() {
  const reduceMotion = useReducedMotion();

  const items = [
    { label: "Lucro líquido", value: 84, color: "from-accent to-emerald-500" },
    { label: "Margem bruta", value: 78, color: "from-accent to-teal-500" },
    { label: "Meta de vendas", value: 91, color: "from-accent to-cyan-500" },
  ];

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={item.label} className="space-y-2">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-muted-foreground">{item.label}</span>
            <motion.span 
              className="tabular-nums text-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 + index * 0.2 }}
            >
              {item.value}%
            </motion.span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted/30">
            <motion.div
              className={`h-full rounded-full bg-gradient-to-r ${item.color}`}
              initial={{ width: reduceMotion ? `${item.value}%` : 0 }}
              whileInView={{ width: `${item.value}%` }}
              viewport={{ once: true }}
              transition={{
                duration: 1.4,
                delay: index * 0.2,
                ease: [0.16, 1, 0.3, 1],
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
