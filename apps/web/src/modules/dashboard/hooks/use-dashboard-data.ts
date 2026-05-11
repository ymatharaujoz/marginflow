"use client";

import { useQuery } from "@tanstack/react-query";
import type {
  DashboardChartsResponse,
  DashboardProfitabilityResponse,
  DashboardRecentSyncResponse,
  DashboardSummaryResponse,
} from "@marginflow/types";
import {
  dashboardChartsApiResponseSchema,
  dashboardProfitabilityApiResponseSchema,
  dashboardRecentSyncApiResponseSchema,
  dashboardSummaryApiResponseSchema,
} from "@marginflow/validation";
import { ApiClientError, apiClient } from "@/lib/api/client";
import { deriveBusinessStatus, determineDashboardFinancialState } from "../calculations/financial-state";

const dashboardSummaryQueryKey = ["dashboard-summary"] as const;
const dashboardChartsQueryKey = ["dashboard-charts"] as const;
const dashboardRecentSyncQueryKey = ["dashboard-recent-sync"] as const;
const dashboardProfitabilityQueryKey = ["dashboard-profitability"] as const;

export async function fetchDashboardSummary(_legacyUseMockData?: boolean): Promise<DashboardSummaryResponse> {
  return apiClient.getValidatedData("/dashboard/summary", dashboardSummaryApiResponseSchema);
}

export async function fetchDashboardCharts(_legacyUseMockData?: boolean): Promise<DashboardChartsResponse> {
  return apiClient.getValidatedData("/dashboard/charts", dashboardChartsApiResponseSchema);
}

export async function fetchDashboardRecentSync(_legacyUseMockData?: boolean): Promise<DashboardRecentSyncResponse> {
  return apiClient.getValidatedData("/dashboard/recent-sync", dashboardRecentSyncApiResponseSchema);
}

export async function fetchDashboardProfitability(_legacyUseMockData?: boolean): Promise<DashboardProfitabilityResponse> {
  return apiClient.getValidatedData(
    "/dashboard/profitability",
    dashboardProfitabilityApiResponseSchema,
  );
}

export function useDashboardData() {
  const summaryQuery = useQuery({
    queryFn: () => fetchDashboardSummary(),
    queryKey: dashboardSummaryQueryKey,
    retry: 2,
  });

  const chartsQuery = useQuery({
    queryFn: () => fetchDashboardCharts(),
    queryKey: dashboardChartsQueryKey,
    retry: 2,
  });

  const recentSyncQuery = useQuery({
    queryFn: () => fetchDashboardRecentSync(),
    queryKey: dashboardRecentSyncQueryKey,
    retry: 1,
  });

  const profitabilityQuery = useQuery({
    queryFn: () => fetchDashboardProfitability(),
    queryKey: dashboardProfitabilityQueryKey,
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
