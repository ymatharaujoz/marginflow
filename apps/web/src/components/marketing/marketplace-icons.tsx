"use client";

import { motion } from "framer-motion";

// ==========================================
// MERCADO LIVRE ICON - Clean Minimalist (48px)
// ==========================================
export function MercadoLivreIcon({ className = "h-12 w-12" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Simple circle background */}
      <circle cx="24" cy="24" r="23" fill="#FFE600" stroke="#FFE600" strokeWidth="0.5"/>
      {/* Minimalist shopping bag */}
      <path
        d="M16 20V17C16 14.2386 18.2386 12 21 12H27C29.7614 12 32 14.2386 32 17V20"
        stroke="#2D3277"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M14 20H34L32.5 32C32.5 33.3807 31.3807 34.5 30 34.5H18C16.6193 34.5 15.5 33.3807 15.5 32L14 20Z"
        stroke="#2D3277"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Simple handle lines */}
      <path d="M19 24V28" stroke="#2D3277" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M24 24V28" stroke="#2D3277" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M29 24V28" stroke="#2D3277" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

// ==========================================
// SHOPEE ICON - Clean Minimalist (48px)
// ==========================================
export function ShopeeIcon({ className = "h-12 w-12" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Simple circle background */}
      <circle cx="24" cy="24" r="23" fill="#EE4D2D" stroke="#EE4D2D" strokeWidth="0.5"/>
      {/* Minimalist S */}
      <text
        x="24"
        y="30"
        textAnchor="middle"
        fontSize="18"
        fontWeight="700"
        fill="white"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        S
      </text>
      {/* Subtle bag outline */}
      <path
        d="M16 18V15C16 12.2386 18.2386 10 21 10H27C29.7614 10 32 12.2386 32 15V18"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  );
}

// ==========================================
// MINI ICON - For Hero text line (16px)
// ==========================================
export function MercadoLivreMiniIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="16" height="16" rx="4" fill="#FFE600"/>
      <path
        d="M5 6V5C5 3.895 5.895 3 7 3H9C10.105 3 11 3.895 11 5V6"
        stroke="#2D3277"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M4 6H12L11 11C11 11.552 10.552 12 10 12H6C5.448 12 5 11.552 5 11L4 6Z"
        stroke="#2D3277"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Shopee Mini Icon (16px)
export function ShopeeMiniIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="16" height="16" rx="4" fill="#EE4D2D"/>
      <text
        x="8"
        y="11"
        textAnchor="middle"
        fontSize="8"
        fontWeight="700"
        fill="white"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        S
      </text>
    </svg>
  );
}

// Generic Marketplace Mini Icon with name prop
export function MarketplaceMiniIcon({
  name,
  size = "sm",
}: {
  name: "mercadolivre" | "shopee";
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  const className = sizeClasses[size];

  if (name === "shopee") {
    return <ShopeeMiniIcon className={className} />;
  }

  return <MercadoLivreMiniIcon className={className} />;
}

// ==========================================
// HERO INTEGRATION LINE - Minimalist
// ==========================================
export function HeroIntegrationLine() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-center gap-2 text-sm text-muted-foreground"
    >
      <span>Integrado com</span>
      <div className="flex items-center gap-1.5">
        <MercadoLivreMiniIcon className="h-4 w-4" />
        <span className="font-medium text-foreground">Mercado Livre</span>
      </div>
    </motion.div>
  );
}

// ==========================================
// CHECK ICON - Minimal
// ==========================================
export function CheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

// ==========================================
// CLOCK ICON - Minimal
// ==========================================
export function ClockIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" strokeWidth="1.5"/>
      <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ==========================================
// ARROW RIGHT - Minimal
// ==========================================
export function ArrowRightIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
    </svg>
  );
}

// ==========================================
// MARKETPLACE LOGOS BAR - For Hero Section
// ==========================================
export function MarketplaceLogosBar() {
  return (
    <div className="flex items-center gap-4">
      <span className="text-xs text-muted-foreground">Compatível com:</span>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 rounded-full bg-white border border-border px-3 py-1.5 shadow-sm">
          <MercadoLivreMiniIcon className="h-4 w-4" />
          <span className="text-xs font-medium text-foreground">Mercado Livre</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-white border border-border px-3 py-1.5 shadow-sm">
          <ShopeeMiniIcon className="h-4 w-4" />
          <span className="text-xs font-medium text-foreground">Shopee</span>
        </div>
      </div>
    </div>
  );
}
