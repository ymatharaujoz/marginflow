import { LandingPage } from "@/components/marketing/landing-page";
import { brandSeoTitle, createPageMetadata, resolveSiteConfig } from "@/lib/site";

const brand = resolveSiteConfig();

export const metadata = createPageMetadata({
  description: `${brand.name} é uma plataforma para acompanhar margem, lucro líquido, vendas e performance por marketplace em um só lugar.`,
  keywords: [
    "dashboard financeiro",
    "margem de lucro",
    "Mercado Livre",
    "Shopee",
    "TikTok",
    "Shein",
    "analytics marketplace",
  ],
  path: "/",
  title: brandSeoTitle("Veja o lucro que realmente importa."),
});

export default function MarketingPage() {
  return <LandingPage />;
}
