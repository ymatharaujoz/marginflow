import { redirect } from "next/navigation";
import { ProductsHub } from "@/components/products/products-hub";
import { resolveProtectedAppRedirect } from "@/lib/protected-app-route";
import { readServerAuthState } from "@/lib/server-auth";
import { readServerBillingState } from "@/lib/server-billing";

export default async function ProductsPage() {
  const [authState, billingState] = await Promise.all([
    readServerAuthState(),
    readServerBillingState(),
  ]);

  const redirectTarget = resolveProtectedAppRedirect(authState, billingState);

  if (redirectTarget) {
    redirect(redirectTarget);
  }

  return (
    <ProductsHub organizationName={authState.organization?.name ?? authState.user.name} />
  );
}
