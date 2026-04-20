import type { HTMLAttributes } from "react";

function mergeClassNames(...parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={mergeClassNames(
        "rounded-[var(--radius-lg)] border border-border bg-surface p-6 shadow-[var(--shadow-card)] backdrop-blur",
        className,
      )}
      {...props}
    />
  );
}
