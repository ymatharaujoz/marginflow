"use client";

import { motion } from "framer-motion";

type PeriodValue = "7d" | "30d" | "90d" | "12m";

interface PeriodSelectorProps {
  value: PeriodValue;
  onChange: (value: PeriodValue) => void;
  className?: string;
}

const periods: { value: PeriodValue; label: string }[] = [
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "90d", label: "3 meses" },
  { value: "12m", label: "12 meses" },
];

export function PeriodSelector({ value, onChange, className = "" }: PeriodSelectorProps) {
  return (
    <div className={`inline-flex items-center rounded-[var(--radius-md)] bg-surface-strong border border-border p-1 ${className}`}>
      {periods.map((period) => (
        <button
          key={period.value}
          onClick={() => onChange(period.value)}
          type="button"
          className="relative px-3 py-1.5 text-xs font-medium transition-colors"
        >
          {value === period.value && (
            <motion.div
              layoutId="period-selector"
              className="absolute inset-0 rounded-md bg-white shadow-[var(--shadow-sm)] border border-border/50"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <span className={`relative z-10 ${value === period.value ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {period.label}
          </span>
        </button>
      ))}
    </div>
  );
}
