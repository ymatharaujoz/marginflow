"use client";

import { ProductsShell } from "./products-shell";

interface ProductsHubProps {
  activeCompanyCount?: number;
  organizationName: string;
}

export function ProductsHub({
  activeCompanyCount = 1,
  organizationName,
}: ProductsHubProps) {
  return (
    <ProductsShell activeCompanyCount={activeCompanyCount} organizationName={organizationName}>
      <div className="text-sm text-muted-foreground">
        Selecione uma secao no menu para continuar.
      </div>
    </ProductsShell>
  );
}
