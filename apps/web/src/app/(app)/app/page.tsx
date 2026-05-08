import { redirect } from "next/navigation";
import { DashboardHome } from "@/modules/dashboard";
import { readServerAuthState } from "@/lib/server-auth";
import { readServerBillingState } from "@/lib/server-billing";

export default async function AppHomePage() {
  const [authState, billingState] = await Promise.all([
    readServerAuthState(),
    readServerBillingState(),
  ]);

  if (!authState) {
    redirect("/sign-in");
  }

  if (!billingState?.entitled) {
    redirect("/app/billing");
  }

  return <DashboardHome organizationName={authState.organization.name} />;
}
