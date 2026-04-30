import { redirect } from "next/navigation";
import { IntegrationsHub } from "@/components/integrations/integrations-hub";
import { readServerAuthState } from "@/lib/server-auth";
import { readServerBillingState } from "@/lib/server-billing";

type IntegrationsPageProps = {
  searchParams: Promise<{
    message?: string;
    provider?: string;
    status?: string;
  }>;
};

export default async function IntegrationsPage({ searchParams }: IntegrationsPageProps) {
  const [authState, billingState, params] = await Promise.all([
    readServerAuthState(),
    readServerBillingState(),
    searchParams,
  ]);

  if (!authState) {
    redirect("/sign-in");
  }

  if (!billingState?.entitled) {
    redirect("/app/billing");
  }

  return (
    <IntegrationsHub
      initialMessage={params.message ?? null}
      initialStatus={params.status === "error" || params.status === "success" ? params.status : null}
      organizationName={authState.organization.name}
    />
  );
}
