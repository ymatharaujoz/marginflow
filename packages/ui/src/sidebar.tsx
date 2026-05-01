"use client";

import type { ReactNode } from "react";
import { cn } from "./utils";

export type SidebarLink = {
  active?: boolean;
  href: string;
  icon?: ReactNode;
  label: string;
};

export type SidebarProps = {
  bottomSection?: ReactNode;
  className?: string;
  collapsed?: boolean;
  links: SidebarLink[];
  logo?: ReactNode;
  onNavigate?: (href: string) => void;
};

export function Sidebar({
  bottomSection,
  className,
  collapsed = false,
  links,
  logo,
  onNavigate,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-border bg-surface-strong transition-all duration-[var(--transition-normal)]",
        collapsed ? "w-16" : "w-60",
        className,
      )}
    >
      {logo && (
        <div className={cn("flex h-16 items-center border-b border-border", collapsed ? "justify-center px-2" : "px-5")}>
          {logo}
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-1">
          {links.map((link) => (
            <li key={link.href}>
              <a
                className={cn(
                  "flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium transition-all duration-[var(--transition-fast)]",
                  link.active
                    ? "bg-accent-soft text-accent-strong"
                    : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground",
                  collapsed && "justify-center px-0",
                )}
                href={link.href}
                onClick={(e) => {
                  if (onNavigate) {
                    e.preventDefault();
                    onNavigate(link.href);
                  }
                }}
              >
                {link.icon && (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                    {link.icon}
                  </span>
                )}
                {!collapsed && <span>{link.label}</span>}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {bottomSection && (
        <div className={cn("border-t border-border p-3", collapsed && "px-2")}>
          {bottomSection}
        </div>
      )}
    </aside>
  );
}
