import type { HTMLAttributes } from "react";
import { cn } from "./utils";

type BadgeVariant = "neutral" | "accent" | "success" | "warning" | "error" | "info";

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

const variantStyles: Record<BadgeVariant, string> = {
  neutral: "bg-foreground/6 text-foreground-soft border-foreground/8",
  accent: "bg-accent-soft text-accent-strong border-accent/12",
  success: "bg-success-soft text-green-700 border-green-600/12",
  warning: "bg-warning-soft text-amber-700 border-amber-600/12",
  error: "bg-error-soft text-red-700 border-red-600/12",
  info: "bg-info-soft text-blue-700 border-blue-600/12",
};

export function Badge({ className, variant = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-[var(--radius-full)] border px-2.5 py-0.5 text-xs font-medium",
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  );
}
