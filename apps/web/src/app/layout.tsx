import type { Metadata } from "next";
import { Fraunces, Manrope, Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import { AppProviders } from "@/components/app-providers";
import { getSiteUrl, siteConfig } from "@/lib/site";
import "./globals.css";

const bodyFont = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
});

const displayFont = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
});

const marketingSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-marketing-sans",
  weight: ["500", "600", "700"],
});

const marketingDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-marketing-display",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  description: siteConfig.defaultDescription,
  metadataBase: getSiteUrl(),
  title: siteConfig.defaultTitle,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${bodyFont.variable} ${displayFont.variable} ${marketingSans.variable} ${marketingDisplay.variable}`}
    >
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
