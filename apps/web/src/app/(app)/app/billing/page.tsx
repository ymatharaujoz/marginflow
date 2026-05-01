import { redirect } from "next/navigation";
import { Container } from "@marginflow/ui";
import { BillingPanel } from "@/components/billing/billing-panel";
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
  const checkoutState = resolvedSearchParams?.checkout ?? null;

  if (!authState) {
    redirect("/sign-in");
  }

  if (billingState?.entitled) {
    redirect("/app");
  }

  return (
    <Container>
      <BillingPanel
        checkoutSessionId={resolvedSearchParams?.session_id ?? null}
        checkoutState={checkoutState}
        organizationName={authState.organization.name}
        snapshot={billingState}
      />
    </Container>
  );
}
