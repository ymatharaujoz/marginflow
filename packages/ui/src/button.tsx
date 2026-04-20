import type { ButtonHTMLAttributes, ReactElement, ReactNode } from "react";
import { cloneElement, isValidElement } from "react";

type ButtonVariant = "primary" | "secondary";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  children: ReactNode;
  variant?: ButtonVariant;
};

const variantClassNames: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-accent-foreground shadow-[var(--shadow-card)] hover:bg-accent-strong",
  secondary:
    "border border-border bg-surface-strong text-foreground hover:border-border-strong hover:bg-background-soft",
};

const baseClassName =
  "inline-flex min-h-11 items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition-colors duration-200";

function mergeClassNames(...parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function Button({
  asChild = false,
  children,
  className,
  variant = "primary",
  ...props
}: ButtonProps) {
  const nextClassName = mergeClassNames(baseClassName, variantClassNames[variant], className);

  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<{ className?: string }>;

    return cloneElement(child, {
      className: mergeClassNames(nextClassName, child.props.className),
    });
  }

  return (
    <button className={nextClassName} {...props}>
      {children}
    </button>
  );
}
