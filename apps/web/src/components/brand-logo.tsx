"use client";

import { useEffect, useState } from "react";
import { getInitialTheme, type AppTheme } from "@/lib/theme";
import { BrandLogoLight } from "./brand-logo-light";
import { BrandLogoDark } from "./brand-logo-dark";

type BrandLogoProps = {
  className?: string;
};

export function BrandLogo({ className }: BrandLogoProps) {
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

  if (!mounted) {
    return <BrandLogoLight className={className} />;
  }

  return theme === "dark" ? (
    <BrandLogoDark className={className} />
  ) : (
    <BrandLogoLight className={className} />
  );
}
