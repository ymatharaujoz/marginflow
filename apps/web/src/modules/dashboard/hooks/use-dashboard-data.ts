"use client";

import { useQuery } from "@tanstack/react-query";
import type {
  DashboardChartsResponse,
  DashboardProfitabilityResponse,
  DashboardRecentSyncResponse,
  DashboardSummaryResponse,
  IntegrationProviderSlug,
} from "@lucreii/types";
import {
  dashboardChartsApiResponseSchema,
  dashboardProfitabilityApiResponseSchema,
  dashboardRecentSyncApiResponseSchema,
  dashboardSummaryApiResponseSchema,
} from "@lucreii/validation";
import { ApiClientError, apiClient } from "@/lib/api/client";
import { deriveBusinessStatus, determineDashboardFinancialState } from "../calculations/financial-state";

const dashboardSummaryQueryKey = ["dashboard-summary"] as const;
const dashboardChartsQueryKey = ["dashboard-charts"] as const;
const dashboardRecentSyncQueryKey = ["dashboard-recent-sync"] as const;
const dashboardProfitabilityQueryKey = ["dashboard-profitability"] as const;

function dashboardUrl(path: string, provider?: IntegrationProviderSlug | null) {
  return provider ? `${path}?provider=${provider}` : path;
}

export async function fetchDashboardSummary(
  providerOrLegacy?: IntegrationProviderSlug | boolean | null,
): Promise<DashboardSummaryResponse> {
  const provider = typeof providerOrLegacy === "string" ? providerOrLegacy : null;
  return apiClient.getValidatedData(
    dashboardUrl("/dashboard/summary", provider),
    dashboardSummaryApiResponseSchema,
  );
}

export async function fetchDashboardCharts(
  provider?: IntegrationProviderSlug | null,
): Promise<DashboardChartsResponse> {
  return apiClient.getValidatedData(
    dashboardUrl("/dashboard/charts", provider),
    dashboardChartsApiResponseSchema,
  );
}

export async function fetchDashboardRecentSync(
  provider?: IntegrationProviderSlug | null,
): Promise<DashboardRecentSyncResponse> {
  return apiClient.getValidatedData(
    dashboardUrl("/dashboard/recent-sync", provider),
    dashboardRecentSyncApiResponseSchema,
  );
}

export async function fetchDashboardProfitability(
  provider?: IntegrationProviderSlug | null,
): Promise<DashboardProfitabilityResponse> {
  return apiClient.getValidatedData(
    dashboardUrl("/dashboard/profitability", provider),
    dashboardProfitabilityApiResponseSchema,
  );
}

export function useDashboardData(provider: IntegrationProviderSlug | null = null) {
  const summaryQuery = useQuery({
    queryFn: () => fetchDashboardSummary(provider),
    queryKey: [...dashboardSummaryQueryKey, provider],
    retry: 2,
  });

  const chartsQuery = useQuery({
    queryFn: () => fetchDashboardCharts(provider),
    queryKey: [...dashboardChartsQueryKey, provider],
    retry: 2,
  });

  const recentSyncQuery = useQuery({
    queryFn: () => fetchDashboardRecentSync(provider),
    queryKey: [...dashboardRecentSyncQueryKey, provider],
    retry: 1,
  });

  const profitabilityQuery = useQuery({
    queryFn: () => fetchDashboardProfitability(provider),
    queryKey: [...dashboardProfitabilityQueryKey, provider],
    retry: 2,
  });

  const isLoading = summaryQuery.isLoading || chartsQuery.isLoading || profitabilityQuery.isLoading;
  const error = summaryQuery.error || chartsQuery.error || profitabilityQuery.error || null;
  const financialState = determineDashboardFinancialState(
    summaryQuery.data,
    chartsQuery.data,
    profitabilityQuery.data,
  );
  const businessStatus = deriveBusinessStatus(summaryQuery.data);

  return {
    summaryQuery,
    chartsQuery,
    recentSyncQuery,
    profitabilityQuery,
    isLoading,
    error: error as Error | ApiClientError | null,
    financialState,
    businessStatus,
    lastSyncDate: recentSyncQuery.data?.lastCompletedRun?.finishedAt ?? undefined,
    refetchAll() {
      summaryQuery.refetch();
      chartsQuery.refetch();
      profitabilityQuery.refetch();
      recentSyncQuery.refetch();
    },
  };
}
