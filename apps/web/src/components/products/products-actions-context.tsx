"use client";

import { createContext, useContext } from "react";
import type { UseMutationResult } from "@tanstack/react-query";
import type {
  ProductListItem,
  SyncedProductActionResult,
  SyncedProductRecord,
} from "@marginflow/types";


export type FeedbackTone = "critical" | "neutral";

export type SyncedProductMutationInput = {
  action: "ignore" | "import" | "link";
  externalProductId: string;
  productId?: string;
};

export interface ProductsActionsContextValue {
  handleAddProduct: (context?: {
    companyId: string | null;
    referenceMonth: string;
  }) => void;
  handleImportProducts: () => void;
  availableSyncedProducts: SyncedProductRecord[];
  availableProducts: ProductListItem[];
  linkSelections: Record<string, string>;
  setLinkSelections: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  syncedProductMutation: UseMutationResult<
    { data: SyncedProductActionResult; error: null },
    Error,
    SyncedProductMutationInput
  >;
  feedbackMessage: string | null;
  feedbackTone: FeedbackTone;
}

const ProductsActionsContext = createContext<
  ProductsActionsContextValue | undefined
>(undefined);

export function ProductsActionsProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: ProductsActionsContextValue;
}) {
  return (
    <ProductsActionsContext.Provider value={value}>
      {children}
    </ProductsActionsContext.Provider>
  );
}

export function useProductsActions() {
  const ctx = useContext(ProductsActionsContext);
  if (!ctx) {
    throw new Error(
      "useProductsActions must be used within a ProductsActionsProvider"
    );
  }
  return ctx;
}
