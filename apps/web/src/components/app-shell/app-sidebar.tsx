"use client";

import { usePathname, useRouter } from "next/navigation";
import { Avatar } from "@marginflow/ui";

type AppSidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
  user: {
    email: string;
    image: string | null;
    name: string;
  };
  organization: {
    name: string;
  };
};

const navLinks = [
  {
    href: "/app",
    label: "Painel",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    ),
  },
  {
    href: "/app/products",
    label: "Produtos",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
        <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
      </svg>
    ),
  },
  {
    href: "/app/integrations",
    label: "Integrações",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
        <line x1="4" y1="22" x2="4" y2="15" />
      </svg>
    ),
  },
  {
    href: "/app/billing",
    label: "Assinatura",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
  },
];

function cn(...parts: Array<string | undefined | null | false>) {
  return parts.filter(Boolean).join(" ");
}

export function AppSidebar({ collapsed, onToggle, user, organization }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  function isActive(href: string) {
    if (href === "/app") return pathname === "/app";
    return pathname.startsWith(href);
  }

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-border bg-surface-strong/80 backdrop-blur-md transition-all duration-[var(--transition-normal)]",
        collapsed ? "w-[68px]" : "w-[240px]",
      )}
    >
      {/* Logo / brand */}
      <div className={cn("flex h-16 items-center border-b border-border", collapsed ? "justify-center" : "px-5")}>
        <button onClick={onToggle} type="button" className="flex items-center gap-2.5 text-foreground hover:text-accent transition-colors" aria-label="Alternar menu lateral">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          {!collapsed && <span className="text-sm font-bold tracking-tight">MarginFlow</span>}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-1">
          {navLinks.map((link) => (
            <li key={link.href}>
              <button
                className={cn(
                  "flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium transition-all duration-[var(--transition-fast)]",
                  isActive(link.href)
                    ? "bg-accent-soft text-accent-strong shadow-[var(--shadow-xs)]"
                    : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground",
                  collapsed && "justify-center px-2",
                )}
                onClick={() => router.push(link.href)}
                type="button"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                  {link.icon}
                </span>
                {!collapsed && <span>{link.label}</span>}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* User section */}
      <div className={cn("border-t border-border p-3", collapsed ? "flex justify-center" : "")}>
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <Avatar
            fallback={user.name}
            size="sm"
            src={user.image || undefined}
            alt={user.name}
          />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{organization.name}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
