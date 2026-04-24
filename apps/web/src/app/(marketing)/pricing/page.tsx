import { Container } from "@marginflow/ui";
import { PricingToggle } from "@/components/marketing/pricing-toggle";
import { createPageMetadata } from "@/lib/site";

export const metadata = createPageMetadata({
  description:
    "Review MarginFlow monthly and annual pricing, compare plan intent, and move into subscription setup.",
  keywords: ["SaaS pricing", "annual billing", "monthly billing", "marketplace analytics pricing"],
  path: "/pricing",
  title: "Pricing | MarginFlow",
});

export default function PricingPage() {
  return (
    <main className="pt-12 md:pt-16">
      <Container>
        <section className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">Pricing</p>
          <h1 className="mt-4 text-5xl font-semibold tracking-[-0.06em] text-foreground md:text-6xl">
            Clear subscription paths for sellers who need profit visibility.
          </h1>
          <p className="mt-6 text-lg leading-8 text-foreground-soft">
            Plans are designed around finance clarity, protected access, and room to grow into a
            stronger operating system over time.
          </p>
        </section>

        <section className="mt-12">
          <PricingToggle />
        </section>
      </Container>
    </main>
  );
}
