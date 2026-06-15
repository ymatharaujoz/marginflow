"use client";

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";
import { getInitialTheme, type AppTheme } from "@/lib/theme";

// ==========================================
// MERCADO LIVRE — wordmark + handshake symbol (tight viewBox in public SVGs)
// ==========================================
const mercadoLivreLogoSrc = "/icons/mercado-libre-icon.svg";
const mercadoLivreSymbolSrc = "/icons/mercado-libre-icon.svg";
const shopeeIconSrc = "/icons/shopee-icon.svg";
const tiktokIconSrc = "/icons/tiktok-icon.svg";
const sheinIconSrc = "/icons/shein-icon.svg";
const sheinIconDarkSrc = "/icons/shein-icon-dark.svg";

function useSheinThemeIcon() {
  const [theme, setTheme] = useState<AppTheme>(getInitialTheme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const updateTheme = () => {
      const isDark = document.documentElement.classList.contains("dark");
      setTheme(isDark ? "dark" : "light");
    };

    updateTheme();

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return { src: mounted && theme === "dark" ? sheinIconDarkSrc : sheinIconSrc, mounted };
}

export function MercadoLivreIcon({ className = "h-11 w-12" }: { className?: string }) {
  return (
    <Image
      src={mercadoLivreLogoSrc}
      alt=""
      width={552}
      height={148}
      className={`object-contain object-left ${className}`}
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
      className={`object-contain object-left ${className}`}
      aria-hidden
    />
  );
}

// ==========================================
// TIKTOK — official mark (public/icons/tiktok-icon.svg)
// ==========================================
export function TiktokIcon({ className = "h-12 w-12" }: { className?: string }) {
  return (
    <Image
      src={tiktokIconSrc}
      alt=""
      width={110}
      height={123}
      className={`object-contain object-left -ml-1.5 ${className}`}
      aria-hidden
    />
  );
}

// ==========================================
// SHEIN — official mark (public/icons/shein-icon.svg)
// ==========================================
export function SheinIcon({ className = "h-12 w-12" }: { className?: string }) {
  const { src } = useSheinThemeIcon();
  return (
    <Image
      src={src}
      alt=""
      width={110}
      height={123}
      className={`object-contain object-left -ml-1 ${className}`}
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

export function TiktokMiniIcon({ className = "h-9 w-auto" }: { className?: string }) {
  return (
    <Image
      src={tiktokIconSrc}
      alt="TikTok"
      width={110}
      height={123}
      className={`object-contain object-center ${className}`}
    />
  );
}

export function SheinMiniIcon({ className = "h-9 w-auto" }: { className?: string }) {
  const { src } = useSheinThemeIcon();
  return (
    <Image
      src={src}
      alt="Shein"
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
  name: "mercadolivre" | "shopee" | "tiktok" | "shein";
  size?: "sm" | "md" | "lg";
}) {
  const sizes = { sm: "h-8 w-auto", md: "h-9 w-auto", lg: "h-10 w-auto" };

  if (name === "shopee") {
    return <ShopeeMiniIcon className={sizes[size]} />;
  }

  if (name === "tiktok") {
    return <TiktokMiniIcon className={sizes[size]} />;
  }

  if (name === "shein") {
    return <SheinMiniIcon className={sizes[size]} />;
  }

  return <MercadoLivreMiniIcon className={sizes[size]} />;
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
// MARKETPLACE LOGOS BAR - Premium Hero Integration Block
// ==========================================
export function MarketplaceLogosBar() {
  const reduceMotion = useReducedMotion();

  const marketplaces = [
    {
      name: "Mercado Livre",
      icon: <MercadoLivreMiniIcon className="h-5 w-auto shrink-0 object-contain sm:h-6" />,
      status: "available" as const,
    },
    {
      name: "Shopee",
      icon: <ShopeeMiniIcon className="h-5 w-auto shrink-0 object-contain sm:h-6" />,
      status: "available" as const,
    },
    {
      name: "TikTok",
      icon: <TiktokMiniIcon className="h-5 w-auto shrink-0 object-contain sm:h-6" />,
      status: "coming-soon" as const,
    },
    {
      name: "Shein",
      icon: <SheinMiniIcon className="h-5 w-auto shrink-0 object-contain sm:h-6" />,
      status: "coming-soon" as const,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.65, ease: [0.16, 1, 0.3, 1] }}
      className="group relative col-span-2 overflow-hidden rounded-xl border border-border bg-surface p-4 shadow-sm transition-all duration-300 hover:border-accent/20 hover:shadow-md sm:col-span-4"
    >
      {/* Subtle gradient overlay on hover */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/[0.03] to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-stretch">
        {/* Left side: Label + Headline */}
        <div className="flex flex-1 flex-col justify-center gap-1.5 py-1">
          <p className="max-w-[16rem] text-base text-muted-foreground leading-snug tracking-tight text-foreground sm:text-lg">
            Conecte seus canais de venda em um só lugar.
          </p>
        </div>

        {/* Vertical divider */}
        <div className="hidden self-center h-14 w-px bg-border/60 sm:block" />
        <div className="block h-px w-full bg-border/40 sm:hidden" />

        {/* Right side: Icons */}
        <div className="flex flex-1 items-center justify-center">
          <div className="relative flex items-center gap-1.5 rounded-full border border-border/50 bg-surface-elevated/50 p-1.5 shadow-xs sm:gap-2 sm:p-2">
            <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-r from-accent/[0.02] via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

            {marketplaces.map((mp, index) => (
              <motion.div
                key={mp.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: reduceMotion ? 0 : 0.35,
                  delay: 0.8 + index * 0.1,
                  ease: [0.16, 1, 0.3, 1],
                }}
                whileHover={reduceMotion ? undefined : { y: -2, transition: { duration: 0.2 } }}
                title={mp.name}
                className={`relative flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-200 hover:shadow-sm sm:h-10 sm:w-10 ${
                  mp.status === "available"
                    ? "border-border/40 bg-surface-elevated/60 hover:border-accent/20"
                    : "border-border/30 bg-muted/30 hover:border-muted-foreground/20"
                }`}
              >
                {mp.icon}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
