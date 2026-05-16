"use client";

import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, X } from "lucide-react";
import { Avatar } from "@marginflow/ui";
import { PUBLIC_BRAND } from "@/lib/public-branding";

// Refined icons with consistent 1.5 stroke width
const DashboardIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
  </svg>
);

const ProductsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const IntegrationsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
  </svg>
);

const BillingIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="3" />
    <line x1="2" y1="10" x2="22" y2="10" />
  </svg>
);

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
  isMobile?: boolean;
};

const navLinks = [
  {
    href: "/app",
    label: "Painel",
    icon: DashboardIcon,
  },
  {
    href: "/app/products",
    label: "Produtos",
    icon: ProductsIcon,
  },
  {
    href: "/app/integrations",
    label: "Integrações",
    icon: IntegrationsIcon,
  },
  {
    href: "/app/billing",
    label: "Assinatura",
    icon: BillingIcon,
  },
];

function cn(...parts: Array<string | undefined | null | false>) {
  return parts.filter(Boolean).join(" ");
}

export function AppSidebar({ collapsed, onToggle, user, organization, isMobile = false }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  function isActive(href: string) {
    if (href === "/app") return pathname === "/app";
    return pathname.startsWith(href);
  }

  return (
    <aside
      className={cn(
        "relative flex h-full flex-col border-r border-border bg-surface-strong/95 backdrop-blur-xl",
        "transition-all duration-[var(--transition-normal)] ease-out",
        collapsed ? "w-[68px]" : "w-[240px]",
      )}
    >
      {/* Logo / Brand */}
      <div className={cn(
        "flex h-16 items-center border-b border-border",
        collapsed ? "justify-center px-2" : "justify-between px-4"
      )}>
        <button
          onClick={onToggle}
          type="button"
          className={cn(
            "group flex items-center gap-3 text-foreground transition-colors",
            collapsed && "justify-center"
          )}
          aria-label="Alternar menu lateral"
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-gradient-to-br from-accent to-accent-strong text-xs font-bold text-white shadow-[0_2px_8px_rgba(14,122,111,0.25)]"
          >
            {PUBLIC_BRAND.icon}
          </motion.div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="text-sm font-bold tracking-tight"
              >
                {PUBLIC_BRAND.name}
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* Mobile close button */}
        {isMobile && (
          <button
            onClick={onToggle}
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground transition-colors"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        <ul className="flex flex-col gap-0.5">
          {navLinks.map((link, index) => {
            const active = isActive(link.href);
            const Icon = link.icon;
            
            return (
              <motion.li 
                key={link.href}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
              >
                <button
                  className={cn(
                    "group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5",
                    "text-[13px] font-medium transition-all duration-[var(--transition-fast)]",
                    active
                      ? "text-accent-strong"
                      : "text-muted-foreground hover:text-foreground",
                    collapsed && "justify-center px-2",
                    !collapsed && active && "bg-accent-soft/50",
                    !collapsed && !active && "hover:bg-foreground/[0.03]",
                  )}
                  onClick={() => router.push(link.href)}
                  type="button"
                >
                  {/* Active indicator - left border */}
                  {active && (
                    <motion.div
                      layoutId="activeNavIndicator"
                      className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-accent"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                  
                  <span className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center transition-colors",
                    active ? "text-accent" : "text-muted-foreground group-hover:text-foreground"
                  )}>
                    <Icon />
                  </span>
                  
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.2 }}
                        className="truncate"
                      >
                        {link.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  
                  {/* Tooltip for collapsed state */}
                  {collapsed && (
                    <div className="absolute left-full ml-2 z-50 hidden rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background shadow-lg group-hover:block whitespace-nowrap">
                      {link.label}
                      <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 border-4 border-transparent border-r-foreground" />
                    </div>
                  )}
                </button>
              </motion.li>
            );
          })}
        </ul>

      </nav>

      {/* Collapse toggle handle — desktop only, centered on the right edge */}
      {!isMobile && (
        <button
          onClick={onToggle}
          type="button"
          className={cn(
            "absolute top-1/2 -translate-y-1/2",
            "right-0 translate-x-1/2",
            "z-10",
            "flex h-8 w-8 items-center justify-center",
            "rounded-full",
            "border border-border/70 bg-surface shadow-[var(--shadow-sm)]",
            "text-muted-foreground",
            "transition-all duration-[var(--transition-normal)]",
            "hover:border-border-strong hover:bg-surface-elevated hover:text-foreground",
            "hover:shadow-[var(--shadow-md)] hover:scale-110",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30",
          )}
          aria-label={collapsed ? "Expandir menu" : "Minimizar menu"}
        >
          <span
            className="transition-transform duration-[var(--transition-normal)] ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{ transform: collapsed ? "rotate(180deg)" : "rotate(0deg)" }}
          >
            <ChevronLeft className="h-4 w-4" />
          </span>
        </button>
      )}

      {/* User Section */}
      <div className={cn(
        "border-t border-border p-3",
        collapsed ? "flex justify-center" : ""
      )}>
        <div className={cn(
          "flex items-center gap-3",
          collapsed && "justify-center"
        )}>
          <div className="relative">
            <Avatar
              fallback={user.name}
              size="sm"
              src={user.image || undefined}
              alt={user.name}
            />
            {/* Online indicator */}
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface-strong bg-success" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div 
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="min-w-0 flex-1"
              >
                <p className="truncate text-[13px] font-medium text-foreground">{user.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">{organization.name}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </aside>
  );
}
