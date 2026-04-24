import { Container } from "@marginflow/ui";
import { createPageMetadata, integrationHighlights } from "@/lib/site";

export const metadata = createPageMetadata({
  description:
    "See how MarginFlow frames Mercado Livre, Shopee, and manual finance inputs inside one clean integration story.",
  keywords: ["Mercado Livre integration", "Shopee integration", "manual sync"],
  path: "/integrations",
  title: "Integrations | MarginFlow",
});

export default function IntegrationsPage() {
  return (
    <main className="pt-12 md:pt-16">
      <Container className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
        <section>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
            Integrations
          </p>
          <h1 className="mt-4 text-5xl font-semibold tracking-[-0.06em] text-foreground md:text-6xl">
            Two marketplace rails, one finance language.
          </h1>
          <p className="mt-6 text-lg leading-8 text-foreground-soft">
            MarginFlow keeps V1 sync manual and bounded. That means fewer moving parts now and a
            cleaner path toward automation later.
          </p>
          <div className="mt-8 rounded-[2rem] border border-border bg-[linear-gradient(180deg,rgba(20,32,39,0.96),rgba(28,58,64,0.94))] p-7 text-white shadow-[var(--shadow-hero)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/68">
              V1 operating model
            </p>
            <ul className="mt-5 space-y-3 text-sm leading-8 text-white/76">
              <li>Manual sync only</li>
              <li>Three daily windows</li>
              <li>Clear sync history and status tracking</li>
              <li>Provider boundaries prepared for later expansion</li>
            </ul>
          </div>
        </section>

        <section className="grid gap-4">
          {integrationHighlights.map((item) => (
            <article
              key={item.provider}
              className="rounded-[2rem] border border-border bg-[color:rgba(255,252,247,0.88)] p-7 shadow-[var(--shadow-card)]"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
                {item.provider}
              </p>
              <p className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-foreground">
                {item.detail}
              </p>
            </article>
          ))}
        </section>
      </Container>
    </main>
  );
}
