import { redirect } from "next/navigation";
import { OnboardingPanel } from "@/components/onboarding/onboarding-panel";
import { hasSubscriptionForProtectedApp } from "@/lib/protected-app-route";
import { readServerAuthState } from "@/lib/server-auth";
import { readServerBillingState } from "@/lib/server-billing";

export const metadata = {
  title: "Configuração Inicial",
};

export default async function OnboardingPage() {
  const [authState, billingState] = await Promise.all([
    readServerAuthState(),
    readServerBillingState(),
  ]);

  if (!authState) {
    redirect("/sign-in");
  }

  if (!hasSubscriptionForProtectedApp(billingState)) {
    redirect("/app/billing");
  }

  if (authState.organization) {
    redirect("/app");
  }

  return <OnboardingPanel userName={authState.user.name} />;
}
