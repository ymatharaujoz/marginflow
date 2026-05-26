import { readServerAuthState } from "@/lib/server-auth";
import { ProductsHomeClient } from "@/components/products/products-home-client";

export default async function ProductsPerformancePage() {
  const authState = await readServerAuthState();
  const organizationName =
    authState?.organization?.name ?? authState?.user?.name ?? "";
  return (
    <ProductsHomeClient organizationName={organizationName} view="performance" />
  );
}
