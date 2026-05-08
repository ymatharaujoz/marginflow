"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { itemVariants, hoverTransition } from "@/lib/animations";

interface StatCardProps {
  label: string;
  value: string;
  trend?: {
    direction: "up" | "down" | "neutral";
    value: string;
    label?: string;
  };
  icon?: React.ReactNode;
  variant?: "default" | "accent" | "success" | "warning";
  className?: string;
}

const variantStyles = {
  default: "border-border bg-surface-strong",
  accent: "border-accent/20 bg-accent-soft/30",
  success: "border-success/20 bg-success-soft/30",
  warning: "border-warning/20 bg-warning-soft/30",
};

const iconBgStyles = {
  default: "bg-foreground/5 text-muted-foreground",
  accent: "bg-accent/10 text-accent",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
};

export function StatCard({
  label,
  value,
  trend,
  icon,
  variant = "default",
  className = "",
}: StatCardProps) {
  const TrendIcon = trend?.direction === "up" 
    ? TrendingUp 
    : trend?.direction === "down" 
      ? TrendingDown 
      : Minus;
  
  const trendColorClass = trend?.direction === "up" 
    ? "text-success" 
    : trend?.direction === "down" 
      ? "text-error" 
      : "text-muted-foreground";

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ 
        y: -2, 
        boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
        transition: hoverTransition,
      }}
      className={`
        relative overflow-hidden rounded-[var(--radius-lg)] border p-5
        shadow-[var(--shadow-xs)] transition-colors
        ${variantStyles[variant]}
        ${className}
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {icon && (
              <span className={`
                inline-flex h-5 w-5 items-center justify-center rounded-md
                ${iconBgStyles[variant]}
              `}>
                {icon}
              </span>
            )}
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
          </div>
          
          <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]">
            {value}
          </p>
          
          {trend && (
            <div className="mt-2 flex items-center gap-1.5">
              <TrendIcon className={`h-3.5 w-3.5 ${trendColorClass}`} />
              <span className={`text-xs font-medium ${trendColorClass}`}>
                {trend.value}
              </span>
              {trend.label && (
                <span className="text-xs text-muted-foreground">
                  {trend.label}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
