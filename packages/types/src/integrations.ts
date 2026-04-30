export type IntegrationProviderSlug = "mercadolivre" | "shopee";

export type IntegrationConnectionStatus =
  | "connected"
  | "disconnected"
  | "needs_reconnect"
  | "unavailable";

export type IntegrationConnectionRecord = {
  provider: IntegrationProviderSlug;
  displayName: string;
  status: IntegrationConnectionStatus;
  statusMessage: string;
  connectedAccountId: string | null;
  connectedAccountLabel: string | null;
  tokenExpiresAt: string | null;
  lastSyncedAt: string | null;
  connectAvailable: boolean;
  disconnectAvailable: boolean;
  connectLabel: string;
  disconnectLabel: string | null;
};

export type IntegrationConnectResponse = {
  authorizationUrl: string;
  provider: IntegrationProviderSlug;
};
