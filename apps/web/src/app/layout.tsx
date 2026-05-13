import type { Metadata } from "next";
import { AppProviders } from "@/components/app-providers";
import { inter } from "@/fonts";
import { getSiteUrl, resolveSiteConfig } from "@/lib/site";
import "./globals.css";

const rootSite = resolveSiteConfig();

export const metadata: Metadata = {
  description: rootSite.defaultDescription,
  metadataBase: getSiteUrl(),
  title: rootSite.defaultTitle,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
