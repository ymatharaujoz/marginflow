"use client";

import { type ReactNode, useState } from "react";
import { cn } from "./utils";

export type TooltipProps = {
  children: ReactNode;
  className?: string;
  content: string;
  position?: "top" | "bottom";
};

export function Tooltip({ children, className, content, position = "top" }: TooltipProps) {
  const [visible, setVisible] = useState(false);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span
          className={cn(
            "absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-[var(--radius-sm)] bg-foreground px-2.5 py-1.5 text-xs font-medium text-background shadow-[var(--shadow-md)] animate-fade-in",
            position === "top" ? "bottom-full mb-2" : "top-full mt-2",
            className,
          )}
          role="tooltip"
        >
          {content}
        </span>
      )}
    </span>
  );
}
