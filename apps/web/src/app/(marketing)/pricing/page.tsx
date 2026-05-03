import { Container } from "@marginflow/ui";
import { PricingToggle } from "@/components/marketing/pricing-toggle";
import { createPageMetadata, resolveSiteConfig, sitePageTitle } from "@/lib/site";

const brand = resolveSiteConfig();

export const metadata = createPageMetadata({
  description: `Confira os preços ${brand.name} mensal e anual, compare objetivos dos planos e avance para a contratação.`,
  keywords: ["preço SaaS", "cobrança anual", "cobrança mensal", "analytics marketplace"],
  path: "/pricing",
  title: sitePageTitle("Preços"),
});

export default function PricingPage() {
  return (
    <main className="pt-14 md:pt-20">
      <Container size="xl">
        <section className="mx-auto max-w-3xl text-center animate-rise-in">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-accent">Preços</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
            Opções claras de assinatura para quem precisa enxergar lucro nas vendas.
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            Os planos priorizam clareza financeira, acesso protegido e espaço para o seu sistema de
            operação amadurecer com o tempo.
          </p>
        </section>

        <section className="mt-14">
          <PricingToggle />
        </section>
      </Container>
    </main>
  );
}
