import { redirect } from "next/navigation";
import { Container } from "@marginflow/ui";
import { SignInPanel } from "@/components/auth/sign-in-panel";
import { readServerAuthState } from "@/lib/server-auth";
import { createPageMetadata } from "@/lib/site";

export const metadata = createPageMetadata({
  description: "Start your MarginFlow workspace with Google sign-in and protected app access.",
  path: "/sign-in",
  title: "Sign in",
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
    <main className="pt-12 md:pt-16">
      <Container className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
        <section className="rounded-[2.2rem] border border-border bg-[linear-gradient(180deg,rgba(20,32,39,0.96),rgba(28,58,64,0.94))] p-8 text-white shadow-[var(--shadow-hero)] md:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/68">
            Access
          </p>
          <h1 className="mt-4 text-5xl font-semibold tracking-[-0.06em]">
            Enter workspace with Google and keep product data protected.
          </h1>
          <p className="mt-6 text-base leading-8 text-white/76">
            MarginFlow uses API-owned sessions, organization scoping, and protected routes so your
            billing and finance workflows stay behind authenticated access.
          </p>
        </section>
        <SignInPanel />
      </Container>
    </main>
  );
}
