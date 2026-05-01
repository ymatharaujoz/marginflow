import type { ButtonHTMLAttributes, ReactElement, ReactNode } from "react";
import { cloneElement, isValidElement } from "react";
import { cn } from "./utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  children: ReactNode;
  loading?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-accent-foreground shadow-[var(--shadow-sm)] hover:bg-accent-strong active:scale-[0.97]",
  secondary:
    "border border-border bg-surface-strong text-foreground hover:border-border-strong hover:bg-background-soft active:scale-[0.97]",
  ghost:
    "text-foreground-soft hover:bg-accent-soft hover:text-foreground active:scale-[0.97]",
  danger:
    "bg-error text-white shadow-[var(--shadow-sm)] hover:bg-red-700 active:scale-[0.97]",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "min-h-8 gap-1.5 rounded-[var(--radius-sm)] px-3 py-1.5 text-xs",
  md: "min-h-10 gap-2 rounded-[var(--radius-md)] px-4 py-2 text-sm",
  lg: "min-h-12 gap-2.5 rounded-[var(--radius-lg)] px-6 py-3 text-base",
};

const baseStyle =
  "inline-flex items-center justify-center font-semibold transition-all duration-[var(--transition-fast)] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        fill="currentColor"
      />
    </svg>
  );
}

export function Button({
  asChild = false,
  children,
  className,
  disabled,
  loading = false,
  size = "md",
  variant = "primary",
  ...props
}: ButtonProps) {
  const combinedClassName = cn(
    baseStyle,
    variantStyles[variant],
    sizeStyles[size],
    loading && "pointer-events-none",
    className,
  );

  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<{ className?: string }>;
    return cloneElement(child, {
      className: cn(combinedClassName, child.props.className),
    });
  }

  return (
    <button
      className={combinedClassName}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}
