"use client";

import Link from "next/link";
import { MarketingBackdrop } from "@/components/marketing/marketing-backdrop";
import { MarketingNavLinks } from "@/components/marketing/marketing-nav-links";
import { resolveSiteConfig } from "@/lib/site";

const brand = resolveSiteConfig();

export function MarketingShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="marketing-site relative min-h-screen" lang="pt-BR">
      <MarketingBackdrop />

      <div className="relative z-10">
        {/* Header */}
        <header className="fixed left-0 right-0 top-0 z-50 px-4 pt-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <nav className="flex items-center justify-between rounded-2xl border border-border/50 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-xl md:px-6">
              {/* Logo */}
              <Link href="/" className="group flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-strong text-sm font-bold text-white shadow-md transition-transform group-hover:scale-105">
                  {brand.icon}
                </span>
                <span className="hidden text-base font-bold tracking-tight text-foreground sm:block">
                  {brand.name}
                </span>
              </Link>

              {/* Navigation */}
              <div className="hidden items-center gap-1 md:flex">
                <MarketingNavLinks linkClassName="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-accent/5 hover:text-foreground" />
              </div>

              {/* CTA Button */}
              <div className="flex items-center gap-3">
                <Link
                  href="/sign-in"
                  className="inline-flex h-9 items-center justify-center rounded-xl bg-accent px-5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-accent-strong hover:shadow-md active:scale-[0.98]"
                >
                  Acessar
                </Link>
              </div>
            </nav>
          </div>
        </header>

        {/* Spacer for fixed header */}
        <div className="h-24" />

        {children}

        {/* Footer */}
        <footer className="border-t border-border bg-white/50 py-12 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent-strong text-xs font-bold text-white">
                  {brand.icon}
                </span>
                <span className="text-sm font-semibold text-foreground">{brand.name}</span>
              </Link>

              {/* Links */}
              <nav className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
                <MarketingNavLinks linkClassName="text-sm text-muted-foreground transition-colors hover:text-foreground" />
              </nav>

              {/* Copyright */}
              <p className="text-xs text-muted-foreground">
                &copy; {new Date().getFullYear()} {brand.name}. Todos os direitos reservados.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
