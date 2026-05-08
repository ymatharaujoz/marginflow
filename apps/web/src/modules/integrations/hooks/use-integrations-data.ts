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
const syncProvider: IntegrationProviderSlug = "mercadolivre";
const syncStatusQueryKey = ["sync-status", syncProvider] as const;
const syncHistoryQueryKey = ["sync-history", syncProvider] as const;

async function fetchIntegrations(): Promise<IntegrationConnectionRecord[]> {
  const response = await apiClient.get<{ data: IntegrationConnectionRecord[]; error: null }>("/integrations");
  return response.data;
}

async function fetchSyncStatus(): Promise<SyncStatusResponse> {
  const response = await apiClient.get<{ data: SyncStatusResponse; error: null }>(
    `/sync/status?provider=${syncProvider}`,
  );
  return response.data;
}

async function fetchSyncHistory(): Promise<SyncRunRecord[]> {
  const response = await apiClient.get<{ data: SyncRunRecord[]; error: null }>(
    `/sync/history?provider=${syncProvider}`,
  );
  return response.data;
}

export interface UseIntegrationsDataOptions {
  onError?: (error: Error, context: { type: string }) => void;
  onSyncSuccess?: (data: RunSyncResponse) => void;
}

export function useIntegrationsData(options: UseIntegrationsDataOptions = {}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const integrationsQuery = useQuery({
    queryFn: fetchIntegrations,
    queryKey: integrationsQueryKey,
  });

  const syncStatusQuery = useQuery({
    queryFn: fetchSyncStatus,
    queryKey: syncStatusQueryKey,
  });

  const syncHistoryQuery = useQuery({
    queryFn: fetchSyncHistory,
    queryKey: syncHistoryQueryKey,
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
      await queryClient.invalidateQueries({ queryKey: syncStatusQueryKey });
      await queryClient.invalidateQueries({ queryKey: syncHistoryQueryKey });
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
      await queryClient.invalidateQueries({ queryKey: syncStatusQueryKey });
      await queryClient.invalidateQueries({ queryKey: syncHistoryQueryKey });
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
      await queryClient.invalidateQueries({ queryKey: syncStatusQueryKey });
      await queryClient.invalidateQueries({ queryKey: syncHistoryQueryKey });
      router.refresh();
    },
  });

  const refetchAll = () => {
    integrationsQuery.refetch();
    syncStatusQuery.refetch();
    syncHistoryQuery.refetch();
  };

  const mercadoLivreConnection = integrationsQuery.data?.find((c) => c.provider === syncProvider);

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
    mercadoLivreConnection,
    syncProvider,
  };
}
