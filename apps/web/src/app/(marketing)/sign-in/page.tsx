import { redirect } from "next/navigation";
import { SignInPanel } from "@/components/auth/sign-in-panel";
import { ParticleCanvas } from "@/components/auth/particle-canvas";
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
    <main className="relative flex min-h-[calc(100vh-6rem)] flex-col overflow-hidden">
      {/* Particle canvas overlay on the original light background */}
      <ParticleCanvas />

      {/* Content */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-12 md:py-16">
        <SignInPanel />
      </div>

      {/* Footer note */}
      <div className="relative z-10 mx-auto max-w-sm px-4 pb-10 pt-2">
        <p className="text-center text-[11px] leading-relaxed text-muted-foreground/90">
          Uso empresarial: recomendamos entrar com o mesmo domínio de e-mail que sua equipe utiliza, quando possível.
        </p>
      </div>
    </main>
  );
}
