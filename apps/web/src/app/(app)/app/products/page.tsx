import { redirect } from "next/navigation";
import { ProductsHub } from "@/components/products/products-hub";
import { readServerAuthState } from "@/lib/server-auth";
import { readServerBillingState } from "@/lib/server-billing";

export default async function ProductsPage() {
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

  return <ProductsHub organizationName={authState.organization.name} />;
}
