"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { BrandName } from "@/components/brand-name";
import { MarketingBackdrop } from "@/components/marketing/marketing-backdrop";
import { MarketingNavLinks } from "@/components/marketing/marketing-nav-links";
import { ThemeToggle } from "@/components/theme-toggle";

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
        <header className="fixed left-0 right-0 top-0 z-50 px-4 pt-2 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <nav className="flex items-center justify-between rounded-2xl border border-border/50 bg-surface px-4 py-1.5 shadow-sm backdrop-blur-xl md:px-6">
              {/* Logo */}
              <Link href="/" className="group flex items-center gap-2.5">
                <BrandLogo className="h-12 w-auto transition-transform group-hover:scale-105" />
                <BrandName className="text-base font-bold tracking-tight" />
              </Link>

              {/* Navigation */}
              <div className="hidden items-center gap-1 md:flex">
                <MarketingNavLinks linkClassName="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-accent/5 hover:text-foreground" />
              </div>

              {/* CTA Button + Theme Toggle */}
              <div className="flex items-center gap-3">
                <ThemeToggle />
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
        <div className="h-16" />

        {children}

        {/* Footer */}
        <footer className="border-t border-border bg-surface py-12 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-2.5">
                <BrandLogo className="h-14 w-auto" />
                <BrandName className="text-sm font-semibold" />
              </Link>

              {/* Links */}
              <nav className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
                <MarketingNavLinks linkClassName="text-sm text-muted-foreground transition-colors hover:text-foreground" />
              </nav>

              {/* Copyright */}
              <p className="text-xs text-muted-foreground">
                &copy; {new Date().getFullYear()} Lucreii. Todos os direitos reservados.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
