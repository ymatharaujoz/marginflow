"use client";

import { motion } from "framer-motion";
import { 
  TrendingUp, 
  AlertTriangle, 
  Clock, 
  Lightbulb, 
  Info,
  Sparkles
} from "lucide-react";
import { slideInLeftVariants } from "@/lib/animations";
import { Badge } from "@marginflow/ui";

type InsightType = "growth" | "alert" | "tip" | "info" | "ai";
type Priority = "high" | "medium" | "low";

interface InsightCardProps {
  type: InsightType;
  title: string;
  description: string;
  priority?: Priority;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const typeConfig = {
  growth: {
    icon: TrendingUp,
    iconBg: "bg-success/10",
    iconColor: "text-success",
    borderColor: "border-l-success",
    gradient: "from-success/5",
  },
  alert: {
    icon: AlertTriangle,
    iconBg: "bg-warning/10",
    iconColor: "text-warning",
    borderColor: "border-l-warning",
    gradient: "from-warning/5",
  },
  tip: {
    icon: Lightbulb,
    iconBg: "bg-accent/10",
    iconColor: "text-accent",
    borderColor: "border-l-accent",
    gradient: "from-accent/5",
  },
  info: {
    icon: Info,
    iconBg: "bg-info/10",
    iconColor: "text-info",
    borderColor: "border-l-info",
    gradient: "from-info/5",
  },
  ai: {
    icon: Sparkles,
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-600",
    borderColor: "border-l-purple-500",
    gradient: "from-purple-500/5",
  },
};

const priorityConfig = {
  high: { variant: "error" as const, label: "Alta" },
  medium: { variant: "warning" as const, label: "Média" },
  low: { variant: "neutral" as const, label: "Baixa" },
};

export function InsightCard({
  type,
  title,
  description,
  priority,
  action,
  className = "",
}: InsightCardProps) {
  const config = typeConfig[type];
  const Icon = config.icon;
  const priorityBadge = priority ? priorityConfig[priority] : null;

  return (
    <motion.div
      variants={slideInLeftVariants}
      className={`
        group relative overflow-hidden rounded-lg
        border border-border bg-white
        p-3 transition-all duration-[var(--transition-normal)]
        hover:shadow-[var(--shadow-sm)] hover:border-border-strong
        ${className}
      `}
    >
      <div className="flex items-start gap-2.5">
        <div className={`
          flex h-7 w-7 shrink-0 items-center justify-center rounded-md
          ${config.iconBg} ${config.iconColor}
        `}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4 className="text-xs font-semibold text-foreground">
              {title}
            </h4>
            {priorityBadge && (
              <Badge variant={priorityBadge.variant} className="text-[9px] px-1.5 py-0">
                {priorityBadge.label}
              </Badge>
            )}
          </div>
          
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground whitespace-pre-line">
            {description}
          </p>
          
          {action && (
            <button
              onClick={action.onClick}
              className="mt-1.5 text-[11px] font-medium text-accent hover:text-accent-strong transition-colors"
            >
              {action.label} →
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
