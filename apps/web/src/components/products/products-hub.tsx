"use client";

import { ProductsShell } from "./products-shell";

interface ProductsHubProps {
  organizationName: string;
}

export function ProductsHub({ organizationName }: ProductsHubProps) {
  return (
    <ProductsShell organizationName={organizationName}>
      <div className="text-sm text-muted-foreground">
        Selecione uma secao no menu para continuar.
      </div>
    </ProductsShell>
  );
}
