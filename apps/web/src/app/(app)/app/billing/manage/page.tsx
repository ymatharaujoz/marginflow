import { redirect } from "next/navigation";
import { ManageSubscriptionPanel } from "@/components/billing/manage-subscription-panel";
import { hasSubscriptionForProtectedApp } from "@/lib/protected-app-route";
import { readServerAuthState } from "@/lib/server-auth";
import { readServerBillingState } from "@/lib/server-billing";

export const metadata = {
  title: "Gerenciar Assinatura",
};

export default async function ManageBillingPage() {
  const [authState, billingState] = await Promise.all([
    readServerAuthState(),
    readServerBillingState(),
  ]);

  if (!authState) {
    redirect("/sign-in");
  }

  // Sem assinatura: redireciona para checkout
  if (!hasSubscriptionForProtectedApp(billingState)) {
    redirect("/app/billing");
  }

  return (
    <ManageSubscriptionPanel
      billingState={billingState}
      organizationName={authState.organization?.name ?? authState.user.name}
    />
  );
}
