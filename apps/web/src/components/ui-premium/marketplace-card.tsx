"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { StatusBadge } from "./status-badge";

interface MarketplaceCardProps {
  name: string;
  slug: "mercadolivre" | "shopee" | string;
  status: "connected" | "disconnected" | "pending" | "developing";
  metrics?: {
    revenue?: string;
    orders?: string;
  };
  href?: string;
  className?: string;
}

const marketplaceConfig = {
  mercadololivre: {
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
        <rect width="24" height="24" rx="4" fill="#FFE600"/>
        <path d="M12 6c-3.5 0-6.5 2-8 5 1.5 3 4.5 5 8 5s6.5-2 8-5c-1.5-3-4.5-5-8-5z" fill="#2D3277"/>
        <circle cx="9" cy="11" r="1.5" fill="white"/>
        <circle cx="15" cy="11" r="1.5" fill="white"/>
      </svg>
    ),
    brandColor: "#FFE600",
  },
  shopee: {
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
        <rect width="24" height="24" rx="4" fill="#EE4D2D"/>
        <path d="M12 7l-3 3h2v4h2v-4h2l-3-3z" fill="white"/>
        <circle cx="9.5" cy="14" r="1.5" fill="white"/>
        <circle cx="14.5" cy="14" r="1.5" fill="white"/>
      </svg>
    ),
    brandColor: "#EE4D2D",
  },
};

const statusConfig = {
  connected: { type: "success" as const, label: "Conectado" },
  disconnected: { type: "inactive" as const, label: "Desconectado" },
  pending: { type: "pending" as const, label: "Pendente" },
  developing: { type: "warning" as const, label: "Em breve" },
};

export function MarketplaceCard({
  name,
  slug,
  status,
  metrics,
  href = "#",
  className = "",
}: MarketplaceCardProps) {
  const config = marketplaceConfig[slug as keyof typeof marketplaceConfig];
  const statusBadge = statusConfig[status];

  return (
    <motion.div
      whileHover={{ y: -1 }}
      transition={{ duration: 0.2 }}
      className={`
        group relative flex flex-col rounded-[var(--radius-lg)] 
        border border-border bg-surface-strong p-4
        transition-all duration-[var(--transition-normal)]
        hover:border-border-strong hover:shadow-[var(--shadow-sm)]
        ${className}
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-[var(--shadow-xs)]">
            {config?.icon || (
              <div 
                className="h-6 w-6 rounded"
                style={{ backgroundColor: config?.brandColor || "#ccc" }}
              />
            )}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">{name}</h4>
            <StatusBadge 
              status={statusBadge.type} 
              label={statusBadge.label}
              className="mt-1"
            />
          </div>
        </div>
        
        {status === "connected" && (
          <Link
            href={href}
            className="opacity-0 transition-opacity group-hover:opacity-100"
          >
            <ArrowUpRight className="h-4 w-4 text-muted-foreground hover:text-accent" />
          </Link>
        )}
      </div>

      {metrics && status === "connected" && (
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-3">
          {metrics.revenue && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Receita</p>
              <p className="text-sm font-semibold text-foreground">{metrics.revenue}</p>
            </div>
          )}
          {metrics.orders && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Pedidos</p>
              <p className="text-sm font-semibold text-foreground">{metrics.orders}</p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
