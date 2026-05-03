import Link from "next/link";
import { redirect } from "next/navigation";
import { Container } from "@marginflow/ui";
import { SignInPanel } from "@/components/auth/sign-in-panel";
import { readServerAuthState } from "@/lib/server-auth";
import { createPageMetadata, resolveSiteConfig, sitePageTitle } from "@/lib/site";

const brand = resolveSiteConfig();

export const metadata = createPageMetadata({
  description: `Comece seu workspace ${brand.name} com login Google e acesso protegido ao app.`,
  path: "/sign-in",
  title: sitePageTitle("Entrar"),
});

metadata.robots = {
  follow: false,
  index: false,
};

export default async function SignInPage() {
  const authState = await readServerAuthState();

  if (authState) {
    redirect("/app");
  }

  return (
    <main className="flex min-h-[calc(100vh-6rem)] flex-col">
      <div className="flex flex-1 flex-col items-center justify-center py-12 md:py-16">
        <Container size="sm" className="flex w-full flex-col items-center">
          <SignInPanel />
          <Link
            href="/"
            className="mt-8 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Voltar ao site
          </Link>
        </Container>
      </div>

      <Container size="sm" className="shrink-0 pb-10 pt-2">
        <p className="text-center text-[11px] leading-relaxed text-muted-foreground/90 sm:text-xs">
          Uso empresarial: recomendamos entrar com o mesmo domínio de e-mail que sua equipe utiliza, quando possível.
        </p>
      </Container>
    </main>
  );
}
