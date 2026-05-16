import { redirect } from "next/navigation";
import { DashboardHome } from "@/modules/dashboard";
import { resolveProtectedAppRedirect } from "@/lib/protected-app-route";
import { readServerAuthState } from "@/lib/server-auth";
import { readServerBillingState } from "@/lib/server-billing";
import { hasActiveCompany, readServerCompanies } from "@/lib/server-companies";

export default async function AppHomePage() {
  const [authState, billingState] = await Promise.all([
    readServerAuthState(),
    readServerBillingState(),
  ]);

  const redirectTarget = resolveProtectedAppRedirect(authState, billingState);

  if (redirectTarget) {
    redirect(redirectTarget);
  }

  if (!authState) {
    redirect("/sign-in");
  }

  const companies = await readServerCompanies();

  if (!hasActiveCompany(companies)) {
    redirect("/app/onboarding");
  }

  return (
    <DashboardHome organizationName={authState.organization?.name ?? authState.user.name} />
  );
}
