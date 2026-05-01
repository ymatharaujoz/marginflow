"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "./utils";

export type DropdownItem = {
  danger?: boolean;
  id: string;
  label: string;
  icon?: ReactNode;
};

export type DropdownProps = {
  align?: "left" | "right";
  className?: string;
  items: DropdownItem[];
  onSelect: (id: string) => void;
  trigger: ReactNode;
};

export function Dropdown({ align = "right", className, items, onSelect, trigger }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className={cn("relative inline-flex", className)} ref={ref}>
      <button
        className="inline-flex items-center"
        onClick={() => setOpen(!open)}
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
      >
        {trigger}
      </button>

      {open && (
        <div
          className={cn(
            "absolute top-full z-50 mt-2 min-w-[180px] rounded-[var(--radius-md)] border border-border bg-surface-strong p-1.5 shadow-[var(--shadow-lg)] animate-rise-in",
            align === "right" ? "right-0" : "left-0",
          )}
          role="menu"
        >
          {items.map((item) => (
            <button
              key={item.id}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm transition-colors",
                item.danger
                  ? "text-error hover:bg-error-soft"
                  : "text-foreground hover:bg-foreground/[0.04]",
              )}
              onClick={() => {
                onSelect(item.id);
                setOpen(false);
              }}
              role="menuitem"
              type="button"
            >
              {item.icon && <span className="flex h-4 w-4 items-center justify-center text-muted-foreground">{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
