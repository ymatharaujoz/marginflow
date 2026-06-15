"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type {
  ClearSyncHistoryResponse,
  IntegrationConnectionRecord,
  IntegrationConnectResponse,
  IntegrationProviderSlug,
  RunSyncResponse,
  SyncRunRecord,
  SyncStatusResponse,
} from "@marginflow/types";
import { apiClient } from "@/lib/api/client";

const integrationsQueryKey = ["integrations"] as const;
async function fetchIntegrations(): Promise<IntegrationConnectionRecord[]> {
  const response = await apiClient.get<{ data: IntegrationConnectionRecord[]; error: null }>("/integrations");
  return response.data;
}

async function fetchSyncStatus(provider: IntegrationProviderSlug): Promise<SyncStatusResponse> {
  const response = await apiClient.get<{ data: SyncStatusResponse; error: null }>(
    `/sync/status?provider=${provider}`,
  );
  return response.data;
}

async function fetchSyncHistory(provider: IntegrationProviderSlug): Promise<SyncRunRecord[]> {
  const response = await apiClient.get<{ data: SyncRunRecord[]; error: null }>(
    `/sync/history?provider=${provider}`,
  );
  return response.data;
}

export interface UseIntegrationsDataOptions {
  onError?: (error: Error, context: { type: string }) => void;
  onSyncSuccess?: (data: RunSyncResponse) => void;
}

export function useIntegrationsData(
  syncProvider: IntegrationProviderSlug,
  options: UseIntegrationsDataOptions = {},
) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const integrationsQuery = useQuery({
    queryFn: fetchIntegrations,
    queryKey: integrationsQueryKey,
  });

  const syncStatusQuery = useQuery({
    queryFn: () => fetchSyncStatus(syncProvider),
    queryKey: ["sync-status", syncProvider],
  });

  const syncHistoryQuery = useQuery({
    queryFn: () => fetchSyncHistory(syncProvider),
    queryKey: ["sync-history", syncProvider],
  });

  const connectMutation = useMutation({
    mutationFn: async (provider: IntegrationProviderSlug) => {
      const response = await apiClient.post<{ data: IntegrationConnectResponse; error: null }>(
        `/integrations/${provider}/connect`,
      );
      return response.data;
    },
    onSuccess: (data) => {
      window.location.assign(data.authorizationUrl);
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async (provider: IntegrationProviderSlug) => {
      const response = await apiClient.post<{ data: IntegrationConnectionRecord; error: null }>(
        `/integrations/${provider}/disconnect`,
      );
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: integrationsQueryKey });
      await queryClient.invalidateQueries({ queryKey: ["sync-status"] });
      await queryClient.invalidateQueries({ queryKey: ["sync-history"] });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post<{ data: RunSyncResponse; error: null }>("/sync/run", {
        body: { provider: syncProvider },
      });
      return response.data;
    },
    onSuccess: async (data) => {
      options.onSyncSuccess?.(data);
      await queryClient.invalidateQueries({ queryKey: integrationsQueryKey });
      await queryClient.invalidateQueries({ queryKey: ["sync-status", syncProvider] });
      await queryClient.invalidateQueries({ queryKey: ["sync-history", syncProvider] });
      router.refresh();
    },
  });

  const clearHistoryMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post<{ data: ClearSyncHistoryResponse; error: null }>(
        "/sync/history/clear",
        {
          body: { provider: syncProvider },
        },
      );
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sync-status", syncProvider] });
      await queryClient.invalidateQueries({ queryKey: ["sync-history", syncProvider] });
      router.refresh();
    },
  });

  const refetchAll = () => {
    integrationsQuery.refetch();
    syncStatusQuery.refetch();
    syncHistoryQuery.refetch();
  };

  const activeConnection = integrationsQuery.data?.find((c) => c.provider === syncProvider);

  return {
    integrationsQuery: {
      data: integrationsQuery.data,
      isLoading: integrationsQuery.isLoading,
      isFetching: integrationsQuery.isFetching,
      error: integrationsQuery.error,
    },
    syncStatusQuery: {
      data: syncStatusQuery.data,
      isLoading: syncStatusQuery.isLoading,
      error: syncStatusQuery.error,
    },
    syncHistoryQuery: {
      data: syncHistoryQuery.data,
      isLoading: syncHistoryQuery.isLoading,
    },
    connectMutation: {
      isPending: connectMutation.isPending,
      mutate: connectMutation.mutate,
    },
    disconnectMutation: {
      isPending: disconnectMutation.isPending,
      mutate: disconnectMutation.mutate,
    },
    syncMutation: {
      isPending: syncMutation.isPending,
      mutate: syncMutation.mutate,
    },
    clearHistoryMutation: {
      isPending: clearHistoryMutation.isPending,
      mutate: clearHistoryMutation.mutate,
    },
    refetchAll,
    activeConnection,
    syncProvider,
  };
}
