import type { IntegrationProviderSlug } from "./integrations";

export type SyncAvailabilityReason =
  | "available"
  | "outside_window"
  | "provider_disconnected"
  | "provider_needs_reconnect"
  | "provider_sync_unsupported"
  | "provider_unavailable"
  | "sync_in_progress"
  | "window_already_used";

export type SyncWindowSlot = "morning" | "afternoon" | "evening" | null;

export type SyncAvailability = {
  provider: IntegrationProviderSlug;
  canRun: boolean;
  reason: SyncAvailabilityReason;
  message: string;
  currentWindowKey: string | null;
  currentWindowLabel: string | null;
  currentWindowSlot: SyncWindowSlot;
  nextAvailableAt: string | null;
  lastSuccessfulSyncAt: string | null;
};

export type SyncImportCounts = {
  orders: number;
  products: number;
  items: number;
  fees: number;
};

export type SyncRunRecord = {
  id: string;
  provider: IntegrationProviderSlug;
  status: string;
  windowKey: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  errorSummary: string | null;
  counts: SyncImportCounts;
  cursor: Record<string, unknown> | null;
};

export type SyncStatusResponse = {
  availability: SyncAvailability;
  activeRun: SyncRunRecord | null;
  lastCompletedRun: SyncRunRecord | null;
};

export type RunSyncResponse = {
  run: SyncRunRecord;
  availability: SyncAvailability;
};

export type ClearSyncHistoryResponse = {
  clearedCount: number;
};
