import type {
  IntegrationConnectionRecord,
  IntegrationProviderSlug,
  SyncRunRecord,
  SyncStatusResponse,
} from "@marginflow/types";

export type { IntegrationConnectionRecord, IntegrationProviderSlug, SyncRunRecord, SyncStatusResponse };

export interface IntegrationsHubProps {
  initialMessage: string | null;
  initialStatus: "error" | "success" | null;
  organizationName: string;
}

export type MessageTone = "critical" | "neutral";

export type BusyAction = "connect" | "disconnect" | null;

export interface UseIntegrationsDataReturn {
  integrationsQuery: {
    data?: IntegrationConnectionRecord[];
    isLoading: boolean;
    isFetching: boolean;
    error: Error | null;
  };
  syncStatusQuery: {
    data?: SyncStatusResponse;
    isLoading: boolean;
    error: Error | null;
  };
  syncHistoryQuery: {
    data?: SyncRunRecord[];
    isLoading: boolean;
  };
  syncMutation: {
    isPending: boolean;
    mutate: () => void;
  };
  connectMutation: {
    isPending: boolean;
    mutate: (provider: IntegrationProviderSlug) => void;
  };
  disconnectMutation: {
    isPending: boolean;
    mutate: (provider: IntegrationProviderSlug) => void;
  };
  clearHistoryMutation: {
    isPending: boolean;
    mutate: () => void;
  };
  refetchAll: () => void;
}

export interface IntegrationsHeaderProps {
  organizationName: string;
  connectedCount: number;
  totalCount: number;
  onSyncClick: () => void;
  isSyncLoading: boolean;
  canSync: boolean;
}

export interface IntegrationCardsProps {
  connections: IntegrationConnectionRecord[];
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  busyProvider: IntegrationProviderSlug | null;
  busyAction: BusyAction;
  onConnect: (provider: IntegrationProviderSlug) => void;
  onDisconnect: (provider: IntegrationProviderSlug) => void;
}

export interface SyncSectionProps {
  syncStatus?: SyncStatusResponse;
  syncHistory: SyncRunRecord[];
  isSyncLoading: boolean;
  isHistoryLoading: boolean;
  isClearing: boolean;
  onSyncClick: () => void;
  onClearHistory: () => void;
  canSync: boolean;
}

export interface ErrorStateProps {
  error: Error;
  onRetry: () => void;
}

export interface LoadingIntegrationsProps {
  cardCount?: number;
}
