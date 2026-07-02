import type { MarketplaceConnection } from "@lucreii/database";
import type { IntegrationProviderSlug, ManualSyncRange } from "@lucreii/types";

export type IntegrationProviderAuthorization = {
  authorizationUrl: string;
};

export type IntegrationProviderCallbackInput = {
  codeVerifier?: string;
  externalAccountId?: string;
};

export type IntegrationProviderCallbackResult = {
  accessToken: string;
  connectedAccountId: string;
  connectedAccountLabel: string | null;
  metadata: Record<string, unknown>;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
};

export type IntegrationProviderTokenRefreshResult = {
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date;
};

export type IntegrationProviderContext = {
  codeVerifier?: string;
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

export type IntegrationCatalogProduct = {
  externalProductId: string;
  images: string[];
  isActive: boolean;
  metadata: Record<string, unknown>;
  sellingPrice: string;
  sku: string;
  title: string;
};

export type IntegrationCatalogImportContext = {
  connection: MarketplaceConnection;
  organizationId: string;
};

export type IntegrationCatalogSingleItemImportContext =
  IntegrationCatalogImportContext & {
    externalProductId: string;
  };

export type IntegrationSyncOrderItem = {
  externalProductId: string | null;
  metadata?: Record<string, unknown>;
  quantity: number;
  sku?: string | null;
  title?: string | null;
  unitPrice: string;
  totalPrice: string;
  variationId?: string | null;
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

export type IntegrationSyncNotification = {
  notificationId: string | null;
  resource: string | null;
  topic: string | null;
};

export type IntegrationSyncContext = {
  organizationId: string;
} & (
  | {
      connection: MarketplaceConnection;
      cursor: IntegrationSyncCursor;
      mode?: "incremental";
      notification?: IntegrationSyncNotification | null;
    }
  | {
      connection: MarketplaceConnection;
      mode: "manual_range";
      range: ManualSyncRange;
    }
);

export type IntegrationSyncResult = {
  cursor: IntegrationSyncCursor;
  metadata?: Record<string, unknown>;
  orders: IntegrationSyncOrder[];
  products: IntegrationSyncProduct[];
};

export type IntegrationProvider = {
  readonly displayName: string;
  readonly provider: IntegrationProviderSlug;
  createAuthorization(
    input: IntegrationProviderContext,
  ): Promise<IntegrationProviderAuthorization>;
  disconnect(connection: MarketplaceConnection | null): Promise<void>;
  exchangeCode(
    code: string,
    input?: IntegrationProviderCallbackInput,
  ): Promise<IntegrationProviderCallbackResult>;
  isConfigured(): boolean;
  importCatalog?(
    input: IntegrationCatalogImportContext,
  ): Promise<IntegrationCatalogProduct[]>;
  importCatalogByExternalProductId?(
    input: IntegrationCatalogSingleItemImportContext,
  ): Promise<IntegrationCatalogProduct[]>;
  refreshAccessToken?(
    connection: MarketplaceConnection,
  ): Promise<IntegrationProviderTokenRefreshResult>;
  supportsSync(): boolean;
  syncOrders(input: IntegrationSyncContext): Promise<IntegrationSyncResult>;
  verifyWebhookSignature?(input: {
    authorization: string;
    callbackUrl: string;
    rawBody: Buffer;
  }): boolean;
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
