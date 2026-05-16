"use client";

import { motion } from "framer-motion";
import Image from "next/image";

// ==========================================
// MERCADO LIVRE — wordmark + handshake symbol (tight viewBox in public SVGs)
// ==========================================
const mercadoLivreLogoSrc = "/icons/mercado-libre-icon.svg";
const mercadoLivreSymbolSrc = "/icons/mercado-libre-icon.svg";
const shopeeIconSrc = "/icons/shopee-icon.svg";

/** Same rendered height, width from aspect ratio — keeps ML + Shopee aligned in a row. */
const marketplaceMarkUniformClass =
  "h-7 w-auto shrink-0 self-center object-contain object-center sm:h-8";

export function MercadoLivreIcon({ className = "h-11 w-12" }: { className?: string }) {
  return (
    <Image
      src={mercadoLivreLogoSrc}
      alt=""
      width={552}
      height={148}
      className={`object-contain ${className}`}
      aria-hidden
    />
  );
}

// ==========================================
// SHOPEE — official mark (public/icons/shopee-icon.svg)
// ==========================================
export function ShopeeIcon({ className = "h-12 w-12" }: { className?: string }) {
  return (
    <Image
      src={shopeeIconSrc}
      alt=""
      width={110}
      height={123}
      className={`object-contain object-center ${className}`}
      aria-hidden
    />
  );
}

// ==========================================
// MINI ICON - For Hero text line (16px)
// ==========================================
export function MercadoLivreMiniIcon({ className = "h-9 w-auto" }: { className?: string }) {
  return (
    <Image
      src={mercadoLivreSymbolSrc}
      alt="Mercado Livre"
      width={243}
      height={139}
      className={`object-contain object-center ${className}`}
    />
  );
}

export function ShopeeMiniIcon({ className = "h-9 w-auto" }: { className?: string }) {
  return (
    <Image
      src={shopeeIconSrc}
      alt="Shopee"
      width={110}
      height={123}
      className={`object-contain object-center ${className}`}
    />
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
  const shopeeSizes = { sm: "h-8 w-auto", md: "h-9 w-auto", lg: "h-10 w-auto" };
  const mlSizes = { sm: "h-8 w-auto", md: "h-9 w-auto", lg: "h-10 w-auto" };

  if (name === "shopee") {
    return <ShopeeMiniIcon className={shopeeSizes[size]} />;
  }

  return <MercadoLivreMiniIcon className={mlSizes[size]} />;
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
      <MercadoLivreMiniIcon className="h-9 w-auto sm:h-10" />
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
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground">Compatível com:</span>
      <div className="flex items-center gap-2">
        <MercadoLivreMiniIcon className="h-6 w-auto shrink-0 self-center object-contain object-center sm:h-7" />
        <ShopeeMiniIcon className={marketplaceMarkUniformClass} />
      </div>
    </div>
  );
}
