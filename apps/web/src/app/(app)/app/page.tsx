import { redirect } from "next/navigation";
import { DashboardHome } from "@/modules/dashboard";
import { resolveProtectedAppRedirect } from "@/lib/protected-app-route";
import { readServerAuthState } from "@/lib/server-auth";
import { readServerBillingState } from "@/lib/server-billing";

export default async function AppHomePage() {
  const [authState, billingState] = await Promise.all([
    readServerAuthState(),
    readServerBillingState(),
  ]);

  const redirectTarget = resolveProtectedAppRedirect(authState, billingState);

  if (redirectTarget) {
    redirect(redirectTarget);
  }

  return (
    <DashboardHome organizationName={authState.organization?.name ?? authState.user.name} />
  );
}
