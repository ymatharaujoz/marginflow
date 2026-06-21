"use client";

import { useQuery } from "@tanstack/react-query";
import type { DashboardRecentSyncResponse, IntegrationProviderSlug } from "@lucreii/types";
import { fetchDashboardRecentSync } from "./use-dashboard-data";

export type DashboardConnectionStatuses = Record<
  IntegrationProviderSlug,
  DashboardRecentSyncResponse | undefined
>;

const dashboardRecentSyncByProviderQueryKey = ["dashboard-recent-sync-by-provider"] as const;

export function useDashboardConnectionStatuses() {
  const mercadoLivreQuery = useQuery({
    queryFn: () => fetchDashboardRecentSync("mercadolivre"),
    queryKey: [...dashboardRecentSyncByProviderQueryKey, "mercadolivre"],
    retry: 1,
  });

  const shopeeQuery = useQuery({
    queryFn: () => fetchDashboardRecentSync("shopee"),
    queryKey: [...dashboardRecentSyncByProviderQueryKey, "shopee"],
    retry: 1,
  });

  const sheinQuery = useQuery({
    queryFn: () => fetchDashboardRecentSync("shein"),
    queryKey: [...dashboardRecentSyncByProviderQueryKey, "shein"],
    retry: 1,
  });

  return {
    isLoading:
      mercadoLivreQuery.isLoading || shopeeQuery.isLoading || sheinQuery.isLoading,
    syncStatusByProvider: {
      mercadolivre: mercadoLivreQuery.data,
      shopee: shopeeQuery.data,
      shein: sheinQuery.data,
    } satisfies DashboardConnectionStatuses,
  };
}
