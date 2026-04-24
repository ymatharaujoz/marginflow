import { Container } from "@marginflow/ui";
import { createPageMetadata, featureGroups } from "@/lib/site";

export const metadata = createPageMetadata({
  description:
    "Explore how MarginFlow combines dashboards, protected access, and marketplace finance workflows in one product story.",
  keywords: ["marketplace dashboard", "profitability analytics", "financial SaaS features"],
  path: "/features",
  title: "Features | MarginFlow",
});

export default function FeaturesPage() {
  return (
    <main className="pt-12 md:pt-16">
      <Container>
        <section className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">Features</p>
          <h1 className="mt-4 text-5xl font-semibold tracking-[-0.06em] text-foreground md:text-6xl">
            Product structure built around profitability decisions.
          </h1>
          <p className="mt-6 text-lg leading-8 text-foreground-soft">
            MarginFlow keeps frontend polish, backend authority, and finance logic aligned so teams
            can move from raw marketplace activity to actual profit insight.
          </p>
        </section>

        <section className="mt-12 grid gap-6 lg:grid-cols-3">
          {featureGroups.map((group) => (
            <article
              key={group.title}
              className="rounded-[2rem] border border-border bg-[color:rgba(255,252,247,0.88)] p-7 shadow-[var(--shadow-card)]"
            >
              <h2 className="text-3xl font-semibold tracking-[-0.04em] text-foreground">
                {group.title}
              </h2>
              <ul className="mt-6 space-y-3 text-sm leading-8 text-foreground-soft">
                {group.items.map((item) => (
                  <li
                    key={item}
                    className="rounded-[1.25rem] border border-border bg-[color:rgba(255,255,255,0.62)] px-4 py-3"
                  >
                    {item}
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
