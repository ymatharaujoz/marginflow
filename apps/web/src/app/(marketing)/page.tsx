import { LandingPage } from "@/components/marketing/landing-page";
import { brandSeoTitle, createPageMetadata, resolveSiteConfig } from "@/lib/site";

const brand = resolveSiteConfig();

export const metadata = createPageMetadata({
  description: `${brand.name} é uma plataforma premium para acompanhar margem, lucro líquido, vendas e performance por canal em um só lugar.`,
  keywords: [
    "dashboard financeiro",
    "margem de lucro",
    "Mercado Livre",
    "Shopee",
    "Amazon",
    "analytics marketplace",
  ],
  path: "/",
  title: brandSeoTitle("Clareza sobre lucro e margem para o seu negócio"),
});

export default function MarketingPage() {
  return <LandingPage />;
}
