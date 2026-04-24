import Link from "next/link";
import { Container } from "@marginflow/ui";
import { MarketingBackdrop } from "@/components/marketing/marketing-backdrop";
import { MarketingNavLinks } from "@/components/marketing/marketing-nav-links";

const gradientCtaClass =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-gradient-to-r from-[#007bff] to-[#00d4ff] px-6 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-white shadow-[0_12px_40px_rgba(0,180,255,0.35)] transition duration-300 hover:shadow-[0_16px_48px_rgba(0,180,255,0.45)] hover:brightness-[1.03]";

export function MarketingShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="marketing-site relative min-h-screen text-[#0f172a]" lang="pt-BR">
      <MarketingBackdrop />

      <div className="relative z-10">
        <Container className="max-w-7xl pt-6 md:pt-8">
          <header className="flex flex-col gap-5 rounded-[1.25rem] border border-[#e2e8f0] bg-white/80 px-5 py-4 shadow-[0_8px_40px_rgba(15,23,42,0.06)] backdrop-blur-md md:flex-row md:items-center md:justify-between md:px-7 md:py-3.5">
            <Link href="/" className="group flex items-start gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#007bff] to-[#00d4ff] text-lg font-bold text-white shadow-[0_8px_24px_rgba(0,123,255,0.35)] transition group-hover:scale-[1.02]">
                M
              </span>
              <span className="text-left">
                <span className="block text-[0.95rem] font-bold uppercase tracking-[0.2em] text-[#007bff]">
                  MarginFlow
                </span>
                <span className="mt-0.5 block max-w-[20rem] text-[0.7rem] font-medium leading-snug tracking-wide text-[#64748b]">
                  Análise para empresários que precisam de visibilidade real sobre o lucro.
                </span>
              </span>
            </Link>

            <nav className="flex flex-wrap items-center gap-1 md:gap-2">
              <MarketingNavLinks linkClassName="rounded-full px-4 py-2 text-sm font-medium text-[#64748b] transition hover:bg-[#f1f5f9] hover:text-[#0f172a]" />
            </nav>

            <div className="flex flex-wrap items-center gap-3 md:justify-end">
              <Link
                href="/sign-in"
                className={gradientCtaClass}
              >
                Acessar plataforma
              </Link>
            </div>
          </header>
        </Container>

        {children}

        <Container className="max-w-7xl pb-16 pt-12 md:pb-24">
          <footer className="rounded-[1.5rem] border border-[#e2e8f0] bg-white/75 px-6 py-8 shadow-[0_8px_32px_rgba(15,23,42,0.05)] backdrop-blur-sm md:px-10">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#007bff]">MarginFlow</p>
              </div>
              <div className="flex flex-wrap gap-2 md:justify-end">
                <MarketingNavLinks linkClassName="rounded-full border border-[#e2e8f0] bg-white/90 px-4 py-2 text-sm text-[#64748b] transition hover:border-[#cbd5e1] hover:text-[#0f172a]" />
                <Link
                  href="/sign-in"
                  className="rounded-full border border-[#e2e8f0] bg-white/90 px-4 py-2 text-sm text-[#64748b] transition hover:border-[#cbd5e1] hover:text-[#0f172a]"
                >
                  Entrar
                </Link>
              </div>
            </div>
            <p className="mt-8 border-t border-[#e2e8f0] pt-6 text-center text-xs text-[#94a3b8]">
              Copyright {new Date().getFullYear()} MarginFlow. Todos os direitos reservados.
            </p>
          </footer>
        </Container>
      </div>
    </div>
  );
}
