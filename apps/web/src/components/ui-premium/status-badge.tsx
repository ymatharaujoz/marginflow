"use client";

import { motion } from "framer-motion";

type StatusType = "active" | "inactive" | "pending" | "warning" | "error" | "success";

interface StatusBadgeProps {
  status: StatusType;
  label: string;
  showDot?: boolean;
  className?: string;
}

const statusConfig = {
  active: {
    dotColor: "bg-success",
    bgColor: "bg-success-soft",
    textColor: "text-green-700",
    borderColor: "border-green-600/12",
  },
  success: {
    dotColor: "bg-success",
    bgColor: "bg-success-soft",
    textColor: "text-green-700",
    borderColor: "border-green-600/12",
  },
  inactive: {
    dotColor: "bg-muted",
    bgColor: "bg-foreground/6",
    textColor: "text-muted-foreground",
    borderColor: "border-foreground/8",
  },
  pending: {
    dotColor: "bg-info",
    bgColor: "bg-info-soft",
    textColor: "text-blue-700",
    borderColor: "border-blue-600/12",
  },
  warning: {
    dotColor: "bg-warning",
    bgColor: "bg-warning-soft",
    textColor: "text-amber-700",
    borderColor: "border-amber-600/12",
  },
  error: {
    dotColor: "bg-error",
    bgColor: "bg-error-soft",
    textColor: "text-red-700",
    borderColor: "border-red-600/12",
  },
};

export function StatusBadge({
  status,
  label,
  showDot = true,
  className = "",
}: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span className={`
      inline-flex items-center gap-1.5 rounded-[var(--radius-full)] 
      border px-2.5 py-0.5 text-xs font-medium
      ${config.bgColor} ${config.textColor} ${config.borderColor}
      ${className}
    `}>
      {showDot && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={`h-1.5 w-1.5 rounded-full ${config.dotColor}`}
        />
      )}
      {label}
    </span>
  );
}
