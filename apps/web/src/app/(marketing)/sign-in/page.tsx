import { redirect } from "next/navigation";
import { Container } from "@marginflow/ui";
import { SignInPanel } from "@/components/auth/sign-in-panel";
import { readServerAuthState } from "@/lib/server-auth";
import { createPageMetadata } from "@/lib/site";

export const metadata = createPageMetadata({
  description: "Comece seu workspace MarginFlow com login Google e acesso protegido ao app.",
  path: "/sign-in",
  title: "Entrar",
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
    <main className="flex min-h-[70vh] items-center pt-12 md:pt-16">
      <Container size="sm" className="flex flex-col items-center">
        <SignInPanel />
      </Container>
    </main>
  );
}
