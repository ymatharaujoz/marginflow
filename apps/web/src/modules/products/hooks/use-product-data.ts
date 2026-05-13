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

export function getSaoPauloCurrentReferenceMonth(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;

  return year && month ? `${year}-${month}-01` : `${now.toISOString().slice(0, 7)}-01`;
}

const REFERENCE_MONTH_RE = /^\d{4}-\d{2}-01$/;

/** Newest-first list of month starts (\`yyyy-mm-01\`) up to cap, length \`count\`. */
export function enumerateRecentReferenceMonthsDescending(capIsoDay: string, count: number): string[] {
  const ym = capIsoDay.slice(0, 7);
  const parts = ym.split("-").map(Number);
  let year = parts[0] ?? NaN;
  let month = parts[1] ?? NaN;
  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return [];
  }

  const out: string[] = [];
  let y = year;
  let m = month;
  for (let i = 0; i < count; i++) {
    out.push(`${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-01`);
    m -= 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
  }
  return out;
}

export function formatReferenceMonthPtBr(referenceMonthIso: string) {
  const ym = referenceMonthIso.slice(0, 7);
  const bits = ym.split("-").map(Number);
  const y = bits[0];
  const mo = bits[1];
  if (!Number.isFinite(y) || !Number.isFinite(mo)) {
    return referenceMonthIso.slice(0, 7);
  }

  const midMonthUtc = new Date(Date.UTC(y, mo - 1, 15, 12, 0, 0));
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(midMonthUtc);
}

export function mergeDescendingReferenceMonthChoices(
  current: string,
  capIsoDay: string,
  historyDepth: number,
): string[] {
  const capList = enumerateRecentReferenceMonthsDescending(capIsoDay, historyDepth);
  const unique = new Set<string>(capList);
  unique.add(current);
  return [...unique].sort((a, b) => (a > b ? -1 : a < b ? 1 : 0));
}

export async function fetchProductCatalog(input?: { referenceMonth?: string }): Promise<ProductCatalogData> {
  const params = new URLSearchParams();

  if (input?.referenceMonth) {
    params.set("referenceMonth", input.referenceMonth);
  }

  const path = params.size > 0 ? `/products/analytics?${params.toString()}` : "/products/analytics";

  return apiClient.getValidatedData<ProductAnalyticsSnapshot>(
    path,
    productAnalyticsSnapshotApiResponseSchema,
  );
}

const DEFAULT_PAGE_SIZE = 10;
const REFERENCE_MONTH_HISTORY = 48;

export function useProductData() {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(DEFAULT_PAGE_SIZE);
  const [referenceMonth, setReferenceMonthState] = useState(() => getSaoPauloCurrentReferenceMonth());

  const setReferenceMonth = useCallback((next: string) => {
    if (!REFERENCE_MONTH_RE.test(next)) {
      return;
    }
    const cap = getSaoPauloCurrentReferenceMonth();
    const effective = next > cap ? cap : next;
    setReferenceMonthState(effective);
    setCurrentPage(1);
  }, []);

  const { data, isLoading, error, refetch } = useQuery({
    queryFn: () =>
      fetchProductCatalog({
        referenceMonth,
      }),
    queryKey: [...productCatalogQueryKey, referenceMonth],
  });

  const allRows = useMemo(() => {
    if (!data) return [];
    return buildProductTableRows(data);
  }, [data]);

  const stats = useMemo(() => {
    if (!data) return null;
    return buildCatalogStats(data);
  }, [data]);

  const insights = useMemo(() => {
    if (!data || !stats) return [];
    return buildProductInsights(data, stats, allRows);
  }, [data, stats, allRows]);

  const sortedRows = useMemo(() => {
    return [...allRows].sort((a, b) => {
      const channelCompare = a.channelLabel.localeCompare(b.channelLabel);
      if (channelCompare !== 0) {
        return channelCompare;
      }

      const nameCompare = a.name.localeCompare(b.name);
      if (nameCompare !== 0) {
        return nameCompare;
      }

      return a.sku.localeCompare(b.sku);
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

  const combinedError = error;
  const isUnauthorized = combinedError instanceof ApiClientError && combinedError.status === 401;

  const referenceMonthSelectOptions = useMemo(() => {
    const cap = getSaoPauloCurrentReferenceMonth();
    return mergeDescendingReferenceMonthChoices(referenceMonth, cap, REFERENCE_MONTH_HISTORY);
  }, [referenceMonth]);

  return {
    data,
    referenceMonth,
    referenceMonthSelectOptions,
    stats,
    insights,
    rows: sortedRows,
    allRows: sortedRows,
    pagination,
    financialState,
    dataGaps: data?.dataGaps ?? [],
    products: data?.products ?? [],
    syncedProducts: data?.syncedProducts ?? [],
    isLoading,
    error: combinedError,
    isUnauthorized,
    setReferenceMonth,
    refresh,
    refetch,
    goToPage,
  };
}
