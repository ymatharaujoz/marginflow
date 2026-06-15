import { redirect } from "next/navigation";
import { SignInPanel } from "@/components/auth/sign-in-panel";
import { ParticleCanvas } from "@/components/auth/particle-canvas";
import { resolveAuthErrorMessage } from "@/lib/auth-errors";
import { readServerAuthState } from "@/lib/server-auth";
import { createPageMetadata, resolveSiteConfig, sitePageTitle } from "@/lib/site";

const brand = resolveSiteConfig();

export const metadata = createPageMetadata({
  description: `Comece seu workspace ${brand.name} com e-mail e senha e acesso protegido ao app.`,
  path: "/sign-in",
  title: sitePageTitle("Entrar"),
});

metadata.robots = {
  follow: false,
  index: false,
};

type SignInPageProps = {
  searchParams?: Promise<{
    auth_error?: string | string[];
  }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const authState = await readServerAuthState({ mode: "soft" });
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  if (authState) {
    redirect("/app");
  }

  return (
    <main className="relative flex min-h-[calc(100vh-6rem)] flex-col overflow-hidden">
      <ParticleCanvas />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-12 md:py-16">
        <SignInPanel
          initialErrorMessage={resolveAuthErrorMessage(resolvedSearchParams?.auth_error)}
        />
      </div>

    </main>
  );
}
