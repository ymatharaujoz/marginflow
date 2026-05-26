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
    <html lang="pt-BR" className={inter.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
