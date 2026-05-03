import { Container } from "@marginflow/ui";
import { createPageMetadata, integrationHighlights, resolveSiteConfig, sitePageTitle } from "@/lib/site";

const brand = resolveSiteConfig();

export const metadata = createPageMetadata({
  description: `Mercado Livre, Shopee e registros financeiros manuais no mesmo modelo de lucro dentro do ${brand.name}.`,
  keywords: ["integração Mercado Livre", "integração Shopee", "sincronização manual"],
  path: "/integrations",
  title: sitePageTitle("Integrações"),
});

export default function IntegrationsPage() {
  return (
    <main className="pt-14 md:pt-20">
      <Container size="xl" className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
        <section className="animate-rise-in">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-accent">
            Integrações
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground md:text-5xl lg:text-6xl">
            Dois trilhos de marketplace, uma mesma língua financeira.
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            O {brand.name} mantém o sync manual e delimitado no V1 — menos pontos de falha hoje e
            caminho limpo para automação depois.
          </p>
          <div className="mt-8 rounded-[var(--radius-2xl)] border border-foreground/10 bg-gradient-to-b from-[#141c22] to-[#1e3a3a] p-7 text-white shadow-[var(--shadow-xl)]">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/60">
              Modelo V1
            </p>
            <ul className="mt-5 space-y-3 text-sm leading-7 text-white/70">
              {[
                "Apenas sincronização manual",
                "Três janelas diárias",
                "Histórico e status claros por sync",
                "Fronteira com provedores pronta para evoluir",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <svg className="mt-1 h-4 w-4 shrink-0 text-accent-foreground/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="grid gap-4">
          {integrationHighlights.map((item, i) => (
            <article
              key={item.provider}
              className="animate-rise-in rounded-[var(--radius-2xl)] border border-border bg-surface-strong p-7 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-lg)]"
              style={{ animationDelay: `${(i + 1) * 120}ms` }}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </span>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">
                  {item.provider}
                </p>
              </div>
              <p className="mt-4 text-xl font-semibold leading-snug tracking-tight text-foreground">
                {item.detail}
              </p>
            </article>
          ))}
        </section>
      </Container>
    </main>
  );
}
