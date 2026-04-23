import { redirect } from "next/navigation";
import { Container } from "@marginflow/ui";
import { SignInPanel } from "@/components/auth/sign-in-panel";
import { readServerAuthState } from "@/lib/server-auth";

export default async function SignInPage() {
  const authState = await readServerAuthState();

  if (authState) {
    redirect("/app");
  }

  return (
    <main className="pb-12 pt-10 md:pb-16 md:pt-14">
      <Container>
        <SignInPanel />
      </Container>
    </main>
  );
}
