export type IntegrationProviderSlug = "mercadolivre" | "shopee" | "shein";

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

export type MarketplaceCatalogImportIssue = {
  externalProductId: string;
  message: string;
  sku: string;
};

export type MarketplaceCatalogImportResult = {
  conflicts: MarketplaceCatalogImportIssue[];
  created: number;
  errors: MarketplaceCatalogImportIssue[];
  found: number;
  unchanged: number;
  updated: number;
};

export type IntegrationConnectResponse = {
  authorizationUrl: string;
  provider: IntegrationProviderSlug;
};
