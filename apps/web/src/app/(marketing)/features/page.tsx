import { Container } from "@marginflow/ui";
import { createPageMetadata, featureGroups, resolveSiteConfig, sitePageTitle } from "@/lib/site";

const brand = resolveSiteConfig();

export const metadata = createPageMetadata({
  description: `Veja como o ${brand.name} junta dashboards, acesso protegido e fluxos financeiros de marketplace em uma narrativa de produto.`,
  keywords: ["dashboard marketplace", "análises de lucro", "funcionalidades SaaS financeiras"],
  path: "/features",
  title: sitePageTitle("Recursos"),
});

export default function FeaturesPage() {
  return (
    <main className="pt-14 md:pt-20">
      <Container size="xl">
        <section className="max-w-3xl animate-rise-in">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-accent">Recursos</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground md:text-5xl lg:text-6xl">
            Estrutura de produto voltada à tomada de decisão de lucratividade.
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            O {brand.name} alinha frontend, backend e métricas para que você saia da atividade bruta nos
            marketplaces e chegue ao insight real de lucro.
          </p>
        </section>

        <section className="mt-14 grid gap-6 lg:grid-cols-3">
          {featureGroups.map((group, i) => (
            <article
              key={group.title}
              className="animate-rise-in rounded-[var(--radius-2xl)] border border-border bg-surface-strong p-7 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-lg)]"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                {group.title}
              </h2>
              <ul className="mt-6 space-y-3 text-sm leading-7 text-muted-foreground">
                {group.items.map((item) => (
                  <li
                    key={item}
                    className="flex gap-3 rounded-[var(--radius-lg)] border border-border bg-background-soft/60 px-4 py-3"
                  >
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>
      </Container>
    </main>
  );
}
