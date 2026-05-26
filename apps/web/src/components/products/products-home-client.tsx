"use client";

import { ProductsHome } from "@/modules/products";
import { useProductsActions } from "./products-actions-context";

export function ProductsHomeClient({
  organizationName,
  view,
}: {
  organizationName: string;
  view: "catalog" | "performance";
}) {
  const { handleAddProduct, handleImportProducts } = useProductsActions();
  return (
    <ProductsHome
      organizationName={organizationName}
      view={view}
      onAddProduct={handleAddProduct}
      onImportProducts={handleImportProducts}
    />
  );
}
