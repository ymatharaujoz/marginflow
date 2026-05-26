import { redirect } from "next/navigation";
import { ProductsShell } from "@/components/products/products-shell";
import { resolveProtectedAppRedirect } from "@/lib/protected-app-route";
import { readServerAuthState } from "@/lib/server-auth";
import { readServerBillingState } from "@/lib/server-billing";
import { hasActiveCompany, readServerCompanies } from "@/lib/server-companies";

export default async function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
    <ProductsShell
      organizationName={authState.organization?.name ?? authState.user.name}
    >
      {children}
    </ProductsShell>
  );
}
