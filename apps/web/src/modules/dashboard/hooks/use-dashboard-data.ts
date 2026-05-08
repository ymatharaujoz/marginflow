"use client";

import { useQuery } from "@tanstack/react-query";
import type {
  DashboardChartsResponse,
  DashboardProfitabilityResponse,
  DashboardRecentSyncResponse,
  DashboardSummaryResponse,
} from "@marginflow/types";
import { ApiClientError, apiClient } from "@/lib/api/client";
import {
  mockDashboardCharts,
  mockDashboardProfitability,
  mockDashboardRecentSync,
  mockDashboardSummary,
} from "@/lib/mock-dashboard-data";
import { deriveBusinessStatus, determineDashboardFinancialState } from "../calculations/financial-state";

const dashboardSummaryQueryKey = ["dashboard-summary"] as const;
const dashboardChartsQueryKey = ["dashboard-charts"] as const;
const dashboardRecentSyncQueryKey = ["dashboard-recent-sync"] as const;
const dashboardProfitabilityQueryKey = ["dashboard-profitability"] as const;
const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

async function resolveDashboardData<T>(
  mockData: T,
  request: () => Promise<{ data: T; error: null }>,
  delayMs: number,
) {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return mockData;
  }

  const response = await request();
  return response.data;
}

async function fetchDashboardSummary(): Promise<DashboardSummaryResponse> {
  return resolveDashboardData(
    mockDashboardSummary,
    () => apiClient.get<{ data: DashboardSummaryResponse; error: null }>("/dashboard/summary"),
    500,
  );
}

async function fetchDashboardCharts(): Promise<DashboardChartsResponse> {
  return resolveDashboardData(
    mockDashboardCharts,
    () => apiClient.get<{ data: DashboardChartsResponse; error: null }>("/dashboard/charts"),
    600,
  );
}

async function fetchDashboardRecentSync(): Promise<DashboardRecentSyncResponse> {
  return resolveDashboardData(
    mockDashboardRecentSync,
    () => apiClient.get<{ data: DashboardRecentSyncResponse; error: null }>("/dashboard/recent-sync"),
    300,
  );
}

async function fetchDashboardProfitability(): Promise<DashboardProfitabilityResponse> {
  return resolveDashboardData(
    mockDashboardProfitability,
    () => apiClient.get<{ data: DashboardProfitabilityResponse; error: null }>("/dashboard/profitability"),
    700,
  );
}

export function useDashboardData() {
  const summaryQuery = useQuery({
    queryFn: fetchDashboardSummary,
    queryKey: dashboardSummaryQueryKey,
    retry: 2,
  });

  const chartsQuery = useQuery({
    queryFn: fetchDashboardCharts,
    queryKey: dashboardChartsQueryKey,
    retry: 2,
  });

  const recentSyncQuery = useQuery({
    queryFn: fetchDashboardRecentSync,
    queryKey: dashboardRecentSyncQueryKey,
    retry: 1,
  });

  const profitabilityQuery = useQuery({
    queryFn: fetchDashboardProfitability,
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
    isUsingMockData: USE_MOCK_DATA,
    refetchAll() {
      summaryQuery.refetch();
      chartsQuery.refetch();
      profitabilityQuery.refetch();
      recentSyncQuery.refetch();
    },
  };
}
