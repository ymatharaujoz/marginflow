import type { MarketplaceConnection } from "@marginflow/database";
import type { IntegrationProviderSlug } from "@marginflow/types";

export type IntegrationProviderAuthorization = {
  authorizationUrl: string;
};

export type IntegrationProviderCallbackResult = {
  accessToken: string;
  connectedAccountId: string;
  connectedAccountLabel: string | null;
  metadata: Record<string, unknown>;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
};

export type IntegrationProviderContext = {
  organizationId: string;
  state: string;
};

export type IntegrationSyncCursor = Record<string, unknown> | null;

export type IntegrationSyncProduct = {
  externalProductId: string;
  sku: string | null;
  title: string | null;
  metadata: Record<string, unknown>;
};

export type IntegrationSyncOrderItem = {
  externalProductId: string | null;
  quantity: number;
  sku?: string | null;
  title?: string | null;
  unitPrice: string;
  totalPrice: string;
};

export type IntegrationSyncFee = {
  feeType: string;
  amount: string;
  currency: string;
  metadata: Record<string, unknown>;
};

export type IntegrationSyncOrder = {
  externalOrderId: string;
  status: string;
  currency: string;
  orderedAt: string | null;
  totalAmount: string;
  metadata: Record<string, unknown>;
  items: IntegrationSyncOrderItem[];
  fees: IntegrationSyncFee[];
};

export type IntegrationSyncContext = {
  connection: MarketplaceConnection;
  cursor: IntegrationSyncCursor;
  organizationId: string;
};

export type IntegrationSyncResult = {
  cursor: IntegrationSyncCursor;
  orders: IntegrationSyncOrder[];
  products: IntegrationSyncProduct[];
};

export type IntegrationProvider = {
  readonly displayName: string;
  readonly provider: IntegrationProviderSlug;
  createAuthorization(input: IntegrationProviderContext): Promise<IntegrationProviderAuthorization>;
  disconnect(connection: MarketplaceConnection | null): Promise<void>;
  exchangeCode(code: string): Promise<IntegrationProviderCallbackResult>;
  isConfigured(): boolean;
  supportsSync(): boolean;
  syncOrders(input: IntegrationSyncContext): Promise<IntegrationSyncResult>;
};

export class IntegrationProviderError extends Error {
  constructor(
    message: string,
    readonly code:
      | "callback_invalid"
      | "callback_rejected"
      | "provider_not_configured"
      | "remote_request_failed"
      | "unsupported_provider",
  ) {
    super(message);
    this.name = "IntegrationProviderError";
  }
}
