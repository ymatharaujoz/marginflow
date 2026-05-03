import Link from "next/link";
import { Container } from "@marginflow/ui";
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
    <div className="marketing-site relative min-h-screen text-[#0f172a]" lang="pt-BR">
      <MarketingBackdrop />

      <div className="relative z-10">
        {/* Header */}
        <Container size="xl" className="pt-5 md:pt-7">
          <header className="sticky top-4 z-40 flex items-center justify-between rounded-[var(--radius-xl)] border border-[#e0d8ce]/70 bg-[#f7f4ef]/78 px-5 py-3 shadow-[var(--shadow-md)] backdrop-blur-xl md:px-7">
            <Link href="/" className="group flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-gradient-to-br from-[#0e7a6f] to-[#14b8a6] text-base font-bold text-white shadow-[0_4px_12px_rgba(14,122,111,0.3)] transition-transform group-hover:scale-[1.04]">
                {brand.icon}
              </span>
              <span className="hidden text-[0.9rem] font-bold tracking-tight text-foreground sm:block">
                {brand.name}
              </span>
            </Link>

            <nav className="hidden items-center gap-1 md:flex">
              <MarketingNavLinks linkClassName="rounded-[var(--radius-full)] px-4 py-2 text-sm font-medium text-[#475569] transition-all hover:bg-[#f1f5f9] hover:text-[#0f172a]" />
            </nav>

            <div className="flex items-center gap-3">
              <Link
                href="/sign-in"
                className="inline-flex h-9 items-center justify-center rounded-[var(--radius-full)] bg-accent px-5 text-xs font-semibold !text-white shadow-[0_2px_8px_rgba(14,122,111,0.25)] transition-all hover:bg-accent-strong hover:shadow-[0_4px_16px_rgba(14,122,111,0.3)] active:scale-[0.97]"
              >
                Acessar plataforma
              </Link>
            </div>
          </header>
        </Container>

        {children}

        {/* Footer */}
        <Container size="xl" className="pb-10 pt-20 md:pb-14 md:pt-28">
          <footer className="border-t border-border/70 pt-8 md:pt-10">
            <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-8 sm:gap-y-4 sm:text-left">
              <Link href="/" className="flex items-center gap-2.5 text-foreground transition-opacity hover:opacity-85">
                <span className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] bg-gradient-to-br from-[#0e7a6f] to-[#14b8a6] text-[0.65rem] font-bold text-white">
                  {brand.icon}
                </span>
                <span className="text-sm font-semibold tracking-tight">{brand.name}</span>
              </Link>
              <nav className="flex flex-wrap items-center justify-center gap-x-8 gap-y-1 sm:justify-start">
                <MarketingNavLinks linkClassName="text-sm text-[#64748b] transition-colors hover:text-foreground" />
              </nav>
              <p className="text-xs tabular-nums text-[#94a3b8] sm:ml-auto sm:text-right">
                &copy; {new Date().getFullYear()} {brand.name}
              </p>
            </div>
          </footer>
        </Container>
      </div>
    </div>
  );
}
