import type { HTMLAttributes } from "react";
import { cn } from "./utils";

type CardVariant = "default" | "elevated" | "outlined" | "interactive";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  padding?: "none" | "sm" | "md" | "lg";
  variant?: CardVariant;
};

const variantStyles: Record<CardVariant, string> = {
  default:
    "border border-border bg-surface-strong shadow-[var(--shadow-card)] backdrop-blur-sm",
  elevated:
    "border border-border bg-surface-strong shadow-[var(--shadow-lg)]",
  outlined:
    "border border-border-strong bg-transparent",
  interactive:
    "border border-border bg-surface-strong shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:border-border-strong transition-all duration-[var(--transition-normal)] cursor-pointer",
};

const paddingStyles: Record<NonNullable<CardProps["padding"]>, string> = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function Card({
  className,
  padding = "md",
  variant = "default",
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)]",
        variantStyles[variant],
        paddingStyles[padding],
        className,
      )}
      {...props}
    />
  );
}
