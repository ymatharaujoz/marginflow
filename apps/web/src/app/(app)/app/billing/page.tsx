import { redirect } from "next/navigation";
import { BillingPanel } from "@/components/billing/billing-panel";
import { hasSubscriptionForProtectedApp } from "@/lib/protected-app-route";
import { readServerAuthState } from "@/lib/server-auth";
import { readServerBillingState } from "@/lib/server-billing";

type BillingPageProps = {
  searchParams?: Promise<{
    checkout?: string;
    session_id?: string;
  }>;
};

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const [authState, billingState, resolvedSearchParams] = await Promise.all([
    readServerAuthState(),
    readServerBillingState(),
    searchParams,
  ]);

  if (!authState) {
    redirect("/sign-in");
  }

  // Com assinatura ativa: redireciona para gerenciamento
  if (hasSubscriptionForProtectedApp(billingState)) {
    redirect("/app/billing/manage");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-surface-strong/20">
      <div className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <BillingPanel
          checkoutSessionId={resolvedSearchParams?.session_id ?? null}
          checkoutState={resolvedSearchParams?.checkout ?? null}
          organizationName={authState.organization?.name ?? authState.user.name}
        />
      </div>
    </div>
  );
}
