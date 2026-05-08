"use client";

import { motion, useReducedMotion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";

interface MetricCardProps {
  value: string;
  label: string;
  suffix?: string;
  prefix?: string;
  delay: number;
}

function AnimatedNumber({ value, prefix = "", suffix = "" }: { value: string; prefix?: string; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const reduceMotion = useReducedMotion();

  // Extract numeric part from value (e.g., "+18.4%" -> 18.4, "3" -> 3)
  const numericValue = parseFloat(value.replace(/[^0-9.]/g, "")) || 0;
  const isPercentage = value.includes("%");
  const isDecimal = value.includes(".");

  useEffect(() => {
    if (!isInView) return;

    if (reduceMotion) {
      setDisplayValue(numericValue);
      return;
    }

    const duration = 1500; // ms
    const steps = 60;
    const stepValue = numericValue / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        setDisplayValue(numericValue);
        clearInterval(timer);
      } else {
        setDisplayValue(stepValue * currentStep);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [isInView, numericValue, reduceMotion]);

  const formattedValue = isDecimal
    ? displayValue.toFixed(1)
    : Math.round(displayValue).toString();

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {formattedValue}
      {isPercentage ? "%" : ""}
      {suffix}
    </span>
  );
}

function MetricCard({ value, label, suffix = "", prefix = "", delay }: MetricCardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.6,
        delay: delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      whileHover={reduceMotion ? undefined : { y: -4, transition: { duration: 0.2 } }}
      className="group relative overflow-hidden rounded-xl border border-border bg-white p-5 shadow-sm transition-all duration-300 hover:border-accent/20 hover:shadow-md"
    >
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.02] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative">
        <p className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          <AnimatedNumber value={value} prefix={prefix} suffix={suffix} />
        </p>
        <p className="mt-1.5 text-sm font-medium text-muted-foreground">{label}</p>
      </div>

      {/* Accent line at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-accent/0 via-accent/30 to-accent/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </motion.div>
  );
}

interface HeroMetricsProps {
  metrics?: Array<{
    value: string;
    label: string;
    prefix?: string;
    suffix?: string;
  }>;
}

const defaultMetrics = [
  { value: "18.4%", label: "Aumento médio na margem de lucro", prefix: "+" },
  { value: "500+", label: "Empresas usando a plataforma", suffix: "+" },
  { value: "3", label: "Marketplaces integrados", suffix: "" },
];

export function HeroMetrics({ metrics = defaultMetrics }: HeroMetricsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {metrics.map((metric, index) => (
        <MetricCard
          key={metric.label}
          value={metric.value}
          label={metric.label}
          prefix={metric.prefix}
          suffix={metric.suffix}
          delay={0.5 + index * 0.1}
        />
      ))}
    </div>
  );
}

// Dashboard preview metrics (used in the hero dashboard mockup)
export function DashboardMetrics() {
  const reduceMotion = useReducedMotion();

  const metrics = [
    { label: "Lucro Líquido", value: "R$ 48,2 mil", change: "+12.6%", positive: true },
    { label: "Margem Bruta", value: "23.4%", change: "+2.1%", positive: true },
    { label: "Vendas", value: "1.284", change: "+8.3%", positive: true },
    { label: "Ticket Médio", value: "R$ 156", change: "-1.2%", positive: false },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {metrics.map((metric, index) => (
        <motion.div
          key={metric.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.5,
            delay: 0.8 + index * 0.1,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="rounded-lg border border-border bg-white/95 p-3 shadow-sm"
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
            <span className="tabular-nums text-foreground">{item.value}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted/30">
            <motion.div
              className={`h-full rounded-full bg-gradient-to-r ${item.color}`}
              initial={{ width: reduceMotion ? `${item.value}%` : 0 }}
              whileInView={{ width: `${item.value}%` }}
              viewport={{ once: true }}
              transition={{
                duration: 1.2,
                delay: index * 0.15,
                ease: [0.16, 1, 0.3, 1],
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
