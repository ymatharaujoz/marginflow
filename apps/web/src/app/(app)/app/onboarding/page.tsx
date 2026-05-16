import { redirect } from "next/navigation";
import { OnboardingPanel } from "@/components/onboarding/onboarding-panel";
import { hasSubscriptionForProtectedApp } from "@/lib/protected-app-route";
import { readServerAuthState } from "@/lib/server-auth";
import { readServerBillingState } from "@/lib/server-billing";
import { hasActiveCompany, readServerCompanies } from "@/lib/server-companies";

export const metadata = {
  title: "Configuração",
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

  if (!authState.organization) {
    return <OnboardingPanel stage="organization" userName={authState.user.name} />;
  }

  const companies = await readServerCompanies();

  if (hasActiveCompany(companies)) {
    redirect("/app");
  }

  return (
    <OnboardingPanel
      organizationName={authState.organization.name}
      stage="company"
      userName={authState.user.name}
    />
  );
}
