"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useCallback } from "react";
import type { ProductAnalyticsSnapshot } from "@marginflow/types";
import { productAnalyticsSnapshotApiResponseSchema } from "@marginflow/validation";
import { ApiClientError, apiClient } from "@/lib/api/client";
import type { ProductCatalogData, ProductTableRow, PaginationState } from "../types/products";
import {
  buildCatalogStats,
  buildProductInsights,
  buildProductTableRows,
  determineFinancialState,
} from "../calculations/product-insights";

export const productCatalogQueryKey = ["product-catalog-module"] as const;

export async function fetchProductCatalog(_legacyUseMockData?: boolean): Promise<ProductCatalogData> {
  return apiClient.getValidatedData<ProductAnalyticsSnapshot>(
    "/products/analytics",
    productAnalyticsSnapshotApiResponseSchema,
  );
}

const DEFAULT_PAGE_SIZE = 10;

export function useProductData() {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(DEFAULT_PAGE_SIZE);

  const { data, isLoading, error, refetch } = useQuery({
    queryFn: () => fetchProductCatalog(),
    queryKey: productCatalogQueryKey,
  });

  const stats = useMemo(() => {
    if (!data) return null;
    return buildCatalogStats(data);
  }, [data]);

  const insights = useMemo(() => {
    if (!data || !stats) return [];
    return buildProductInsights(data, stats);
  }, [data, stats]);

  const allRows = useMemo(() => {
    if (!data) return [];
    return buildProductTableRows(data);
  }, [data]);

  const sortedRows = useMemo(() => {
    return [...allRows].sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [allRows]);

  const pagination: PaginationState = useMemo(() => {
    const totalItems = sortedRows.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(currentPage, totalPages);

    return {
      currentPage: safePage,
      totalPages,
      pageSize,
      totalItems,
    };
  }, [sortedRows.length, currentPage, pageSize]);

  const paginatedRows: ProductTableRow[] = useMemo(() => {
    const start = (pagination.currentPage - 1) * pageSize;
    const end = start + pageSize;
    return sortedRows.slice(start, end);
  }, [sortedRows, pagination.currentPage, pageSize]);

  const financialState = useMemo(() => {
    if (!data) return "empty";
    return determineFinancialState(data);
  }, [data]);

  const refresh = useCallback(
    async (message?: string) => {
      await queryClient.invalidateQueries({ queryKey: productCatalogQueryKey });
      return message;
    },
    [queryClient],
  );

  const goToPage = useCallback((page: number) => {
    setCurrentPage(() => Math.max(1, page));
  }, []);

  const isUnauthorized = error instanceof ApiClientError && error.status === 401;

  return {
    data,
    stats,
    insights,
    rows: paginatedRows,
    allRows: sortedRows,
    pagination,
    financialState,
    dataGaps: data?.dataGaps ?? [],
    products: data?.products ?? [],
    syncedProducts: data?.syncedProducts ?? [],
    isLoading,
    error,
    isUnauthorized,
    refresh,
    refetch,
    goToPage,
  };
}
