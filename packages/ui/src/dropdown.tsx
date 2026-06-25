"use client";

import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  menuClassName?: string;
  onSelect: (id: string) => void;
  trigger: ReactNode;
};

type MenuPosition = {
  left: number;
  top: number;
  width: number;
};

export function Dropdown({ align = "right", className, items, menuClassName, onSelect, trigger }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const [mounted, setMounted] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;

    function recalc() {
      const trigger = wrapperRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      setPosition({
        left: align === "right" ? rect.right : rect.left,
        top: rect.bottom + 8,
        width: rect.width,
      });
    }

    recalc();

    window.addEventListener("resize", recalc);
    window.addEventListener("scroll", recalc, true);
    return () => {
      window.removeEventListener("resize", recalc);
      window.removeEventListener("scroll", recalc, true);
    };
  }, [open, align]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (
        wrapperRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const menu = open && position && mounted ? (
    <div
      ref={menuRef}
      className={cn(
        "fixed z-[1000] mt-0 max-h-[320px] overflow-y-auto rounded-[var(--radius-md)] border border-border bg-surface-strong p-1.5 shadow-[var(--shadow-lg)] animate-rise-in [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-foreground/15 hover:[&::-webkit-scrollbar-thumb]:bg-foreground/30",
        align === "right" ? "-translate-x-full" : "translate-x-0",
        menuClassName,
      )}
      role="menu"
      style={{ left: position.left, minWidth: Math.max(position.width, 180), top: position.top }}
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
  ) : null;

  return (
    <div className={cn("relative inline-flex", className)} ref={wrapperRef}>
      <button
        className="inline-flex items-center"
        onClick={() => setOpen((value) => !value)}
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
      >
        {trigger}
      </button>

      {mounted && menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
